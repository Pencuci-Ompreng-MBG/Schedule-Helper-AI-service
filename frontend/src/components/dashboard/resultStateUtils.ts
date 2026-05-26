import { timeoutsManager } from "next/dist/server/web/sandbox/resource-managers";
import type { ScheduleItem } from "@/types";
import type { Blueprint, TaskData } from "./resultStateTypes";

export const DEFAULT_TASK: TaskData = {
  title: "Untitled Task",
  estimated_minutes: 30,
  deadline: { date: "17-05-2026", time: "00:00" },
  preferred_window: "bebas",
  priority: 3,
  category: "general",
  isSpecificTime: false,
  specific_start_time: {
    date: "28-01-2004",
    time: "19:00",
  },
};

export const mapScheduleItemsToBlueprints = (
  scheduleItems?: ScheduleItem[],
): Blueprint[] =>
  (scheduleItems ?? []).map((item, index) => ({
    id: item.task_id || `task-${index}`,
    title: item.title,
    estimated_minutes: item.estimated_minutes,
    priority: item.priority,
    subtasks: item.subtasks ?? [],
    deadline: {
      date: item.deadline?.split("T")[0] ?? "",
      time: item.deadline?.split("T")[1] ?? "",
    },
    preferred_window: item.preferred_window ?? "bebas",
    category: item.category ?? "general",
    isSpecificTime: item.is_locked_time ?? false,
    specific_start_time: {
      date: item.start_time?.split("T")[0] ?? "17-05-2026",
      time: item.start_time?.split("T")[1] ?? item.locked_start_time ?? "19:00",
    },
    time: item.time || "Belum dijadwalkan",
  }));

export const buildTaskData = (blueprint?: Blueprint): TaskData =>
  blueprint
    ? {
        title: blueprint.title,
        estimated_minutes: blueprint.estimated_minutes,
        deadline: blueprint.deadline,
        preferred_window: blueprint.preferred_window,
        priority: blueprint.priority,
        category: blueprint.category,
        isSpecificTime: blueprint.isSpecificTime,
        specific_start_time: blueprint.specific_start_time,
      }
    : { ...DEFAULT_TASK };

export const normalizeEstimatedMinutes = (
  value: TaskData["estimated_minutes"],
): number => (typeof value === "number" ? value : Number(value || 0));
