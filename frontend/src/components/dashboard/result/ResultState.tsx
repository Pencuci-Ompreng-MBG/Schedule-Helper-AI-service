import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { BlueprintSidebar } from "./BlueprintSidebar";
import { CalendarPreview } from "./CalendarPreview";
import { TaskEditor } from "./TaskEditor";
import type { Blueprint, TaskData } from "./resultStateTypes";
import {
  buildTaskData,
  DEFAULT_TASK,
  mapHitlTasksToBlueprints,
  normalizeEstimatedMinutes,
} from "./resultStateUtils";
import type { PrioritizerTask, ProposedSchedule } from "@/hooks/useChat"; // Import sesuai lokasimu

interface ResultStateProps {
  tasks?: PrioritizerTask[]; // Dari Payload (Kiri)
  proposedSchedule?: ProposedSchedule[]; // Dari Payload (Kanan)
  onAction?: (approved: boolean, payloadTasks: PrioritizerTask[]) => void;
}

export function ResultState({
  tasks,
  proposedSchedule,
  onAction,
}: ResultStateProps) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");
  const [taskData, setTaskData] = useState<TaskData>(DEFAULT_TASK);

  // 1. Membaca 'tasks' saat ada payload baru
  useEffect(() => {
    const mapped = mapHitlTasksToBlueprints(tasks);
    setBlueprints(mapped);
    setSelectedBlueprintId((current) => {
      if (mapped.length === 0) return "";
      return mapped.some((bp) => bp.id === current) ? current : mapped[0].id;
    });
  }, [tasks]);

  // 2. Sinkronisasi Form dengan Blueprint terpilih
  const selectedBlueprint =
    blueprints.find((b) => b.id === selectedBlueprintId) || blueprints[0];
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

  // 3. Handle Form Changes
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

    setTaskData((prev) => {
      const next = { ...prev };

      if (name === "deadline_date") {
        next.deadline = { ...prev.deadline, date: value };
      } else if (name === "deadline_time") {
        next.deadline = { ...prev.deadline, time: value };
      } else if (name === "locked_date") {
        next.locked_start_time = { ...prev.locked_start_time, date: value };
      } else if (name === "locked_time") {
        next.locked_start_time = { ...prev.locked_start_time, time: value };
      } else {
        (next as any)[name] = value;
      }

      updateSelectedBlueprint((bp) => ({
        ...bp,
        title: next.title,
        estimated_minutes: normalizeEstimatedMinutes(next.estimated_minutes),
        priority: next.priority,
        deadline: next.deadline,
        preferred_window: next.preferred_window,
        category: next.category,
        is_locked_time: next.is_locked_time,
        locked_start_time: next.locked_start_time,
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
  const removeBlueprint = (indexToDelete: number) => {
    setBlueprints((prev) => prev.filter((_, index) => index !== indexToDelete));
  };

  const addBlueprint = () => {
    const newBlueprint: Blueprint = {
      id: `manual-${Date.now()}`,
      title: "Tugas Baru",
      estimated_minutes: 30,
      priority: 3,
      subtasks: ["Langkah pertama"],
      deadline: { date: "", time: "23:59" },
      preferred_window: "bebas",
      category: "biasa",
      is_locked_time: false,
      locked_start_time: {
        date: "",
        time: "09:00",
      },
      priority_reasoning: "Tugas ditambahkan secara manual oleh pengguna.",
    };

    setBlueprints((prev) => [...prev, newBlueprint]);

    setSelectedBlueprintId(newBlueprint.id);

    setTaskData(buildTaskData(newBlueprint));
  };

  // 4. Construct Payload untuk API LangGraph
  const submitToAI = (isApproved: boolean) => {
    if (!onAction) return;

    // Mapping format Blueprint kembali ke format Python (PrioritizerTask)
    const payloadTasks: PrioritizerTask[] = blueprints.map((bp) => {
      const deadlineIso = bp.deadline.date
        ? `${bp.deadline.date}T${bp.deadline.time || "23:59"}:00`
        : null;
        const lockedIso =
        bp.is_locked_time && bp.locked_start_time.date
          ? `${bp.locked_start_time.date}T${bp.locked_start_time.time || "00:00"}:00`
          : undefined;
      console.log("locked iso:", lockedIso);
      return {
        task_id: bp.id,
        title: bp.title,
        subtasks: bp.subtasks,
        estimated_minutes: Number(bp.estimated_minutes),
        deadline: deadlineIso,
        priority: Number(bp.priority),
        category: bp.category,
        preferred_window: bp.preferred_window,
        priority_reasoning: bp.priority_reasoning,
        is_locked_time: bp.is_locked_time,
        locked_start_time: lockedIso,
      };
    });
    
    console.log(
      "payload: ",
      payloadTasks
    );
    onAction(isApproved, payloadTasks);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_420px] gap-5 text-slate-900">
      <BlueprintSidebar
        blueprints={blueprints}
        selectedId={selectedBlueprintId}
        onAdd={addBlueprint}
        onSelect={setSelectedBlueprintId}
        onRemove={removeBlueprint}
        onConfirm={() => {}}
      />

      <TaskEditor
        taskData={taskData}
        subtasks={selectedBlueprint?.subtasks ?? []}
        onChange={handleChange}
        onAddSubtask={addSubtask}
        onSubtaskChange={handleSubtaskChange}
        onRemoveSubtask={removeSubtask}
        onSimpanRevisi={() => submitToAI(false)}
        onApprove={() => submitToAI(true)}
        blueprintAvailable={blueprints.length === 0}
      />

      <CalendarPreview proposedSchedule={proposedSchedule} />
    </div>
  );
}
