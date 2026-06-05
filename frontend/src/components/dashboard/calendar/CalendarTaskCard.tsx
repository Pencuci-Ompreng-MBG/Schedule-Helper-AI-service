"use client";

import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCw,
} from "lucide-react";
import type { CalendarTask } from "@/types";

interface CalendarTaskCardProps {
  task: CalendarTask;
  isExpanded: boolean;
  isSubtaskCompleted: (taskId: string, index: number) => boolean;
  onToggleExpand: (taskId: string) => void;
  onToggleMainTask: (taskId: string, currentStatus: string) => void;
  onToggleSubtask: (taskId: string, index: number) => void;
  updatingTaskId: string | null;
}

function formatTaskDate(dateStr?: string | null) {
  if (!dateStr) {
    return "Waktu belum diatur";
  }

  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTaskTime(dateStr?: string | null, minutes?: number | null) {
  if (!dateStr) {
    return "";
  }

  const startDate = new Date(dateStr);
  const startHour = startDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (minutes) {
    const endDate = new Date(startDate.getTime() + minutes * 60000);
    const endHour = endDate.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${startHour} - ${endHour}`;
  }

  return startHour;
}

function getPriorityLabel(priority?: number | null) {
  if (priority === 1) {
    return "Urgent";
  }

  if (priority === 2) {
    return "Medium";
  }

  return "Low";
}

function getPriorityClass(priority?: number | null) {
  if (priority === 1) {
    return "bg-red-50 text-red-600 border-red-100";
  }

  if (priority === 2) {
    return "bg-orange-50 text-orange-600 border-orange-100";
  }

  return "bg-green-50 text-green-600 border-green-100";
}

function getStatusClass(status: string) {
  if (status === "scheduled") {
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
  }

  if (status === "completed") {
    return "bg-blue-50 text-blue-600 border-blue-100";
  }

  return "bg-amber-50 text-amber-600 border-amber-100";
}

export function CalendarTaskCard({
  task,
  isExpanded,
  isSubtaskCompleted,
  onToggleExpand,
  onToggleMainTask,
  onToggleSubtask,
  updatingTaskId,
}: CalendarTaskCardProps) {
  return (
    <div className="bg-white border border-[#F3F4F6] rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
          {task.category || "Task"}
        </span>

        <div className="flex gap-1.5 items-center">
          <span
            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getPriorityClass(task.priority)}`}
          >
            {getPriorityLabel(task.priority)}
          </span>

          <span
            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getStatusClass(task.status)}`}
          >
            {task.status}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-3 mb-1.5">
        <button
          onClick={() => onToggleMainTask(task.id, task.status)}
          disabled={updatingTaskId === task.id}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
            task.status === "completed"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-gray-300 hover:border-emerald-500 text-transparent hover:text-emerald-500"
          } ${updatingTaskId === task.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {updatingTaskId === task.id ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin text-gray-400" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>

        <h3
          className={`text-[17px] font-bold leading-snug transition-colors ${
            task.status === "completed"
              ? "text-gray-400 line-through"
              : "text-[#0A0A0A]"
          }`}
        >
          {task.title}
        </h3>
      </div>

      {task.description && (
        <p className="text-[13px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-[13px] text-[#555566] border-t border-b border-[#F9FAFB] py-3 mb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <span>{formatTaskDate(task.startTime)}</span>
        </div>

        {task.startTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-slate-800">
              {formatTaskTime(task.startTime, task.estimatedMinutes)}
            </span>
            {task.estimatedMinutes && (
              <span className="text-gray-400">
                ({task.estimatedMinutes} mins)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {task.googleEventId && (
          <div className="bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Google Calendar Synced
          </div>
        )}
        {task.googleTaskId && (
          <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Google Tasks Synced
          </div>
        )}
      </div>

      {task.subtasks && task.subtasks.length > 0 && (
        <div>
          <button
            onClick={() => onToggleExpand(task.id)}
            className="flex items-center justify-between w-full text-left text-xs font-semibold text-[#8A38F5] hover:text-[#7021dc] transition-colors mt-2"
          >
            <span>
              {isExpanded
                ? "Hide Subtasks"
                : `Show Subtasks (${task.subtasks.length})`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 pl-2 border-l-2 border-gray-100 space-y-2 animate-fadeIn">
              {task.subtasks.map((subtask, index) => {
                const completed = isSubtaskCompleted(task.id, index);

                return (
                  <div
                    key={`${task.id}-${index}`}
                    className="flex items-start gap-2.5 group"
                  >
                    <button
                      onClick={() => onToggleSubtask(task.id, index)}
                      className={`mt-0.5 shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors cursor-pointer ${
                        completed
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-gray-300 group-hover:border-emerald-500 text-transparent group-hover:text-emerald-500"
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <span
                      className={`text-[13px] leading-normal transition-colors cursor-pointer select-none ${
                        completed
                          ? "text-gray-400 line-through"
                          : "text-slate-700"
                      }`}
                      onClick={() => onToggleSubtask(task.id, index)}
                    >
                      {subtask}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
