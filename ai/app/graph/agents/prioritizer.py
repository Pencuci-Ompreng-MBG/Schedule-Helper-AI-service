# ---------------------------------------------------------------------------
# Agent 3: PrioritizerAgent
#
# PERUBAHAN UTAMA vs versi sebelumnya:
# - is_locked_time=False → auto-schedule rule-based, TIDAK trigger AI
# - is_locked_time=True  → pakai locked_start_time langsung sebagai start_time
# - ScheduleItem SELALU menyertakan is_locked_time & locked_start_time
#   (default False / None) agar Pydantic StateResponse tidak error
# - apply_hitl_edits tetap return (tasks, schedule) — 2 nilai, bukan 3
# - Re-schedule LLM HANYA untuk task baru (non-locked) jika user kirim edit
# - Semua path dijaga agar field is_locked_time & locked_start_time selalu ada
# - MENAMBAHKAN COLLISION DETECTION dengan Google Calendar
# ---------------------------------------------------------------------------

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from langchain_core.language_models import BaseChatModel
from langgraph.types import interrupt
from pydantic import BaseModel, Field, ValidationError

from app.graph.state import AppState
from app.graph.agents.helpers import ai_msg, get_raw_tasks, get_metadata
from app.graph.types import RawTask, TaskBreakdown, ScheduleItem


CategoryType = Literal["serius", "santai", "biasa", "lainnya"]
PreferredWindow = Literal["pagi", "siang", "sore", "malam", "bebas"]

WINDOW_START: dict[str, int] = {
    "pagi": 8 * 60,
    "siang": 13 * 60,
    "sore": 16 * 60,
    "malam": 19 * 60,
    "bebas": 9 * 60,
}


# ---------------------------------------------------------------------------
# Pydantic Schema untuk LLM output
# ---------------------------------------------------------------------------


class LLMTaskItem(BaseModel):
    task_id: str = Field(description="ID task, contoh: task_001")
    title: str = Field(description="Judul singkat task")
    subtasks: list[str] = Field(
        default_factory=list, description="Minimal 1 subtask konkret."
    )
    estimated_minutes: int = Field(ge=15, le=360)
    deadline: str | None = Field(default=None, description="ISO-8601 atau null.")
    category: CategoryType = Field(default="biasa")
    preferred_window: PreferredWindow = Field(default="bebas")
    urgency: int = Field(ge=1, le=5)
    importance: int = Field(ge=1, le=5)
    effort: int = Field(ge=1, le=5)
    energy_fit: int = Field(ge=1, le=5)
    priority_reasoning: str = Field(description="Alasan singkat gaya asisten ramah.")
    # Dua field baru — default False/None agar backward-compatible
    is_locked_time: bool = Field(default=False)
    locked_start_time: str | None = Field(default=None)


class LLMTaskBreakdownResponse(BaseModel):
    tasks: list[LLMTaskItem]


# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """
Kamu adalah Agent 3: Action Translator, Prioritizer, dan Scheduler Draft Builder.

Konteks:
- Input berasal dari Agent 1/router dalam bentuk raw_tasks.
- Ubah input user menjadi daftar pekerjaan yang bisa dieksekusi.
- Bahasa output mengikuti bahasa user (Indonesia santai tapi jelas).

Tugas utama:
1. Baca setiap raw_task dan buat task breakdown komprehensif.
2. KLASIFIKASI WAKTU (SANGAT PENTING):
   - ACARA TETAP (Ujian, Kelas, Meeting, Janji): Set `is_locked_time=True` dan isi `locked_start_time` dengan waktu acara. Acara ini pantang digeser.
   - DEADLINE (Tugas, PR, Laporan): Set `is_locked_time=False`, dan isi `deadline` dengan batas waktu. Sistem otomatis akan menjadwalkan pengerjaannya *sebelum* deadline.
   - FLEKSIBEL (Belajar mandiri, Nonton, dsb): Set `is_locked_time=False` dan `deadline=null`. Sistem akan mencarikan waktu luang.
3. Jangan buat task fiktif kecuali WELLNESS RULE.
4. ATURAN DEADLINE: "besok" = hari ini +1, "lusa"/"besoknya" = hari ini +2.

Scoring urgency (1-5): 5=deadline hari ini/besok, 4=minggu ini, 3=ada deadline, 2=tidak mendesak, 1=santai.
Scoring importance (1-5): 5=berdampak besar akademik/kerja, 4=penting, 3=biasa, 2=pendukung, 1=ringan.
Scoring effort (1-5): 5=sangat berat, 4=fokus tinggi, 3=sedang, 2=ringan, 1=sangat ringan.
Scoring energy_fit (1-5): 5=cocok dikerjakan segera, 4=setelah planning, 3=netral, 2=lebih cocok nanti, 1=tidak cocok.

Kategori: serius | santai | biasa | lainnya
Preferred window: pagi | siang | sore | malam | bebas
"""


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


def _safe_parse_datetime(value: Any) -> datetime:
    """Parse ISO string secara brutal agar kebal error (termasuk konversi UTC ke WIB)."""
    from datetime import datetime, timedelta  # Pastikan import ini ada

    if isinstance(value, datetime):
        return value.replace(tzinfo=None)

    # Ganti spasi dengan T untuk jaga-jaga
    val_str = str(value).strip().replace(" ", "T")

    # Deteksi apakah ini format UTC dari backend
    is_utc = val_str.endswith("Z") or "+00:00" in val_str

    # PERBAIKAN UTAMA: Ambil HANYA 19 karakter pertama (YYYY-MM-DDTHH:MM:SS)
    # Ini secara otomatis membuang milidetik (misal .000Z) yang bikin Python error!
    clean_str = val_str[:19]

    try:
        # Coba parse format lengkap YYYY-MM-DDTHH:MM:SS
        dt = datetime.strptime(clean_str, "%Y-%m-%dT%H:%M:%S")
        if is_utc:
            dt += timedelta(hours=7)
        return dt
    except Exception:
        pass

    try:
        # Coba parse format tanpa detik YYYY-MM-DDTHH:MM
        dt = datetime.strptime(clean_str[:16], "%Y-%m-%dT%H:%M")
        if is_utc:
            dt += timedelta(hours=7)
        return dt
    except Exception:
        pass

    return datetime.now()


def _deadline_sort_key(deadline: str | None) -> str:
    return deadline or "9999-12-31T23:59:59"


def _extract_auth_token(metadata: dict) -> str | None:
    for key in ("auth_token", "access_token", "authorization"):
        val = metadata.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def minutes_to_iso(total_minutes: int, base_date: str) -> str:
    hour = total_minutes // 60
    minute = total_minutes % 60
    return f"{base_date}T{hour:02d}:{minute:02d}:00"


def _format_time_display(value: str | None) -> str:
    if not value:
        return "waktu yang tersedia"
    try:
        return _safe_parse_datetime(value).strftime("%Y-%m-%d %H:%M")
    except (ValueError, TypeError):
        return str(value)


def _ensure_schedule_fields(item: dict) -> dict:
    """
    Pastikan setiap ScheduleItem punya is_locked_time & locked_start_time.
    Ini mencegah Pydantic ValidationError di StateResponse.
    """
    return {
        **item,
        "is_locked_time": bool(item.get("is_locked_time", False)),
        "locked_start_time": item.get("locked_start_time"),
    }


def _ensure_task_fields(item: dict) -> dict:
    """Pastikan setiap TaskBreakdown punya field locked."""
    return {
        **item,
        "is_locked_time": bool(item.get("is_locked_time", False)),
        "locked_start_time": item.get("locked_start_time"),
    }


# ---------------------------------------------------------------------------
# Priority calculator
# ---------------------------------------------------------------------------


def calculate_priority(
    urgency: int, importance: int, effort: int, energy_fit: int
) -> int:
    score = 0.45 * urgency + 0.30 * importance + 0.15 * (6 - effort) + 0.10 * energy_fit
    if score >= 4.0:
        return 1
    if score >= 2.7:
        return 2
    return 3


# ---------------------------------------------------------------------------
# Schedule builder  ← LOGIKA UTAMA is_locked_time & Collision Detection
# ---------------------------------------------------------------------------


def _check_collision(
    start_dt: datetime, end_dt: datetime, existing_schedules: list[dict]
) -> dict | None:
    """Mengecek apakah rentang start_dt sampai end_dt menabrak jadwal yang sudah ada."""
    for event in existing_schedules:
        ev_start_str = event.get("startTime") or event.get("start_time")

        if not ev_start_str:
            continue

        try:
            ev_start_dt = _safe_parse_datetime(ev_start_str)

            # PERBAIKAN: Hitung End Time pakai estimatedMinutes jika endTime tidak ada
            ev_end_str = event.get("endTime") or event.get("deadline")
            if ev_end_str:
                ev_end_dt = _safe_parse_datetime(ev_end_str)
            else:
                est_mins = int(
                    event.get("estimatedMinutes") or event.get("estimated_minutes") or 0
                )
                ev_end_dt = ev_start_dt + timedelta(minutes=est_mins)

            # Cek overlap: A start < B end AND A end > B start
            if start_dt < ev_end_dt and end_dt > ev_start_dt:
                return event  # Kembalikan event yang tertabrak
        except (ValueError, TypeError):
            continue
    return None


def build_proposed_schedule(
    task_breakdown: list[TaskBreakdown], existing_schedules: list[dict] = None
) -> list[ScheduleItem]:
    """
    Bangun proposed_schedule dari task_breakdown.

    Aturan is_locked_time:
    ┌─────────────────┬──────────────────────────────────────────────────────┐
    │ is_locked_time  │ Perilaku                                             │
    ├─────────────────┼──────────────────────────────────────────────────────┤
    │ False           │ Hitung slot otomatis (rule-based). TIDAK perlu AI.   │
    │ True            │ Pakai locked_start_time langsung sebagai start_time. │
    └─────────────────┴──────────────────────────────────────────────────────┘

    Semua item output DIJAMIN punya is_locked_time & locked_start_time
    agar tidak error di Pydantic StateResponse.
    """
    if existing_schedules is None:
        existing_schedules = []

    proposed_schedule: list[ScheduleItem] = []
    current_date = datetime.now().strftime("%Y-%m-%d")
    current_time = 9 * 60  # mulai jam 09:00

    for item in task_breakdown:
        task_id = str(item.get("task_id", ""))
        is_locked = bool(item.get("is_locked_time", False))
        locked_start = item.get("locked_start_time")
        estimated = int(item.get("estimated_minutes", 60))
        start_time_iso: str
        collision_warning = ""

        # ── CASE 1: Waktu dikunci user ────────────────────────────────────
        if is_locked and locked_start:
            try:
                locked_dt = _safe_parse_datetime(locked_start)
                start_time_iso = locked_dt.strftime("%Y-%m-%dT%H:%M:%S")
                locked_date = locked_dt.strftime("%Y-%m-%d")
                locked_mins = locked_dt.hour * 60 + locked_dt.minute
                end_mins = locked_mins + estimated + 10

                # Cek bentrok untuk locked task
                end_dt = locked_dt + timedelta(minutes=estimated)
                collision = _check_collision(locked_dt, end_dt, existing_schedules)
                if collision:
                    ev_title = collision.get("title", "Acara lain")
                    collision_warning = f" ⚠️ [PERINGATAN: Jadwal yang kamu kunci menabrak '{ev_title}' di kalendermu!]"

                if locked_date != current_date:
                    current_date = locked_date
                # Pointer mundur hanya jika locked task berakhir setelah current_time
                current_time = max(current_time, end_mins)
            except (ValueError, TypeError):
                # locked_start_time tidak valid → fallback ke auto
                is_locked = False

        # ── CASE 2: Auto-schedule (tidak perlu AI) ────────────────────────
        if not is_locked:
            preferred = str(item.get("preferred_window", "bebas"))
            preferred_start = WINDOW_START.get(preferred, 9 * 60)
            deadline = item.get("deadline")
            deadline_dt: datetime | None = None

            if deadline:
                try:
                    deadline_dt = _safe_parse_datetime(deadline)
                except (ValueError, TypeError):
                    pass

            if deadline_dt:
                base_date = deadline_dt.strftime("%Y-%m-%d")
                dl_mins = deadline_dt.hour * 60 + deadline_dt.minute

                if base_date != current_date:
                    current_date = base_date
                    current_time = preferred_start

                is_eod = deadline_dt.hour == 23 and deadline_dt.minute >= 55
                if is_eod:
                    start_mins = max(current_time, preferred_start)
                else:
                    start_mins = max(
                        current_time, dl_mins - estimated - 30, preferred_start
                    )  # Beri jarak aman sblm deadline
            else:
                base_date = current_date
                start_mins = max(current_time, preferred_start)

            # --- Mekanisme Resolusi Bentrok Otomatis yang Lebih Cerdas ---
            # Gunakan datetime murni agar perpindahan hari (lewat tengah malam) aman
            current_slot_dt = _safe_parse_datetime(
                minutes_to_iso(start_mins, base_date)
            )
            max_attempts = 30  # Coba lompat hingga menemukan slot kosong yang valid

            for _ in range(max_attempts):
                temp_end_dt = current_slot_dt + timedelta(minutes=estimated)
                collision = _check_collision(
                    current_slot_dt, temp_end_dt, existing_schedules
                )

                if not collision:
                    break  # Aman, slot ini kosong!

                # Jika nabrak, lompat langsung ke waktu SELESAI dari jadwal yang nabrak tersebut
                try:
                    ev_end_str = collision.get("endTime") or collision.get("deadline")
                    if ev_end_str:
                        ev_end_dt = _safe_parse_datetime(ev_end_str)
                    else:
                        ev_start_dt = _safe_parse_datetime(
                            collision.get("startTime") or collision.get("start_time")
                        )
                        ev_est = int(
                            collision.get("estimatedMinutes")
                            or collision.get("estimated_minutes")
                            or 60
                        )
                        ev_end_dt = ev_start_dt + timedelta(minutes=ev_est)

                    # Lompat ke jam acara tsb selesai + buffer 10 menit
                    current_slot_dt = max(
                        current_slot_dt + timedelta(minutes=10),
                        ev_end_dt + timedelta(minutes=10),
                    )
                except (ValueError, TypeError):
                    # Fallback geser 15 menit jika parsing error
                    current_slot_dt += timedelta(minutes=15)

            # Setelah loop selesai, pastikan semua variabel sinkron untuk iterasi task berikutnya
            start_time_iso = current_slot_dt.strftime("%Y-%m-%dT%H:%M:%S")
            current_date = current_slot_dt.strftime("%Y-%m-%d")
            # Update current_time berdasarkan total jam:menit
            current_time = (
                current_slot_dt.hour * 60 + current_slot_dt.minute + estimated + 10
            )

            # Cek evaluasi bentrok final (jika sudah max_attempts tapi masih nabrak)
            final_end_dt = current_slot_dt + timedelta(minutes=estimated)
            final_collision = _check_collision(
                current_slot_dt, final_end_dt, existing_schedules
            )

            if final_collision:
                ev_title = final_collision.get("title", "Jadwal lain")
                collision_warning = f" ⚠️ [Jadwal ini berpotensi nabrak dengan '{ev_title}' di kalendermu. Mohon dicek.]"
            elif minutes_to_iso(start_mins, base_date) != start_time_iso:
                collision_warning = " 🔄 [Jadwal ini aku sesuaikan jamnya supaya nggak bentrok sama agendamu yang lain.]"

        # Gabungkan warning bentrokan ke dalam priority_reasoning
        original_reasoning = item.get("priority_reasoning", "")
        new_reasoning = f"{original_reasoning}{collision_warning}"

        item["priority_reasoning"] = new_reasoning

        # Pastikan output SELALU punya kedua field locked (cegah Pydantic error)
        proposed_schedule.append(
            _ensure_schedule_fields(
                {
                    "task_id": task_id,
                    "task": item.get("title", ""),
                    "priority": int(item.get("priority", 2)),
                    "start_time": start_time_iso,
                    "duration_minutes": estimated,
                    "category": item.get("category", "biasa"),
                    "subtasks": list(item.get("subtasks", [])),
                    "is_locked_time": is_locked
                    or bool(item.get("is_locked_time", False)),
                    "locked_start_time": item.get("locked_start_time"),
                }
            )
        )

    return proposed_schedule


# ---------------------------------------------------------------------------
# HITL edit handler
# ---------------------------------------------------------------------------


def apply_hitl_edits(
    hitl_result: dict,
    task_breakdown: list[TaskBreakdown],
    proposed_schedule: list[ScheduleItem],
    existing_schedules: list[dict] = None,
) -> tuple[list[TaskBreakdown], list[ScheduleItem]]:
    """
    Proses editan user dari HITL:
    - is_locked_time=False → auto-rebuild schedule & cari slot kosong.
    - is_locked_time=True  → pakai locked_start_time sebagai start_time langsung.

    Return: (final_tasks, final_schedule)
    """
    data = hitl_result.get("approved_data") or hitl_result
    edited_tasks_raw: list[dict] = data.get("tasks") or []
    edited_schedule_raw: list[dict] = data.get("proposed_schedule") or []

    # Tidak ada editan → kembalikan state lama
    if not edited_tasks_raw:
        safe_tasks = [_ensure_task_fields(t) for t in task_breakdown]
        safe_schedule = [_ensure_schedule_fields(s) for s in proposed_schedule]
        return safe_tasks, safe_schedule

    # Lookup state lama
    old_task_map: dict[str, TaskBreakdown] = {
        str(t.get("task_id")): t for t in task_breakdown if isinstance(t, dict)
    }

    final_tasks: list[TaskBreakdown] = []

    for edited in edited_tasks_raw:
        task_id = str(edited.get("task_id", ""))
        old = old_task_map.get(task_id, {})

        # Merge: nilai dari user lebih prioritas
        merged: TaskBreakdown = _ensure_task_fields(
            {
                "task_id": edited.get("task_id") or old.get("task_id", task_id),
                "title": edited.get("title") or old.get("title", ""),
                "subtasks": edited.get("subtasks") or old.get("subtasks", []),
                "estimated_minutes": int(edited["estimated_minutes"])
                if "estimated_minutes" in edited
                else int(old.get("estimated_minutes", 60)),
                "deadline": edited.get("deadline") or old.get("deadline"),
                "priority": int(edited["priority"])
                if "priority" in edited
                else int(old.get("priority", 2)),
                "category": edited.get("category") or old.get("category", "biasa"),
                "preferred_window": edited.get("preferred_window")
                or old.get("preferred_window", "bebas"),
                "priority_reasoning": edited.get("priority_reasoning")
                or old.get("priority_reasoning", ""),
                "is_locked_time": bool(
                    edited.get("is_locked_time", old.get("is_locked_time", False))
                ),
                "locked_start_time": edited.get("locked_start_time")
                or old.get("locked_start_time"),
            }
        )
        final_tasks.append(merged)

    # RE-GENERATE SCHEDULE LOGIC
    if edited_schedule_raw:
        # Jika UI mengirim proposed_schedule, ambil URUTAN task-nya saja
        ordered_task_ids = [str(s.get("task_id", "")) for s in edited_schedule_raw]
        
        def get_order(t):
            tid = str(t.get("task_id", ""))
            return ordered_task_ids.index(tid) if tid in ordered_task_ids else 9999

        # Urutkan berdasarkan urutan dari UI
        final_tasks.sort(key=get_order)
    else:
        # Jika tidak ada urutan dari UI, urutkan berdasarkan prioritas default
        final_tasks.sort(
            key=lambda x: (
                x["priority"],
                _deadline_sort_key(x.get("deadline")),
                -int(x.get("estimated_minutes", 0)),
                str(x.get("task_id", "")),
            )
        )

    # Bikin ulang jadwal secara KESELURUHAN agar task yang False langsung dicarikan slot baru
    final_schedule = build_proposed_schedule(final_tasks, existing_schedules)

    return final_tasks, final_schedule

def _apply_locked_times_to_schedule(
    schedule: list[dict],
    tasks: list[TaskBreakdown],
) -> list[ScheduleItem]:
    """
    Untuk task yang is_locked_time=True, paksa start_time = locked_start_time.
    Task lain dibiarkan apa adanya (tidak perlu AI).
    """
    task_map = {str(t["task_id"]): t for t in tasks}
    result: list[ScheduleItem] = []

    for item in schedule:
        task_id = str(item.get("task_id", ""))
        task_detail = task_map.get(task_id, {})
        is_locked = bool(task_detail.get("is_locked_time", False))
        locked_start = task_detail.get("locked_start_time")

        if is_locked and locked_start:
            item = {**item, "start_time": locked_start}

        result.append(
            _ensure_schedule_fields(
                {
                    **item,
                    "is_locked_time": is_locked,
                    "locked_start_time": locked_start,
                }
            )
        )

    return result


# ---------------------------------------------------------------------------
# Review message builder
# ---------------------------------------------------------------------------


def build_review_reasoning_message(
    task_breakdown: list[TaskBreakdown],
    proposed_schedule: list[ScheduleItem],
) -> str:
    if not proposed_schedule:
        return (
            "Cek dulu daftar tugas dan draft jadwal ini. "
            "Jadwal belum terbentuk karena proposed_schedule masih kosong. "
            "Kamu bisa approve, edit, tambah, atau hapus sebelum dijadwalkan."
        )

    task_map = {str(t.get("task_id")): t for t in task_breakdown if isinstance(t, dict)}
    lines: list[str] = []

    for idx, schedule in enumerate(proposed_schedule, start=1):
        task_id = str(schedule.get("task_id", ""))
        task_detail = task_map.get(task_id, {})
        title = schedule.get("task") or task_detail.get("title") or f"Tugas {idx}"
        start_time = _format_time_display(schedule.get("start_time"))
        duration = (
            schedule.get("duration_minutes")
            or task_detail.get("estimated_minutes")
            or "-"
        )
        lock_label = " 🔒" if task_detail.get("is_locked_time") else ""
        reason = (
            task_detail.get("priority_reasoning")
            or "aku taruh di slot luang ini supaya alur kerjamu tetap enak."
        )
        lines.append(
            f"{idx}. **{title}**{lock_label} ({start_time} | {duration} menit): {reason}"
        )

    return (
        "Cek dulu draft jadwal yang udah aku susun ini ya.\n\n"
        "Ini alasan kenapa aku nyusun urutannya kayak gini:\n"
        + "\n".join(lines)
        + "\n\nKalau dirasa kurang pas, kamu bisa edit langsung parameternya di sebelah kiri. "
        "Kalau udah oke, tinggal klik Approve!"
    )


# ---------------------------------------------------------------------------
# LLM-based task breakdown builder
# ---------------------------------------------------------------------------


def build_task_breakdown_with_llm(
    raw_tasks: list[RawTask],
    structured_llm: Any,
    schedule_context: str = "",
    intent: str = "manage_task",
    skip_task_ids: set[str] | None = None,
) -> list[TaskBreakdown]:
    """
    Kirim raw_tasks ke LLM untuk di-breakdown.

    skip_task_ids: task_id yang sudah di-lock user → TIDAK dikirim ke LLM,
    dipertahankan apa adanya dari state yang sudah ada.
    """
    skip_task_ids = skip_task_ids or set()

    tasks_for_llm = [
        t for t in raw_tasks if _get_task_id_from_raw(t) not in skip_task_ids
    ]

    if not tasks_for_llm:
        print("[Agent 3] Semua task di-skip ke LLM (sudah locked).")
        return []

    normalized = [_raw_task_to_dict(t, idx) for idx, t in enumerate(tasks_for_llm, 1)]
    today = datetime.now().strftime("%Y-%m-%d")

    prompt = (
        f"Tanggal hari ini: {today}\n\n"
        f"Kondisi Mental/Intent User: {intent}\n\n"
        + (
            f"Konteks jadwal existing:\n{schedule_context}\n\n"
            if schedule_context
            else ""
        )
        + "Ubah raw_tasks berikut menjadi task breakdown terstruktur:\n"
        + str(normalized)
    )

    result = structured_llm.invoke(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    if hasattr(result, "model_dump"):
        result = result.model_dump()

    if not isinstance(result, dict):
        raise ValueError("Output LLM bukan dict.")

    tasks_raw = result.get("tasks")
    if not isinstance(tasks_raw, list) or not tasks_raw:
        raise ValueError("Output LLM tidak memiliki tasks.")

    breakdown: list[TaskBreakdown] = []

    for idx, item in enumerate(tasks_raw, 1):
        try:
            parsed = LLMTaskItem.model_validate(item)
        except ValidationError as err:
            raise ValueError(f"Format task dari LLM tidak valid: {err}") from err

        priority = calculate_priority(
            urgency=parsed.urgency,
            importance=parsed.importance,
            effort=parsed.effort,
            energy_fit=parsed.energy_fit,
        )
        subtasks = [s.strip() for s in parsed.subtasks if str(s).strip()] or [
            parsed.title
        ]

        breakdown.append(
            _ensure_task_fields(
                {
                    "task_id": parsed.task_id or f"task_{idx:03d}",
                    "title": parsed.title,
                    "subtasks": subtasks,
                    "estimated_minutes": int(parsed.estimated_minutes),
                    "deadline": parsed.deadline,
                    "priority": priority,
                    "category": parsed.category,
                    "preferred_window": parsed.preferred_window,
                    "priority_reasoning": parsed.priority_reasoning,
                    "is_locked_time": parsed.is_locked_time,
                    "locked_start_time": parsed.locked_start_time,
                }
            )
        )

    breakdown.sort(
        key=lambda x: (
            x["priority"],
            _deadline_sort_key(x.get("deadline")),
            -int(x.get("estimated_minutes", 0)),
            str(x.get("task_id", "")),
        )
    )

    return breakdown


# ---------------------------------------------------------------------------
# Main agent factory
# ---------------------------------------------------------------------------


def make_prioritizer(llm: BaseChatModel, calendar_client=None):
    structured_llm = llm.with_structured_output(LLMTaskBreakdownResponse)

    def run(state: AppState) -> dict:
        previous_status = state.get("hitl_status")
        existing_tasks: list[TaskBreakdown] = state.get("task_breakdown") or []
        existing_schedule: list[ScheduleItem] = state.get("proposed_schedule") or []
        current_intent = state.get("current_intent", "manage_task")

        # Ambil raw schedule untuk collision detection
        raw_existing_schedules = _fetch_raw_schedules(calendar_client, state)

        # ── Jika user reject sebelumnya, pakai task yang sudah ada ──────────
        if previous_status == "rejected" and existing_tasks:
            # Pastikan semua field ada (data lama mungkin belum punya locked fields)
            task_breakdown = [_ensure_task_fields(t) for t in existing_tasks]
            proposed_schedule = (
                [_ensure_schedule_fields(s) for s in existing_schedule]
                if existing_schedule
                else build_proposed_schedule(task_breakdown, raw_existing_schedules)
            )

        # ── First run: proses raw_tasks via LLM ─────────────────────────────
        else:
            raw_tasks = get_raw_tasks(state)

            if not raw_tasks:
                return {
                    **ai_msg("Aku belum menemukan tugas yang bisa diprioritaskan."),
                    "task_breakdown": [],
                    "proposed_schedule": [],
                    "error_message": "raw_tasks kosong.",
                }

            schedule_context = _format_schedule_context(raw_existing_schedules)

            try:
                task_breakdown = build_task_breakdown_with_llm(
                    raw_tasks=raw_tasks,
                    structured_llm=structured_llm,
                    schedule_context=schedule_context,
                    intent=current_intent,
                )
                print("[Agent 3] LLM prioritizer berhasil dipakai.")
            except Exception as err:
                print(
                    f"[Agent 3] LLM gagal, fallback rule-based: {type(err).__name__}: {err}"
                )
                task_breakdown = build_task_breakdown_rule_based(raw_tasks)

            proposed_schedule = build_proposed_schedule(
                task_breakdown, raw_existing_schedules
            )

        # ── Validasi akhir sebelum interrupt: pastikan semua field ada ───────
        task_breakdown = [_ensure_task_fields(t) for t in task_breakdown]
        proposed_schedule = [_ensure_schedule_fields(s) for s in proposed_schedule]

        # ── HITL Interrupt ───────────────────────────────────────────────────
        hitl_result: dict = (
            interrupt(
                {
                    "type": "task_review",
                    "message": build_review_reasoning_message(
                        task_breakdown, proposed_schedule
                    ),
                    "tasks": task_breakdown,
                    "proposed_schedule": proposed_schedule,
                }
            )
            or {}
        )

        # ── Parse approval ───────────────────────────────────────────────────
        approved_val = hitl_result.get("approved") or hitl_result.get("approved_data")
        if isinstance(approved_val, dict):
            approved = bool(
                approved_val.get("approved", approved_val.get("approved_data"))
            )
        else:
            approved = bool(approved_val)

        # ── Apply editan user (is_locked logic di dalam) ─────────────────────
        final_tasks, final_schedule = apply_hitl_edits(
            hitl_result=hitl_result,
            task_breakdown=task_breakdown,
            proposed_schedule=proposed_schedule,
            existing_schedules=raw_existing_schedules,
        )

        # ── Jika ada task locked BARU, re-schedule task non-locked via LLM ──
        # (hanya jika user reject, bukan approve)

        if not approved:
            return {
                **ai_msg(
                    "Baik, draftnya aku sesuaikan ya. Silakan cek lagi perubahannya."
                ),
                "task_breakdown": [_ensure_task_fields(t) for t in final_tasks],
                "proposed_schedule": [
                    _ensure_schedule_fields(s) for s in final_schedule
                ],
                "error_message": None,
                "hitl_status": "rejected",
                "hitl_input": hitl_result,
            }

        return {
            **ai_msg(
                f"Siap, {len(final_tasks)} tugas sudah disetujui dan akan aku jadwalkan sekarang."
            ),
            "task_breakdown": [_ensure_task_fields(t) for t in final_tasks],
            "proposed_schedule": [_ensure_schedule_fields(s) for s in final_schedule],
            "error_message": None,
            "hitl_status": "approved",
            "hitl_input": hitl_result,
        }

    return run


# ---------------------------------------------------------------------------
# Rule-based fallback (dipakai saat LLM gagal)
# ---------------------------------------------------------------------------


def _raw_task_to_dict(task: Any, idx: int) -> dict:
    if hasattr(task, "model_dump"):
        data = task.model_dump()
    elif isinstance(task, dict):
        data = dict(task)
    else:
        data = {}
    return {
        "task_id": data.get("task_id") or f"task_{idx:03d}",
        "title": data.get("title") or "",
        "description": data.get("description") or "",
        "raw_time": data.get("raw_time"),
        "raw_input": data.get("raw_input") or data.get("title") or "",
        "category": data.get("category") or "biasa",
    }


def _get_task_id_from_raw(task: Any) -> str:
    if hasattr(task, "task_id"):
        return str(task.task_id)
    if isinstance(task, dict):
        return str(task.get("task_id", ""))
    return ""


def _source_text(task: Any, idx: int = 1) -> str:
    data = _raw_task_to_dict(task, idx)
    return (
        data.get("raw_input") or data.get("description") or data.get("title") or ""
    ).strip()


def _normalize_text(text: str) -> str:
    return " ".join(str(text).strip().split())


def _detect_preferred_window(text: str) -> PreferredWindow:
    t = text.lower()
    if "pagi" in t:
        return "pagi"
    if "siang" in t:
        return "siang"
    if "sore" in t:
        return "sore"
    if "malam" in t:
        return "malam"
    return "bebas"


def _detect_category(text: str) -> CategoryType:
    t = text.lower()
    if any(
        k in t
        for k in [
            "kuliah",
            "kelas",
            "materi",
            "belajar",
            "project",
            "proyek",
            "laporan",
            "proposal",
            "ujian",
        ]
    ):
        return "serius"
    if any(k in t for k in ["istirahat", "break", "main game", "main", "rebahan"]):
        return "santai"
    if any(k in t for k in ["meeting", "organisasi", "rapat"]):
        return "lainnya"
    return "biasa"


def _estimate_duration(text: str) -> int:
    t = text.lower()
    if any(k in t for k in ["laporan", "proposal", "skripsi", "makalah"]):
        return 120
    if any(k in t for k in ["project", "proyek", "capstone"]):
        return 120
    if any(k in t for k in ["demo", "presentasi"]):
        return 90
    if any(k in t for k in ["ui", "dashboard", "fitur", "integrasi"]):
        return 120
    if any(k in t for k in ["bug", "error", "fix", "hotfix"]):
        return 60
    if any(k in t for k in ["meeting", "rapat"]):
        return 60
    if any(k in t for k in ["dokumentasi", "langgraph", "belajar", "ngulik"]):
        return 60
    return 60


def _estimate_priority(text: str) -> int:
    t = text.lower()
    score = 0
    if any(
        k in t for k in ["deadline", "besok", "hari ini", "urgent", "segera", "mepet"]
    ):
        score += 4
    if "minggu ini" in t:
        score += 3
    if any(k in t for k in ["demo", "presentasi", "ujian"]):
        score += 4
    if any(k in t for k in ["bug", "error", "fix", "hotfix"]):
        score += 3
    if any(k in t for k in ["laporan", "proposal", "revisi", "project", "proyek"]):
        score += 3
    if any(k in t for k in ["meeting", "rapat"]):
        score += 2
    if any(k in t for k in ["ngulik", "belajar", "dokumentasi", "langgraph"]):
        score += 1
    if "minor" in t:
        score -= 1
    if score >= 6:
        return 1
    if score >= 3:
        return 2
    return 3


def _extract_deadline(text: str) -> str | None:
    t = text.lower()
    now = datetime.now()
    if "hari ini" in t:
        return now.replace(hour=23, minute=59, second=0, microsecond=0).isoformat()
    if "lusa" in t or "besoknya" in t:
        return (
            (now + timedelta(days=2))
            .replace(hour=23, minute=59, second=0, microsecond=0)
            .isoformat()
        )
    if "besok" in t:
        return (
            (now + timedelta(days=1))
            .replace(hour=23, minute=59, second=0, microsecond=0)
            .isoformat()
        )
    if "minggu ini" in t:
        return (
            (now + timedelta(days=7))
            .replace(hour=23, minute=59, second=0, microsecond=0)
            .isoformat()
        )
    return None


def _build_basic_subtasks(text: str) -> list[str]:
    t = text.strip().lower()
    if any(k in t for k in ["meeting", "rapat", "ketemu", "janji", "kelas", "kuliah"]):
        return [text.strip()]
    if any(k in t for k in ["belum jelas", "ga jelas", "tidak jelas", "bingung"]):
        return [
            "Klarifikasi detail tugas yang belum jelas",
            "Tentukan bagian yang paling mendesak",
            "Kerjakan bagian pertama yang paling mudah dimulai",
        ]
    return [
        f"Mulai kerjakan: {text.strip()}",
        "Lanjutkan bagian utama yang paling penting",
        "Cek hasil dan rapikan sebelum selesai",
    ]


def build_task_breakdown_rule_based(raw_tasks: list[RawTask]) -> list[TaskBreakdown]:
    breakdown: list[TaskBreakdown] = []
    for idx, raw in enumerate(raw_tasks, 1):
        data = _raw_task_to_dict(raw, idx)
        cleaned = _normalize_text(_source_text(raw, idx))
        task_id = data.get("task_id") or f"task_{idx:03d}"
        title = data.get("title") or cleaned or f"Tugas {idx}"
        if not cleaned:
            cleaned = title

        breakdown.append(
            _ensure_task_fields(
                {
                    "task_id": task_id,
                    "title": title,
                    "subtasks": _build_basic_subtasks(cleaned),
                    "estimated_minutes": _estimate_duration(cleaned),
                    "deadline": _extract_deadline(cleaned),
                    "priority": _estimate_priority(cleaned),
                    "category": _detect_category(cleaned),
                    "preferred_window": _detect_preferred_window(cleaned),
                    "priority_reasoning": "Sistem mengatur jadwal ini berdasarkan pola waktu yang ditemukan.",
                    "is_locked_time": False,
                    "locked_start_time": None,
                }
            )
        )

    breakdown.sort(
        key=lambda x: (
            x["priority"],
            _deadline_sort_key(x.get("deadline")),
            -int(x.get("estimated_minutes", 0)),
            str(x.get("task_id", "")),
        )
    )
    return breakdown


# ---------------------------------------------------------------------------
# Calendar context helper
# ---------------------------------------------------------------------------


def _fetch_raw_schedules(calendar_client: Any, state: AppState) -> list[dict]:
    if calendar_client is None:
        return []
    try:
        metadata = get_metadata(state) or {}
        hitl_input = state.get("hitl_input") or {}

        user_cookies = _extract_cookies(metadata) or _extract_cookies(hitl_input)

        raw_schedules = calendar_client.list_schedules(
            cookies=user_cookies,
        )

        simplified_schedules = []
        for item in raw_schedules:
            simplified_schedules.append(
                {
                    "title": item.get("title", "(tanpa judul)"),
                    "startTime": item.get("startTime"),  # Waktu mulai dari BE
                    "estimatedMinutes": item.get("estimatedMinutes"),
                }
            )
        print("SIMPLIFIED_SCHEDULES", simplified_schedules, flush=True)
        return simplified_schedules
    except Exception as err:
        print(f"[Agent 3] Raw calendar context error: {err}")
        return []


def _extract_cookies(source_dict: dict) -> dict | None:
    """
    Mengekstrak dictionary cookies secara aman dari state/metadata.
    """
    cookies = source_dict.get("cookies")
    if isinstance(cookies, dict) and cookies:
        return cookies
    return None


def _format_schedule_context(schedules: list[dict]) -> str:
    if not schedules:
        return "(tidak ada jadwal)"

    lines: list[str] = []
    for item in schedules[:5]:
        title = str(item.get("title") or "(tanpa judul)")
        start_str = item.get("startTime") or item.get("start_time")

        # PERBAIKAN: Hitung end time string untuk ditampilkan ke LLM
        end_str = item.get("endTime") or item.get("deadline")
        if not end_str and start_str:
            try:
                start_dt = _safe_parse_datetime(start_str)
                est_mins = int(
                    item.get("estimatedMinutes") or item.get("estimated_minutes") or 0
                )
                end_str = (start_dt + timedelta(minutes=est_mins)).isoformat()
            except (ValueError, TypeError):
                pass

        status = item.get("status", "pending")
        bits = []
        if start_str:
            bits.append(f"mulai: {start_str}")
        if end_str:
            bits.append(f"selesai: {end_str}")
        time_part = f" ({', '.join(bits)})" if bits else ""
        lines.append(f"- {title} [{status}]{time_part}")

    return "\n".join(lines)
