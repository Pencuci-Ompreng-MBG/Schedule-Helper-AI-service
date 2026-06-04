"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scheduleService } from "@/services/scheduleService";
import type {
  CalendarCompletionFilter,
  CalendarTask,
  CalendarTaskListResponse,
} from "@/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 350;

function isTaskVisibleByCompletion(
  status: string,
  completionFilter: CalendarCompletionFilter,
) {
  if (completionFilter === "completed") {
    return status === "completed";
  }

  if (completionFilter === "open") {
    return status !== "completed";
  }

  return true;
}

export function useCalendarTasks() {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [completionFilter, setCompletionFilter] = useState<CalendarCompletionFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const requestIdRef = useRef(0);
  const syncSuccessTimerRef = useRef<number | null>(null);

  const loadCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    try {
      const data = await scheduleService.getCalendarCategories();
      setCategories(data);
    } catch (e) {
      console.error("Gagal memuat kategori kalender:", e);
      setCategories([]);
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  const loadTasks = useCallback(
    async ({ page, replace }: { page: number; replace: boolean }) => {
      const requestId = ++requestIdRef.current;

      if (replace) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      try {
        const response: CalendarTaskListResponse =
          await scheduleService.getCalendarTasks({
            category: selectedCategory,
            completion: completionFilter,
            search: debouncedSearch,
            page,
            limit: PAGE_SIZE,
          });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setTasks((prev) => (replace ? response.items : [...prev, ...response.items]));
        setCurrentPage(page);
        setHasMore(response.pagination.hasMore);
        setTotalCount(response.pagination.total);
      } catch (e) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error("Gagal memuat jadwal kalender:", e);
        setError(
          "Gagal memuat jadwal kalender. Pastikan koneksi dan token aktif.",
        );
        if (replace) {
          setTasks([]);
          setTotalCount(0);
          setHasMore(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [debouncedSearch, completionFilter, selectedCategory],
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadTasks({ page: 1, replace: true });
  }, [loadTasks]);

  const refreshTasks = useCallback(() => {
    void loadTasks({ page: 1, replace: true });
  }, [loadTasks]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await scheduleService.syncCalendarTasks({
        category: selectedCategory,
        completion: completionFilter,
        search: debouncedSearch,
        page: 1,
        limit: PAGE_SIZE,
      });

      if (requestIdRef.current >= 0) {
        setTasks(response.items);
        setCurrentPage(1);
        setHasMore(response.pagination.hasMore);
        setTotalCount(response.pagination.total);
      }

      setSyncSuccess(true);
      await loadCategories();

      if (syncSuccessTimerRef.current) {
        window.clearTimeout(syncSuccessTimerRef.current);
      }

      syncSuccessTimerRef.current = window.setTimeout(() => {
        setSyncSuccess(false);
      }, 3000);
    } catch (e) {
      console.error("Gagal sinkronisasi kalender:", e);
      setError(
        "Gagal sinkronisasi dengan Google Calendar. Cek izin koneksi di backend.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [debouncedSearch, completionFilter, loadCategories, selectedCategory]);

  useEffect(() => {
    return () => {
      if (syncSuccessTimerRef.current) {
        window.clearTimeout(syncSuccessTimerRef.current);
      }
    };
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) {
      return;
    }

    void loadTasks({ page: currentPage + 1, replace: false });
  }, [currentPage, hasMore, isLoading, isLoadingMore, loadTasks]);

  const loadMoreRef = useInfiniteScroll({
    enabled: hasMore && !isLoading && !isLoadingMore && tasks.length > 0,
    onLoadMore: handleLoadMore,
  });

  const handleToggleMainTask = useCallback(
    async (taskId: string, currentStatus: string) => {
      if (updatingTaskId) {
        return;
      }

      const newStatus = currentStatus === "completed" ? "scheduled" : "completed";
      setUpdatingTaskId(taskId);

      try {
        await scheduleService.updateCalendarTask(taskId, { status: newStatus });
        setTasks((prev) =>
          prev
            .map((task) =>
              task.id === taskId ? { ...task, status: newStatus } : task,
            )
            .filter((task) =>
              isTaskVisibleByCompletion(task.status, completionFilter),
            ),
        );
      } catch (e) {
        console.error("Gagal mengubah status tugas:", e);
        setError("Gagal mengubah status tugas.");
      } finally {
        setUpdatingTaskId(null);
      }
    },
    [completionFilter, updatingTaskId],
  );

  const visibleTasks = useMemo(() => tasks, [tasks]);

  return {
    tasks: visibleTasks,
    categories,
    selectedCategory,
    setSelectedCategory,
    completionFilter,
    setCompletionFilter,
    searchInput,
    setSearchInput,
    isLoading,
    isLoadingMore,
    isCategoriesLoading,
    isSyncing,
    syncSuccess,
    error,
    hasMore,
    totalCount,
    currentPage,
    loadMoreRef,
    handleSync,
    handleToggleMainTask,
    updatingTaskId,
    refreshTasks,
  };
}
