import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import type { ScheduleItem } from "@/types";
import { BlueprintSidebar } from "./BlueprintSidebar";
import { CalendarPreview } from "./CalendarPreview";
import type { Blueprint, TaskData } from "./resultStateTypes";
import {
  buildTaskData,
  DEFAULT_TASK,
  mapScheduleItemsToBlueprints,
  normalizeEstimatedMinutes,
} from "./resultStateUtils";
import { TaskEditor } from "./TaskEditor";

interface ResultStateProps {
  scheduleItems?: ScheduleItem[];
  onApprove?: () => void;
}

export function ResultState({ scheduleItems, onApprove }: ResultStateProps) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);

  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");

  const [popUpMsg, setPopUpMsg] = useState("");

  const selectedBlueprint =
    blueprints.find((b) => b.id === selectedBlueprintId) || blueprints[0];

  const [taskData, setTaskData] = useState<TaskData>(DEFAULT_TASK);

  const onConfirm = () => {
    window.alert(`Are you sure u want to ${popUpMsg}`);
  };

  useEffect(() => {
    const mapped = mapScheduleItemsToBlueprints(scheduleItems);
    setBlueprints(mapped);
    setSelectedBlueprintId((current) => {
      if (mapped.length === 0) return "";
      return mapped.some((bp) => bp.id === current) ? current : mapped[0].id;
    });
  }, [scheduleItems]);

  useEffect(() => {
    setTaskData(buildTaskData(selectedBlueprint));
  }, [selectedBlueprint]);

  const updateSelectedBlueprint = (
    updater: (blueprint: Blueprint) => Blueprint,
  ) => {
    if (!selectedBlueprintId) return;
    setBlueprints((current) =>
      current.map((bp) => (bp.id === selectedBlueprintId ? updater(bp) : bp)),
    );
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, type } = target as HTMLInputElement;

    let value: any;

    if (type === "checkbox") {
      value = (target as HTMLInputElement).checked;
    } else if (type === "number") {
      const raw = (target as HTMLInputElement).value;
      value = raw === "" ? "" : Number(raw);
    } else if (name === "priority") {
      value = Number((target as HTMLSelectElement).value);
    } else {
      value = (target as HTMLInputElement).value;
    }

    if (name === "deadline_date") {
      setTaskData((prev) => ({
        ...prev,
        deadline: {
          ...prev.deadline,
          date: value,
        },
      }));
      return;
    }

    if (name === "deadline_time") {
      setTaskData((prev) => ({
        ...prev,
        deadline: {
          ...prev.deadline,
          time: value,
        },
      }));
      return;
    }

    setTaskData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      updateSelectedBlueprint((bp) => ({
        ...bp,
        title: next.title,
        estimated_minutes: normalizeEstimatedMinutes(next.estimated_minutes),
        priority: next.priority,
        deadline: next.deadline,
        preferred_window: next.preferred_window,
        category: next.category,
        isSpecificTime: next.isSpecificTime,
        specific_start_time: next.specific_start_time,
      }));

      return next;
    });
  };

  const handleSubtaskChange = (index: number, value: string) => {
    updateSelectedBlueprint((bp) => ({
      ...bp,
      subtasks: bp.subtasks.map((s, i) => (i === index ? value : s)),
    }));
  };

  const addSubtask = () => {
    updateSelectedBlueprint((bp) => ({
      ...bp,
      subtasks: [...bp.subtasks, "Subtask baru"],
    }));
  };

  const removeSubtask = (index: number) => {
    updateSelectedBlueprint((bp) => ({
      ...bp,
      subtasks: bp.subtasks.filter((_, i) => i !== index),
    }));
  };

  const addBlueprint = () => {
    const newBlueprint: Blueprint = {
      id: `manual-${Date.now()}`,
      title: "Blueprint Baru",
      estimated_minutes: 30,
      priority: 3,
      subtasks: ["Task pertama"],
      deadline: { date: "", time: "" },
      preferred_window: "bebas",
      category: "general",
      isSpecificTime: false,
      specific_start_time: {
        date: "19-11-2026",
        time: "19:00",
      },
      time: "Belum dijadwalkan",
    };

    setBlueprints((prev) => [...prev, newBlueprint]);
    setSelectedBlueprintId(newBlueprint.id);
    setTaskData(buildTaskData(newBlueprint));
  };

  const removeBlueprint = (indexToDelete: number) => {
    setBlueprints((prev) => prev.filter((_, index) => index !== indexToDelete));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_420px] gap-5 text-slate-900">
      {/* LEFT SIDEBAR */}
      <BlueprintSidebar
        blueprints={blueprints}
        selectedId={selectedBlueprintId}
        onAdd={addBlueprint}
        onSelect={setSelectedBlueprintId}
        onRemove={removeBlueprint}
        onConfirm={onConfirm}
      />

      {/* CENTER */}
      <TaskEditor
        taskData={taskData}
        subtasks={selectedBlueprint?.subtasks ?? []}
        onChange={handleChange}
        onAddSubtask={addSubtask}
        onSubtaskChange={handleSubtaskChange}
        onRemoveSubtask={removeSubtask}
        onApprove={onApprove}
        blueprintAvailable={blueprints.length === 0}
      />

      {/* RIGHT PANEL */}
      <CalendarPreview
        blueprints={blueprints}
        timeLabel={selectedBlueprint?.time || "Belum dijadwalkan"}
        subtasks={selectedBlueprint?.subtasks ?? []}
        blueprintAvailable={blueprints.length === 0}
      />
    </div>
  );
}
