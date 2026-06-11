import type { Blueprint, TaskData } from "./resultStateTypes";
import type { PrioritizerTask } from "@/hooks/useChat"; // Import dari lokasi yg sesuai

export const DEFAULT_TASK: TaskData = {
  title: "Untitled Task",
  estimated_minutes: 30,
  deadline: { date: "", time: "23:59" },
  preferred_window: "bebas",
  priority: 3,
  category: "biasa",
  is_locked_time: false,
  locked_start_time: {
    date: "",
    time: "09:00",
  },
  priority_reasoning: ""
};

// UPDATE: Membaca murni dari 'tasks' (PrioritizerTask), bukan dari Calendar/ScheduleItem
export const mapHitlTasksToBlueprints = (
  tasks?: PrioritizerTask[],
): Blueprint[] => {
  return (tasks ?? []).map((t, index) => {
    
    // Fungsi untuk memecah string ISO "2026-05-14T19:00:00" jadi { date, time }
    const splitIso = (iso: string | null | undefined, defDate: string, defTime: string) => {
      if (!iso) return { date: defDate, time: defTime };
      const [d, rest] = iso.split("T");
      const tStr = rest ? rest.substring(0, 5) : defTime;
      return { date: d, time: tStr };
    };

    const deadlineObj = splitIso(t.deadline, "", "23:59");
    const lockedObj = splitIso(t.locked_start_time, "", "09:00");

    return {
      id: t.task_id || `task-${index}`,
      title: t.title,
      estimated_minutes: t.estimated_minutes,
      priority: t.priority,
      subtasks: t.subtasks ?? [],
      deadline: deadlineObj,
      preferred_window: t.preferred_window ?? "bebas",
      category: t.category ?? "biasa",
      is_locked_time: t.is_locked_time ?? false,
      locked_start_time: lockedObj,
      priority_reasoning: t.priority_reasoning
    };
  });
};

export const buildTaskData = (blueprint?: Blueprint): TaskData =>
  blueprint
    ? {
        title: blueprint.title,
        estimated_minutes: blueprint.estimated_minutes,
        deadline: blueprint.deadline,
        preferred_window: blueprint.preferred_window,
        priority: blueprint.priority,
        category: blueprint.category,
        is_locked_time: blueprint.is_locked_time,
        locked_start_time: blueprint.locked_start_time,
        priority_reasoning: blueprint.priority_reasoning
      }
    : { ...DEFAULT_TASK };

export const normalizeEstimatedMinutes = (
  value: TaskData["estimated_minutes"],
): number => (typeof value === "number" ? value : Number(value || 0));