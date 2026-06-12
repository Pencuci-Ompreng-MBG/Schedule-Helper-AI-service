"use client";

import { AlertCircle, CalendarDays, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { CalendarTask } from "@/types";
import { CalendarFilters } from "./CalendarFilters";
import { CalendarTaskCard } from "./CalendarTaskCard";

interface CalendarTaskListProps {
  tasks: CalendarTask[];
  categories: string[];
  selectedCategory: string;
  completionFilter: import("@/types").CalendarCompletionFilter;
  searchInput: string;
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isCategoriesLoading: boolean;
  error: string | null;
  hasMore: boolean;
  onCategoryChange: (value: string) => void;
  onCompletionChange: (
    value: import("@/types").CalendarCompletionFilter,
  ) => void;
  onSearchChange: (value: string) => void;
  onRetry: () => void;
  onToggleMainTask: (taskId: string, currentStatus: string) => void;
  onToggleSubtask: (taskId: string, index: number) => void;
  updatingTaskId: string | null;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

function CalendarLoadingSkeleton() {
  return (
    <>
      {[1, 2, 3].map((skeleton) => (
        <div
          key={skeleton}
          className="w-full bg-white border border-[#F3F4F6] rounded-[20px] p-6 animate-pulse flex flex-col gap-3 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div className="h-5 bg-gray-200 rounded w-2/3" />
            <div className="h-5 bg-gray-200 rounded-full w-16" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/3 mt-2" />
        </div>
      ))}
    </>
  );
}

function CalendarEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-8 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
      <CalendarDays className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-[16px] font-semibold text-gray-700 mb-1">
        Belum Ada Jadwal
      </h3>
      <p className="text-[14px] text-[#717182] max-w-sm">
        Buat jadwal harianmu lewat dashboard AI chat dan setujui untuk
        mensinkronisasikannya ke kalender.
      </p>
    </div>
  );
}

export function CalendarTaskList({
  tasks,
  categories,
  selectedCategory,
  completionFilter,
  searchInput,
  totalCount,
  isLoading,
  isLoadingMore,
  isCategoriesLoading,
  error,
  hasMore,
  onCategoryChange,
  onCompletionChange,
  onSearchChange,
  onRetry,
  onToggleMainTask,
  onToggleSubtask,
  updatingTaskId,
  loadMoreRef,
}: CalendarTaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const visibleTaskIds = new Set(tasks.map((task) => task.id));

    setExpandedTasks((prev) => {
      const nextState: Record<string, boolean> = {};
      for (const [taskId, value] of Object.entries(prev)) {
        if (visibleTaskIds.has(taskId)) {
          nextState[taskId] = value;
        }
      }
      return nextState;
    });
  }, [tasks]);

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  return (
    <div className="lg:col-span-5 flex flex-col h-full">
      <h2 className="text-[18px] font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-[#8A38F5]" />
        AI Scheduled Tasks ({totalCount})
      </h2>

      <CalendarFilters
        totalCount={totalCount}
        loadedCount={tasks.length}
        categories={categories}
        selectedCategory={selectedCategory}
        completionFilter={completionFilter}
        searchInput={searchInput}
        isCategoriesLoading={isCategoriesLoading}
        onCategoryChange={onCategoryChange}
        onCompletionChange={onCompletionChange}
        onSearchChange={onSearchChange}
      />

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-175 min-h-100">
        {isLoading || isCategoriesLoading ? (
          <CalendarLoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-red-200 rounded-[20px] bg-red-50/50">
            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
            <p className="text-[14px] text-red-600 font-medium mb-3">{error}</p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <CalendarEmptyState />
        ) : (
          <>
            {tasks.map((task) => {
              const isExpanded = Boolean(expandedTasks[task.id]);

              return (
                <CalendarTaskCard
                  key={task.id}
                  task={task}
                  isExpanded={isExpanded}
                  onToggleExpand={toggleTaskExpand}
                  onToggleMainTask={onToggleMainTask}
                  onToggleSubtask={onToggleSubtask}
                  updatingTaskId={updatingTaskId}
                />
              );
            })}

            <div ref={loadMoreRef} className="h-1 w-full" />

            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500">
                <RotateCw className="w-4 h-4 animate-spin" />
                Memuat jadwal lainnya...
              </div>
            )}

            {!hasMore && tasks.length > 0 && (
              <p className="py-3 text-center text-xs text-slate-400">
                Semua jadwal sudah dimuat.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
