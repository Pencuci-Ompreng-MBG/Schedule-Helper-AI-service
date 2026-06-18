from __future__ import annotations

from uuid import uuid4
from typing import Optional
from pydantic import BaseModel, Field

from langgraph.types import interrupt as _langgraph_interrupt

from app.graph.state import AppState
from app.graph.agents.helpers import (
    last_message,
    ai_msg,
    get_hitl_input,
    get_raw_tasks,
    get_metadata,
)
from app.graph.types import CategoryType

# =============================================================================
# Agent 2: CounselorAgent
# =============================================================================

MAX_LOOPS = 12
MAX_REVIEW = 3
DEBUG = True


def _log(label: str, data=None):
    if DEBUG:
        print(f"\n[COUNSELOR] {label}")
        if data is not None:
            print(data)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────


class DiscoveredTask(BaseModel):
    title: str = Field(description="Nama task singkat dan jelas.")
    raw_time: str | None = Field(default=None)
    raw_input: str = Field(description="Kalimat asli user untuk task ini.")
    category: CategoryType = Field(default="biasa")


class DiscoveryOutput(BaseModel):
    tasks: list[DiscoveredTask]


class TaskDetailParsed(BaseModel):
    parsed_description: str | None = Field(
        default=None,
        description=(
            "Deskripsi yang SUDAH DIGABUNGKAN dan DITULIS ULANG secara padu antara info lama dan baru. "
            "Gunakan sudut pandang orang ketiga."
        ),
    )
    parsed_raw_time: str | None = Field(default=None)
    deadline_confirmed_none: bool = Field(default=False)


class ReviewEnrichItem(BaseModel):
    task_id: str
    updated_description: str | None = Field(
        default=None,
        description=(
            "Deskripsi yang SUDAH DIGABUNGKAN dan DITULIS ULANG secara padu antara info lama dan baru. "
            "Gunakan sudut pandang orang ketiga. Null jika tidak ada info baru untuk task ini."
        ),
    )
    updated_raw_time: str | None = Field(default=None)


class ReviewEnrichOutput(BaseModel):
    updates: list[ReviewEnrichItem]


# ── System Prompts ────────────────────────────────────────────────────────────

DISCOVERY_SYSTEM = """Ekstrak setiap task yang disebutkan user menjadi item terpisah.
Aturan:
- Satu task = satu item
- Gunakan bahasa persis user untuk title
- KONTEKS PENTING: Jika user merespons dengan kata ganti (misal: "yang kamu bilang", "yang itu"), bacalah 'Pesan AI Sebelumnya' untuk mengetahui apa tugas yang dimaksud.
- Jangan gabungkan task berbeda
- WAJIB tentukan "category" dengan panduan berikut:
  * "serius" : Berhubungan dengan tugas, PR, ujian, kuliah, project, laporan, atau pekerjaan.
  * "santai" : Berhubungan dengan istirahat, hiburan, main, rebahan, liburan, atau relaksasi.
  * "lainnya": Berhubungan dengan meeting, rapat, organisasi, atau kepanitiaan.
  * "biasa"  : Aktivitas harian lainnya yang tidak masuk kategori di atas."""

DETAIL_PARSE_SYSTEM = """Kamu bertugas memperbarui detail informasi dari sebuah tugas berdasarkan jawaban terbaru user.

Pisahkan:
1. Deskripsi: output/hasil tugas + perasaan user + catatan apapun (masukkan info deadline secara natural ke dalam teks deskripsi ini jika ada).
2. Deadline (SANGAT PENTING): JANGAN gunakan frasa waktu mentah. KONVERSI ucapan user ke format jam digital 24-jam (HH:MM) dan WAJIB SERTAKAN konteks/tujuan waktunya di dalam tanda kurung.
   - Contoh: "harus kelar sebelum jam kerja selesai (jam 5)" -> "jam 17:00 (harus kelar sebelum)".
   - Contoh: "meetingnya nanti mulai jam 1 siang" -> "jam 13:00 (mulai meeting)".
   - Contoh: "jam set 7" -> "18:30 (waktu pelaksanaan)".
3. Konfirmasi tidak ada deadline.

Aturan Deskripsi (SANGAT PENTING):
- Tulis ulang dalam sudut pandang orang ketiga (contoh: "Pengguna merasa...", "Tugas ini adalah...").
- GABUNGKAN konteks "Deskripsi Lama" dengan "Jawaban Baru" menjadi paragraf yang padu dan enak dibaca.
- KONTEKS PERCAKAPAN: Perhatikan 'Pertanyaan AI Sebelumnya'. Jika user merespons dengan kata ganti (misal: "yang itu", "yang kamu sebutin", "betul"), simpulkan maksud user berdasarkan ide/contoh yang ditawarkan di Pertanyaan AI Sebelumnya!
- KOREKSI KONTRADIKSI: Jika di "Deskripsi Lama" tertulis "belum ada informasi deadline", namun "Jawaban Baru" SUDAH memberitahunya, maka HAPUS kalimat "belum ada informasi" tersebut.
- SEBUTKAN DEADLINE DI DESKRIPSI: Jika user memberikan deadline, tuliskan juga secara natural di dalam kalimat deskripsi.
- JANGAN sekadar menempelkan kata-kata mentah user di belakang kalimat lama. Rangkai bahasanya secara mulus.
- Jangan hilangkan emosi/rasa stress dari deskripsi lama jika tidak bertentangan.
- deadline_confirmed_none=True HANYA jika user eksplisit bilang tidak ada deadline."""

REVIEW_SYSTEM = """Kamu adalah teman yang hangat dan supportif, membantu user yang lagi overwhelmed dengan kegiatannya.

Gunakan bahasa PERSIS sama dengan user — santai dan gaul kalau user santai, lebih formal kalau user formal.

Output harus berisi DUA bagian dipisah dengan |||:

BAGIAN 1 — Ringkasan yang meyakinkan:
- Buka dengan kalimat yang menegaskan bahwa kamu SUDAH berhasil mencatat semuanya.
- Lanjutkan dengan bullet ringkasan per item.
- Nada: meyakinkan, seperti teman yang bilang "tenang, aku udah pegang semuanya"
- Maksimal 6 kalimat

BAGIAN 2 — Penawaran untuk tambah cerita (BUKAN pertanyaan langsung):
- WAJIB sebut SEMUA task yang ada di daftar.
- Sebutkan beberapa contoh hal yang bisa ditambahin: perasaan user terhadap masing-masing task, seberapa sulit / mudah.
- Tutup dengan kalimat yang membebaskan user kalau mau langsung approve.
- Maksimal 3 kalimat

Format output PERSIS: [ringkasan]|||[penawaran]"""

FEEDBACK_SYSTEM = """Kamu adalah teman yang supportif merespons cerita tambahan dari user.
User baru saja mengirim info tambahan. BACA DULU konteksnya — respons harus sesuai dengan JENIS info yang dikirim.
 
ATURAN KERAS:
- Acknowledge updatenya atau validasi emosinya jika ada.
- DILARANG: saran cara mengerjakan tugas, urutan pengerjaan, prioritas.
- Maksimal 2 kalimat, singkat dan genuine.
Output hanya kalimat respons saja, tanpa label atau teks tambahan."""

REVIEW_ENRICH_SYSTEM = """Update deskripsi task dari cerita tambahan user.
    
Aturan Deskripsi (SANGAT PENTING):
1. Tulis ulang dalam sudut pandang orang ketiga (contoh: "Pengguna merasa...").
2. GABUNGKAN info lama dengan info baru menjadi paragraf yang padu.
3. KONTEKS PERCAKAPAN: Selalu baca 'Pesan AI Sebelumnya' agar paham konteks ucapan user jika mereka memakai kata ganti ("yang pertama", "yang kamu sebut", dll).
4. KOREKSI KONTRADIKSI: Jika info baru menjawab hal yang sebelumnya "belum jelas/tidak ada deadline", HAPUS pernyataan "belum jelas/belum ada" tersebut dari deskripsi.
5. JANGAN hanya menempelkan kalimat mentah user di akhir.
6. Jangan hapus deskripsi lama yang valid (emosi, konteks awal).
7. Hanya update task yang relevan dengan cerita user.
8. FORMAT WAKTU: Jika user merevisi jadwal, konversikan selalu ke format 24-jam (HH:MM) dan sertakan konteksnya di dalam tanda kurung pada updated_raw_time (contoh: "jam 17:00 (harus kelar sebelum)")."""

DISCOVERY_CHAT_SYSTEM = """Kamu adalah teman yang hangat dan supportif.
User sedang merasa pusing/overwhelmed/stress karena kewajiban yang menumpuk, TAPI mereka belum menyebutkan secara spesifik apa saja kegiatannya.

TUGAS UTAMA:
1. Validasi perasaannya dengan empati (jangan menggurui).
2. PANCING/MINTA user untuk me-list atau menyebutkan apa saja kegiatan/tugas yang bikin numpuk itu.
3. Berikan contoh ringan di dalam tanda kurung untuk memancingnya.
4. Gunakan bahasa/tone yang PERSIS senada dengan ucapan user.
Batas: Maksimal 3 kalimat."""

DETAIL_CHAT_SYSTEM = """Kamu adalah teman yang hangat dan supportif.
Kita sedang membantu user mengurai tugas-tugasnya satu per satu dari daftarnya.

TUGAS UTAMA:
1. Acknowledge/sebutkan nama tugas yang sedang ditanyakan ke user saat ini.
2. PERHATIKAN informasi waktu/deadline dari tugas ini:
   - Jika Waktu/Deadline SUDAH ADA, JANGAN tanyakan lagi kapan deadlinenya! Cukup sebutkan/konfirmasi waktunya dengan AKURAT sesuai referensi 'Waktu/Deadline yang sudah diketahui' (PENTING: JANGAN pernah membulatkan waktu. Jika tertulis 07:30 atau setengah 8, sebutkan setengah 8, BUKAN jam 8), lalu tanyakan APA detail/materi yang harus dikerjakan.
   - Jika Waktu/Deadline BELUM ADA, baru tanyakan 2 hal: ini ngerjain apa detailnya? dan kapan target selesainya/deadlinenya?
3. Jika ini adalah tugas pertama yang dibahas (is_first=True), tambahkan kalimat penenang singkat di awal sebelum bertanya.
4. Jangan terlalu kaku. Beri pancingan jawaban atau contoh (misalnya jika user bingung nyiapin interview, kasih contoh: 'misalnya pertanyaan umum atau portfolio').
5. Gunakan bahasa/tone yang PERSIS senada dengan ucapan user.
Batas: Maksimal 3 kalimat."""

# ── Factory ───────────────────────────────────────────────────────────────────


def make_counselor(llm, _interrupt=None, calendar_client=None):
    interrupt_fn = _interrupt if _interrupt is not None else _langgraph_interrupt
    discovery_llm = llm.with_structured_output(DiscoveryOutput)
    detail_llm = llm.with_structured_output(TaskDetailParsed)

    def run(state: AppState) -> dict:
        raw_tasks = get_raw_tasks(state)
        prev_hitl = get_hitl_input(state) or {}
        user_msg = last_message(state)
        loop_count = len(state.get("counselor_response") or [])

        _log("=== RUN ===", f"loop={loop_count} phase={prev_hitl.get('phase', 'init')}")

        if loop_count >= MAX_LOOPS:
            return _force_done(raw_tasks)

        phase = prev_hitl.get("phase", "init")

        # ── 1. Phase: Discovery (Jika tugas belum spesifik) ──
        if phase == "init" and _is_vague(raw_tasks):
            ai_prev_msg = prev_hitl.get("message", "")
            msg = _discovery_msg(llm, user_msg)

            _log("INTERRUPT discovery", msg)
            result = (
                interrupt_fn(
                    {"type": "counselor_chat", "message": msg, "phase": "chat"}
                )
                or {}
            )
            answer = (result.get("additional_context") or "").strip()

            if not answer:
                return _chat_return(msg, raw_tasks, {"phase": "init", "message": msg})

            new_tasks = _parse_discovery(discovery_llm, answer, ai_prev_msg)

            if not new_tasks:
                retry = "Hmm, aku belum bisa tangkap tugas-tugasnya. Bisa sebutin lebih jelas?"
                interrupt_fn(
                    {"type": "counselor_chat", "message": retry, "phase": "chat"}
                )
                return _chat_return(
                    retry, raw_tasks, {"phase": "init", "message": retry}
                )

            meta = _init_meta(new_tasks)
            return _chat_return(
                "", _to_tasks(meta), {"phase": "detail", "tasks_with_meta": meta}
            )

        # ── 2. Phase: Detail (Iterasi Tanya Tiap Task) ──
        meta = prev_hitl.get("tasks_with_meta") or _init_meta(raw_tasks)

        if phase in ["init", "detail"]:
            # Cari task PERTAMA yang belum dikonfirmasi detailnya
            idx = _next_incomplete(meta, -1)

            if idx is not None:
                is_first = idx == 0 and phase == "init"
                msg = _detail_q(llm, meta[idx], is_first=is_first, user_msg=user_msg)

                _log(f"INTERRUPT detail[{idx}]", msg)
                # Tunggu balasan user...
                result = (
                    interrupt_fn(
                        {"type": "counselor_chat", "message": msg, "phase": "detail"}
                    )
                    or {}
                )
                answer = (result.get("additional_context") or "").strip()

                # User membalas! Langsung masukkan jawaban ke tugas ke-[idx]
                meta = _apply_answer(detail_llm, meta, idx, answer, msg)

                # Cek apakah masih ada tugas lain setelah ini?
                nxt = _next_incomplete(meta, idx)
                if nxt is None:
                    # Semua sudah ditanya, maju ke Review
                    return _chat_return(
                        msg,
                        _to_tasks(meta),
                        {"phase": "review", "tasks_with_meta": meta, "review_count": 0},
                    )
                else:
                    # Masih ada tugas yang antre untuk ditanya, putar lagi ke Detail
                    return _chat_return(
                        msg,
                        _to_tasks(meta),
                        {"phase": "detail", "tasks_with_meta": meta},
                    )
            else:
                # Fallback: jika sejak awal semua tugas sudah sangat lengkap
                phase = "review"

        # ── 3. Phase: Review (Konfirmasi & Edit Tambahan) ──
        if phase == "review":
            _log("PHASE review")
            review_count = prev_hitl.get("review_count", 0)
            extra = (prev_hitl.get("additional_context") or "").strip()
            ai_prev_msg = prev_hitl.get("message", "")
            tasks = _to_tasks(meta)

            feedback_msg = ""
            if extra:
                feedback_msg = _gen_feedback(llm, extra, tasks)
                try:
                    enrich_llm = llm.with_structured_output(ReviewEnrichOutput)
                    task_context = "\n".join(
                        f"- task_id={t['task_id']} | Deskripsi Lama: {t.get('description') or '(kosong)'}"
                        for t in meta
                    )
                    res = enrich_llm.invoke(
                        [
                            {"role": "system", "content": REVIEW_ENRICH_SYSTEM},
                            {
                                "role": "user",
                                "content": f"Pesan AI Sebelumnya:\n{ai_prev_msg}\n\nCerita Tambahan User:\n{extra}\n\nTask:\n{task_context}",
                            },
                        ]
                    )
                    task_map = {t["task_id"]: dict(t) for t in meta}
                    for u in res.updates:
                        if u.task_id in task_map:
                            if u.updated_description:
                                task_map[u.task_id]["description"] = (
                                    u.updated_description
                                )
                            if u.updated_raw_time:
                                task_map[u.task_id]["raw_time"] = u.updated_raw_time
                    meta = list(task_map.values())
                    tasks = _to_tasks(meta)
                except Exception as e:
                    _log("ENRICH ERROR", e)

            return _do_review(
                tasks,
                meta,
                user_msg,
                llm,
                interrupt_fn,
                loop_count,
                review_count,
                feedback_msg=feedback_msg,
            )

    return run


# ── Sub-Functions & Helpers ───────────────────────────────────────────────────


def _do_review(
    tasks,
    meta,
    user_msg,
    llm,
    interrupt_fn,
    loop_count,
    review_count,
    feedback_msg: str = "",
):
    if review_count >= MAX_REVIEW:
        return _force_done(tasks)

    review_body, offer_msg = _gen_review(llm, tasks, user_msg)

    if feedback_msg:
        full_review = f"{feedback_msg}\n\n{review_body}\n\n{offer_msg}"
    else:
        full_review = f"{review_body}\n\n{offer_msg}"

    task_summary = [
        {
            "task_id": t.get("task_id", ""),
            "title": t.get("title", ""),
            "description": t.get("description", ""),
            "raw_time": t.get("raw_time"),
        }
        for t in tasks
    ]

    result = (
        interrupt_fn(
            {
                "type": "counselor_review",
                "message": full_review,
                "phase": "review",
                "task_summary": task_summary,
            }
        )
        or {}
    )

    approved = bool(result.get("approved"))
    extra = (result.get("additional_context") or "").strip()

    if approved:
        bridge = f"Siap! Sekarang kita atur jadwal buat {len(tasks)} tugas ini ya biar semua kelar tepat waktu."
        full_msg = f"{full_review}\n\n{bridge}"
        return {
            **ai_msg(full_msg),
            "raw_tasks": tasks,
            "counselor_response": [full_msg],
            "counselor_done": True,
            "hitl_status": "approved",
            "hitl_input": None,
        }

    return _chat_return(
        full_review,
        tasks,
        {
            "phase": "review",
            "current_task_index": 0,
            "tasks_with_meta": meta,
            "review_count": review_count + 1,
            "additional_context": extra,
            "message": full_review,
        },
    )


def _parse_discovery(discovery_llm, user_answer: str, ai_prev_msg: str) -> list[dict]:
    try:
        result = discovery_llm.invoke(
            [
                {"role": "system", "content": DISCOVERY_SYSTEM},
                {
                    "role": "user",
                    "content": f"Pesan AI Sebelumnya:\n{ai_prev_msg}\n\nJawaban User:\n{user_answer}",
                },
            ]
        )
        tasks = []
        for t in result.tasks:
            tasks.append(
                {
                    "task_id": str(uuid4()),
                    "title": t.title,
                    "description": "",
                    "raw_time": t.raw_time,
                    "raw_input": t.raw_input or user_answer,
                    "category": t.category,
                }
            )
        return tasks
    except Exception:
        return []


def _apply_answer(
    detail_llm, meta: list, idx: int, answer: str, ai_prev_msg: str
) -> list:
    if idx >= len(meta):
        return meta

    result = [dict(t) for t in meta]
    target = result[idx]

    if not answer:
        target["deadline_confirmed"] = True
        target["description_filled"] = True
        result[idx] = target
        return result

    old_desc = (target.get("description") or "").strip()

    try:
        parsed = detail_llm.invoke(
            [
                {"role": "system", "content": DETAIL_PARSE_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Task yang dibahas: {target.get('title', 'task ini')}\n"
                        f"Deskripsi Lama: {old_desc}\n\n"
                        f"Pertanyaan AI Sebelumnya: {ai_prev_msg}\n"
                        f"Jawaban Baru User: {answer}\n\n"
                        f"Berdasarkan pertanyaan AI dan jawaban user, perbarui Deskripsi Lama menjadi deskripsi yang padu!"
                    ),
                },
            ]
        )

        if parsed.parsed_description and parsed.parsed_description.strip():
            target["description"] = parsed.parsed_description.strip()
        elif answer:
            combined = f"{old_desc.rstrip('.')} lalu menambahkan detail bahwa {answer}"
            target["description"] = combined.strip()

        if parsed.parsed_raw_time and parsed.parsed_raw_time.strip():
            target["raw_time"] = parsed.parsed_raw_time.strip()

    except Exception as e:
        _log("APPLY ANSWER ERROR", e)
        ans = answer.strip()
        if old_desc:
            target["description"] = (
                f"{old_desc.rstrip('.')} lalu menyebutkan bahwa: {ans}."
            )
        else:
            target["description"] = ans

    target["deadline_confirmed"] = True
    target["description_filled"] = True
    result[idx] = target
    return result


def _gen_review(llm, tasks: list, user_msg: str) -> tuple[str, str]:
    try:
        task_lines = []
        for t in tasks:
            desc = t.get("description") or "(belum ada deskripsi)"
            deadline = t.get("raw_time") or "belum ada deadline"
            task_lines.append(
                f"- {t.get('title', 'Task')}: {desc}, deadline: {deadline}"
            )

        result = llm.invoke(
            [
                {"role": "system", "content": REVIEW_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Pesan awal user: {user_msg}\n\n"
                        f"Task:\n" + "\n".join(task_lines)
                    ),
                },
            ]
        )
        raw = str(result.content) if hasattr(result, "content") else str(result)

        if "|||" in raw:
            parts = raw.split("|||", 1)
            review_body = parts[0].strip()
            offer_msg = parts[1].strip()
        else:
            review_body = raw.strip()
            offer_msg = _fallback_offer(tasks)

        return review_body, offer_msg

    except Exception as e:
        _log("REVIEW GEN ERROR", e)
        return _fallback_review(tasks), _fallback_offer(tasks)


def _gen_feedback(llm, extra: str, tasks: list) -> str:
    try:
        task_context = ", ".join(t.get("title", "task") for t in tasks)
        result = llm.invoke(
            [
                {"role": "system", "content": FEEDBACK_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Task user: {task_context}\nCerita tambahan user: {extra}"
                    ),
                },
            ]
        )
        return (
            str(result.content).strip()
            if hasattr(result, "content")
            else str(result).strip()
        )
    except Exception:
        return "Makasih udah cerita lebih!"


def _fallback_offer(tasks: list) -> str:
    if not tasks:
        return "Ada yang mau ditambahin atau diubah?"
    titles = [t.get("title", "tugas ini") for t in tasks]
    if len(titles) == 1:
        task_str = titles[0]
    elif len(titles) == 2:
        task_str = f"{titles[0]} dan {titles[1]}"
    else:
        task_str = ", ".join(titles[:-1]) + f", dan {titles[-1]}"
    return (
        f"Kalau lo mau ceritain lebih — misalnya soal {task_str}, "
        f"perasaan lo terhadap salah satunya, atau langkah yang udah ada di pikiran — boleh banget. "
        f"Tapi kalau udah oke semua, kita gas aja langsung!"
    )


def _fallback_review(tasks: list) -> str:
    lines = [
        f"\u2022 {t.get('title', 'Task')}: {t.get('description') or 'belum ada detail'}, "
        f"deadline {t.get('raw_time') or 'belum ada'}"
        for t in tasks
    ]
    return (
        "Oke, ini yang aku tangkap dari tugasmu:\n"
        + "\n".join(lines)
        + "\n\nKalau ada detail lain yang mau ditambahin boleh ceritain. Atau kalau udah oke, langsung approve aja!"
    )


def _is_vague(raw_tasks: list) -> bool:
    if not raw_tasks:
        return True
    if len(raw_tasks) == 1:
        return bool(_get(raw_tasks[0], "is_vague"))
    return False


def _init_meta(raw_tasks: list) -> list[dict]:
    result = []
    for t in raw_tasks:
        d = _to_dict(t)
        desc = d.get("description") or ""
        vague = ["belum jelas", "tidak disebutkan", "tidak diketahui"]
        has_desc = len(desc) > 15 and not any(kw in desc.lower() for kw in vague)
        d.setdefault("deadline_confirmed", d.get("raw_time") is not None)
        d.setdefault("description_filled", has_desc)
        result.append(d)
    return result


def _next_incomplete(meta: list, after: int) -> int | None:
    for i, t in enumerate(meta):
        if i <= after:
            continue
        if not t.get("description_filled") or not t.get("deadline_confirmed"):
            return i
    return None


def _to_tasks(meta: list) -> list[dict]:
    return [
        {
            "task_id": t.get("task_id") or str(uuid4()),
            "title": t.get("title", ""),
            "description": t.get("description", ""),
            "raw_time": t.get("raw_time"),
            "raw_input": t.get("raw_input", ""),
            "category": t.get("category", "biasa"),
        }
        for t in meta
    ]


def _discovery_msg(llm, user_msg: str) -> str:
    try:
        result = llm.invoke(
            [
                {"role": "system", "content": DISCOVERY_CHAT_SYSTEM},
                {"role": "user", "content": f"Ucapan awal user: {user_msg}"},
            ]
        )
        content = (
            str(result.content).strip()
            if hasattr(result, "content")
            else str(result).strip()
        )
        if content:
            return content
    except Exception:
        pass

    has_stress = _stress(user_msg)
    opening = (
        "Oke, tenang dulu — wajar banget ngerasa pusing kalau lagi banyak yang dipikirin. Kita urai pelan-pelan ya."
        if has_stress
        else "Oke, aku bantu atur semuanya ya."
    )
    return f"{opening} Coba ceritain dulu — ada kewajiban apa aja yang lagi kepikiran? (contoh: 'tugas basdat, meeting sama klien')"


def _detail_q(llm, task_meta: dict, is_first: bool, user_msg: str) -> str:
    title = task_meta.get("title", "yang ini")
    raw_time = task_meta.get("raw_time")

    time_context = (
        f"Waktu/Deadline yang sudah diketahui: {raw_time}"
        if raw_time
        else "Waktu/Deadline: Belum diketahui"
    )

    try:
        result = llm.invoke(
            [
                {"role": "system", "content": DETAIL_CHAT_SYSTEM},
                {
                    "role": "user",
                    "content": f"Ucapan awal user: {user_msg}\nStatus: is_first={is_first}, Task yang dibahas sekarang: {title}\n{time_context}",
                },
            ]
        )
        content = (
            str(result.content).strip()
            if hasattr(result, "content")
            else str(result).strip()
        )
        if content:
            return content
    except Exception:
        pass

    is_stress = _stress(user_msg)
    if is_first:
        warmup = (
            "Oke, kita bedah satu-satu pelan-pelan ya — biar semuanya keliatan lebih manageable. "
            if is_stress
            else "Oke, kita mulai dari yang pertama ya. "
        )
        prefix = f"{warmup}Sekarang ceritain dulu soal **{title}**:"
    else:
        prefix = f"Oke noted! Sekarang **{title}**:"

    if raw_time:
        return f"{prefix} berhubung jadwalnya udah kecatat di {raw_time}, kira-kira apa aja materi spesifik yang mau dipelajarin?"
    else:
        return f"{prefix} kira-kira ini ngerjain apa dan ada target selesainya kapan?"


def _stress(msg: str) -> bool:
    signals = [
        "pusing",
        "stress",
        "stres",
        "capek",
        "cape",
        "overwhelmed",
        "ga tau",
        "gak tau",
        "bingung",
        "panik",
        "lelah",
        "penat",
        "mumet",
        "galau",
        "ga sanggup",
        "gak sanggup",
        "burnout",
        "anjay",
        "anjir",
        "gila",
        "ga kuat",
        "susah",
        "berat",
    ]
    lower = msg.lower()
    return any(s in lower for s in signals)


def _chat_return(msg: str, raw_tasks: list, hitl_state: dict) -> dict:
    return {
        **ai_msg(msg),
        "raw_tasks": raw_tasks,
        "counselor_response": [msg] if msg else [],
        "counselor_done": False,
        "hitl_status": "rejected",
        "hitl_input": hitl_state,
    }


def _force_done(raw_tasks: list) -> dict:
    titles = [_get(t, "title") or "task" for t in raw_tasks]
    task_str = (
        " dan ".join(titles)
        if len(titles) <= 2
        else ", ".join(titles[:-1]) + f", dan {titles[-1]}"
    )
    msg = (
        f"Oke, aku udah catat semuanya. Yuk kita langsung atur jadwal buat {task_str}!"
    )
    return {
        **ai_msg(msg),
        "raw_tasks": raw_tasks,
        "counselor_response": [msg],
        "counselor_done": True,
        "hitl_status": "approved",
        "hitl_input": None,
    }


def _get(task, field: str):
    if hasattr(task, field):
        return getattr(task, field)
    if isinstance(task, dict):
        return task.get(field)
    return None


def _to_dict(task) -> dict:
    if hasattr(task, "model_dump"):
        return task.model_dump()
    if isinstance(task, dict):
        return dict(task)
    return {}
