from uuid import uuid4
from typing import Literal

from langchain_core.language_models import BaseChatModel
from langchain_core.runnables import Runnable
from pydantic import BaseModel, Field

from app.graph.agents.helpers import last_message
from app.graph.state import AppState
from app.graph.types import RawTask

from datetime import datetime
from zoneinfo import ZoneInfo


type IntentMap = dict[str, list[str]]


class RouterOutputSchema(BaseModel):
    current_intent: Literal["stress", "overload", "manage_task"] | None = Field(
        default=None,
        description="Overall user intent. Must strictly match one of the allowed values.",
    )
    raw_tasks: list[RawTask] = Field(
        default_factory=list,
        description="Extract EACH distinct task/event as a SEPARATE item. If user mentions 3 different tasks, output 3 items.",
    )


SYSTEM_PROMPT = """
You are the Router Agent for a schedule management system. Identify the user's intent and extract each distinct task/event the user mentions.

OUTPUT FIELDS
- current_intent: one of ["stress", "overload", "manage_task", null]
- raw_tasks[]: title, description, raw_time, raw_input, category, is_vague
  - category: one of ["serius", "santai", "biasa", "lainnya", null]
  - task_id: assigned by the system, never generate it
  - raw_input: exact words from the user for that specific task
  - title/description/raw_time: written in the SAME language and tone as the user's input

INTENT RULES
- manage_task: neutral scheduling request, user knows what to do.
- overload: emphasizes QUANTITY/VOLUME of tasks ("tugas numpuk", "banyak banget", "keriting jari").
- stress: distress, panic, or cognitive block ("bingung", "ga tau mulai dari mana", "ngeblank", "takut") — even if a specific task+deadline is mentioned, still "stress" because they need help organizing thoughts before scheduling.

DESCRIPTION RULES
Must state: (1) the user's feeling about the task (or "not stated explicitly" if neutral), and (2) what details are missing/unknown/blocking (e.g. unknown deadline, unknown topic, unclear first step).

RAW_TIME RULES
- Capture the time phrase + its context in parentheses, e.g. "besok (latihan)", "22 Juni (mulai final hackathon)".
- "set X" / "setengah X" = X-0:30 (e.g. "set 8" = 07:30). Capture this conversion explicitly in 24-hour format.
- SMART AM/PM LOGIC: Compare the mentioned time with the "Current time" from the system context. If the user implies a future event ("abis ini", "nanti", "sebentar lagi") but the AM time has already passed, automatically convert it to PM (e.g., if it is 12:00 PM and the user says "abis ini jam set 7", output 18:30).
- MISSING DATES FOR TODAY: If the user uses relative today phrases like "abis ini", "nanti", "malam ini", or just mentions a time without a date, you MUST prepend the "Current date" to the raw_time (e.g., "{current_date} 18:30 (meeting)").
- If multiple time/date expressions exist, map each context to its correct phrase; separate with commas. Never attach a context to the wrong date.
- No time mentioned → null.

TASK DECOMPOSITION (CRITICAL)
Split into separate tasks based on independent activities — not just sentence structure. Create a NEW task for each:
- distinct action/activity (latihan, mengerjakan, menghadiri, mengikuti, mempersiapkan, etc.)
- distinct goal/objective
- distinct date/time context
- a named event/project with its OWN date — even if it only appears as a subordinate/relative clause inside another sentence (e.g. "...buat final hackathon YANG DIMULAI tanggal 22 Juni").

Do NOT merge:
- preparation/practice vs. the actual event
- planning vs. execution
- working on a project vs. attending it

Example:
Input: "Aku besok ada latihan buat final hackathon yang dimulai tanggal 22 Juni. Tapi aku juga mau lanjut project pribadi besok. Sama abis ini jam set 7 ada meeting bahas showcase capstone"
→ 3 tasks:
1. "latihan final hackathon" — raw_time: "besok (latihan)"
2. "final hackathon" — raw_time: "22 Juni (mulai final hackathon)"
3. "lanjut project pribadi" — raw_time: "besok (ngerjain project pribadi)"
4. "meeting bahas capstone" — raw_time: "{fill with today date} at 06:30 (mulai meeting)"

If a vague/general group of tasks is mentioned, extract it as one task and mark is_vague=true, noting the vagueness in description.

SELF-CHECK BEFORE FINALIZING
Count distinct (activity, date/time) pairs in the input, including any date that appears only in a relative clause describing a named event. raw_tasks must have exactly that many items — if a subordinate-clause date wasn't given its own task, add it.

EXAMPLES (intent + description)
Input: "aku besok ada tugas ABL nih dl-nya jam 9 tapi ga tau harus mulai dari mana"
→ intent: "stress" (cognitive block "ga tau harus mulai dari mana")
→ description: "Pengguna merasa bingung dan tertekan karena tidak tahu harus memulai langkah pengerjaan dari mana. Detail yang belum jelas: langkah awal dan materi tugas ABL."

Input: "besok pagi ada tugas ABL jam 9, masukin kalender ya"
→ intent: "manage_task" (neutral, direct command)
→ description: "Pengguna merasa biasa/netral. Detail yang belum jelas: topik spesifik tugas ABL."
"""


def make_router(intent_map: IntentMap, llm: BaseChatModel,  timezone: str = "Asia/Jakarta",):
    """
    Factory untuk RouterAgent.
    Tugas: klasifikasi intent dari pesan user -> update state["current_intent"].
    """

    structured_output = llm.with_structured_output(RouterOutputSchema)

    def run(state: AppState) -> dict:
        text = last_message(state)
        output = _classify(text, intent_map, structured_output, timezone)
        return output

    return run


def _classify(
    text: str,
    intent_map: IntentMap,
    structured_output: Runnable,
    timezone: str
) -> dict:
    """
    Klasifikasi intent + ekstrak raw tasks via structured LLM output.
    Intent divalidasi terhadap intent_map. Jika tidak valid/ambigu, pakai None.
    """
    datetime_context = get_datetime_context(timezone)

    result = structured_output.invoke(
        [
            {"role": "system", "content": SYSTEM_PROMPT + datetime_context},
            {"role": "user", "content": text},
        ]
    )

    if hasattr(result, "model_dump"):
        result = result.model_dump()

    if not isinstance(result, dict):
        return {"current_intent": None, "raw_tasks": []}

    raw_intent = result.get("current_intent")
    valid_intents = set(intent_map.keys())
    intent = raw_intent if raw_intent in valid_intents else None

    raw_tasks = result.get("raw_tasks")
    if not isinstance(raw_tasks, list):
        raw_tasks = []

    normalized_tasks: list[dict] = []
    for task in raw_tasks:
        if hasattr(task, "model_dump"):
            normalized_task = task.model_dump()
        elif isinstance(task, dict):
            normalized_task = dict(task)
        else:
            continue

        normalized_task["task_id"] = str(uuid4())
        normalized_tasks.append(normalized_task)

    return {
        "current_intent": intent,
        "raw_tasks": normalized_tasks,
    }


def get_datetime_context(timezone: str = "Asia/Jakarta") -> str:
    now = datetime.now(ZoneInfo(timezone))

    return f"""
CURRENT DATE/TIME CONTEXT
- Current date: {now.strftime("%d %B %Y")}
- Current day: {now.strftime("%A")}
- Current time: {now.strftime("%H:%M")}
- Timezone: {timezone}

Use this context to resolve:
- "hari ini"
- "besok"
- "lusa"
- "abis ini"
- relative dates
- missing year on dates
"""
