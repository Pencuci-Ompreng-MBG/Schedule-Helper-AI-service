import { describe, expect, it } from "vitest";
import type { ScheduleItem } from "../../src/types";
import {
  buildTaskData,
  DEFAULT_TASK,
  mapScheduleItemsToBlueprints,
  normalizeEstimatedMinutes,
} from "../../src/components/dashboard/resultStateUtils";

describe("resultStateUtils", () => {
  it("maps schedule items into blueprints with defaults", () => {
    const items: ScheduleItem[] = [
      {
        task_id: "task-1",
        title: "Tugas Riset",
        priority: 2,
        time: "",
        category: "akademik",
        subtasks: ["Cari referensi"],
        estimated_minutes: 45,
        deadline: null,
        preferred_window: "pagi",
        is_locked_time: true,
        locked_start_time: "08:00",
      },
      {
        task_id: "task-2",
        title: "Baca jurnal",
        priority: 3,
        time: "19:00 - 20:00",
        category: "general",
        subtasks: [],
        estimated_minutes: 30,
        deadline: "2026-05-12",
        preferred_window: "bebas",
      },
    ];

    const [first, second] = mapScheduleItemsToBlueprints(items);

    expect(first.deadline).toBe("");
    expect(first.time).toBe("Belum dijadwalkan");
    expect(first.isSpecificTime).toBe(true);
    expect(first.specific_start_time).toBe("08:00");
    expect(second.time).toBe("19:00 - 20:00");
  });

  it("builds task data from a blueprint", () => {
    const [blueprint] = mapScheduleItemsToBlueprints([
      {
        task_id: "task-1",
        title: "Ujian",
        priority: 1,
        time: "08:00 - 09:00",
        category: "akademik",
        subtasks: ["Belajar"],
        estimated_minutes: 60,
        deadline: "2026-05-20",
        preferred_window: "pagi",
      },
    ]);

    const taskData = buildTaskData(blueprint);

    expect(taskData.title).toBe("Ujian");
    expect(taskData.priority).toBe(1);
    expect(taskData.estimated_minutes).toBe(60);
  });

  it("falls back to default task when blueprint is missing", () => {
    const taskData = buildTaskData();

    expect(taskData).toEqual(DEFAULT_TASK);
  });

  it("normalizes estimated minutes", () => {
    expect(normalizeEstimatedMinutes(25)).toBe(25);
    expect(normalizeEstimatedMinutes("40")).toBe(40);
    expect(normalizeEstimatedMinutes("")).toBe(0);
  });
});
