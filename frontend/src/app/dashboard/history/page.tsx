"use client";

import { useEffect, useState, useMemo } from "react";
import { HistoryCard } from "@/components/dashboard/HistoryCard";
import { scheduleService } from "@/services/scheduleService";
import type { HistoryItem } from "@/types";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Mengubah string "6 Juni 2026 pukul 00.12" menjadi timestamp (angka)
 */
const parseIndonesianDate = (dateStr: string) => {
  if (!dateStr) return 0;
  const monthNames: Record<string, number> = {
    januari: 0,
    februari: 1,
    maret: 2,
    april: 3,
    mei: 4,
    juni: 5,
    juli: 6,
    agustus: 7,
    september: 8,
    oktober: 9,
    november: 10,
    desember: 11,
  };
  try {
    const regex =
      /(\d+)\s+([a-zA-Z]+)\s+(\d{4})(?:\s+pukul\s+(\d{1,2})[\.:](\d{2}))?/;
    const match = dateStr.match(regex);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = monthNames[match[2].toLowerCase()] || 0;
      const year = parseInt(match[3], 10);
      const hour = match[4] ? parseInt(match[4], 10) : 0;
      const minute = match[5] ? parseInt(match[5], 10) : 0;
      return new Date(year, month, day, hour, minute).getTime();
    }
    return new Date(dateStr).getTime() || 0;
  } catch {
    return 0;
  }
};

/**
 * Mendapatkan string format "YYYY-Wxx" (contoh: 2026-W23) dari timestamp
 * Cocok untuk disinkronkan dengan input type="week"
 */
const getLocalWeekString = (timestamp: number) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNo = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

/**
 * Memformat timestamp menjadi string "DD MMMM YYYY"
 */
const formatDateString = (timestamp: number) => {
  const d = new Date(timestamp);
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function HistoryPage() {
  const [historyData, setHistoryData] = useState<HistoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States untuk Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("date-desc");

  // States untuk Period & Grouping
  const [filterPeriod, setFilterPeriod] = useState("all"); // 'all', 'day', 'week'
  const [selectedDate, setSelectedDate] = useState(""); // Format: YYYY-MM-DD
  const [selectedWeek, setSelectedWeek] = useState(""); // Format: YYYY-Wxx
  const [groupBy, setGroupBy] = useState("none"); // 'none', 'day', 'week'

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setError(null);
        const data = await scheduleService.getHistory();
        setHistoryData(data);
      } catch (e) {
        console.error("Failed to fetch history:", e);
        setError("Gagal memuat riwayat. Pastikan kamu sudah login.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const uniqueStatuses = useMemo(() => {
    if (!historyData) return [];
    return Array.from(new Set(historyData.map((item) => item.status)));
  }, [historyData]);

  // Client-side processing: Filter -> Sort -> Group
  const processedData = useMemo(() => {
    if (!historyData) return [];

    let filtered = [...historyData];

    // 1. Filter by Search Query
    if (searchQuery.trim()) {
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // 2. Filter by Status
    if (filterStatus !== "All") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // 3. Filter by Period (Hari atau Minggu)
    if (filterPeriod === "day" && selectedDate) {
      filtered = filtered.filter((item) => {
        const ts = parseIndonesianDate(item.date);
        const d = new Date(ts);
        const itemDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return itemDateStr === selectedDate;
      });
    } else if (filterPeriod === "week" && selectedWeek) {
      filtered = filtered.filter((item) => {
        const ts = parseIndonesianDate(item.date);
        return getLocalWeekString(ts) === selectedWeek;
      });
    }

    // 4. Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return parseIndonesianDate(b.date) - parseIndonesianDate(a.date);
        case "date-asc":
          return parseIndonesianDate(a.date) - parseIndonesianDate(b.date);
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    // 5. Grouping
    if (groupBy === "none") {
      return [{ groupName: "All", items: filtered }];
    }

    const groupedMap = new Map<string, HistoryItem[]>();
    const seenGroups = new Set<string>();
    const resultGrouped: { groupName: string; items: HistoryItem[] }[] = [];

    filtered.forEach((item) => {
      const ts = parseIndonesianDate(item.date);
      let key = "";

      if (groupBy === "day") {
        key = formatDateString(ts);
      } else if (groupBy === "week") {
        const [y, w] = getLocalWeekString(ts).split("-W");
        key = `Minggu ke-${parseInt(w, 10)}, Tahun ${y}`;
      }

      if (!groupedMap.has(key)) groupedMap.set(key, []);
      groupedMap.get(key)!.push(item);

      // Menjaga agar urutan grup tetap sesuai urutan sorting item pertama yang masuk
      if (!seenGroups.has(key)) {
        seenGroups.add(key);
        resultGrouped.push({ groupName: key, items: groupedMap.get(key)! });
      }
    });

    return resultGrouped;
  }, [
    historyData,
    searchQuery,
    filterStatus,
    sortBy,
    filterPeriod,
    selectedDate,
    selectedWeek,
    groupBy,
  ]);

  // Kalkulasi total item yang sedang dirender
  const totalItems = processedData.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <main className="flex-1 flex flex-col h-full bg-[#FFFFFF]">
      <div className="px-8 pt-10 pb-6 shrink-0 border-b border-[#F3F4F6]">
        <h1 className="text-[26px] font-semibold text-[#0A0A0A] mb-1">
          Schedule History
        </h1>
        <p className="text-[15px] text-[#717182]">
          View all your past schedules and task plans
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Kolom Kiri: List History */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="w-full flex flex-col">
            {isLoading && (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((skeleton) => (
                  <div
                    key={skeleton}
                    className="w-full bg-white border border-[#F3F4F6] rounded-[16px] h-[124px] animate-pulse px-6 py-5"
                  />
                ))}
              </div>
            )}

            {!isLoading && error && (
              <div className="flex flex-col items-center justify-center text-center mt-10 p-10 border border-dashed border-red-200 rounded-[16px] bg-red-50">
                <p className="text-[15px] text-red-500 font-medium">{error}</p>
              </div>
            )}

            {!isLoading && !error && totalItems === 0 && (
              <div className="flex flex-col items-center justify-center text-center mt-10 p-10 border border-dashed border-gray-200 rounded-[16px] bg-gray-50">
                <p className="text-[15px] text-[#717182] font-medium">
                  {historyData?.length === 0
                    ? "No history found. Start your first session on the Dashboard!"
                    : "No matching history found for your filter."}
                </p>
              </div>
            )}

            {/* Render Data dengan Grouping */}
            {!isLoading &&
              !error &&
              totalItems > 0 &&
              processedData.map((group, idx) => (
                <div key={idx} className="mb-8 last:mb-0">
                  {groupBy !== "none" && (
                    <h3 className="text-[14px] font-bold text-[#8A38F5] mb-4 uppercase tracking-wider border-b border-[#F3F4F6] pb-2">
                      {group.groupName}
                    </h3>
                  )}
                  <div className="flex flex-col gap-4">
                    {group.items.map((item) => (
                      <HistoryCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Kolom Kanan: Filter & Sort Controls */}
        {!isLoading && !error && historyData && historyData.length > 0 && (
          <div className="w-full lg:w-[320px] bg-gray-50 border-l border-[#F3F4F6] p-8 shrink-0 overflow-y-auto text-black">
            <h2 className="text-[18px] font-semibold text-[#0A0A0A] mb-6">
              Filter & Sort
            </h2>

            {/* Search */}
            <div className="mb-6">
              <label className="block text-[13px] font-medium mb-2">
                Search Title
              </label>
              <input
                type="text"
                placeholder="Search schedules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#D3C1FF] focus:ring-1 focus:ring-[#D3C1FF] transition-all"
              />
            </div>

            {/* Group By (NEW) */}
            <div className="mb-6">
              <label className="block text-[13px] font-medium mb-2">
                Group By
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full bg-white border border-[#D3C1FF] rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:ring-1 focus:ring-[#D3C1FF] transition-all cursor-pointer font-medium text-[#8A38F5]"
              >
                <option value="none">No Grouping</option>
                <option value="day">Group by Day</option>
                <option value="week">Group by Week</option>
              </select>
            </div>

            <hr className="border-[#E5E7EB] mb-6" />

            {/* Period Filter (NEW) */}
            <div className="mb-6">
              <label className="block text-[13px] font-medium mb-2">
                Time Period
              </label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#D3C1FF] focus:ring-1 focus:ring-[#D3C1FF] transition-all cursor-pointer mb-3"
              >
                <option value="all">All Time</option>
                <option value="day">Specific Day</option>
                <option value="week">Specific Week</option>
              </select>

              {/* Conditional Input based on Period Selection */}
              {filterPeriod === "day" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#D3C1FF] focus:ring-1 focus:ring-[#D3C1FF] transition-all"
                />
              )}
              {filterPeriod === "week" && (
                <input
                  type="week"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#D3C1FF] focus:ring-1 focus:ring-[#D3C1FF] transition-all"
                />
              )}
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <label className="block text-[13px] font-medium mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#D3C1FF] focus:ring-1 focus:ring-[#D3C1FF] transition-all cursor-pointer"
              >
                <option value="All">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div>
              <label className="block text-[13px] font-medium mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#D3C1FF] focus:ring-1 focus:ring-[#D3C1FF] transition-all cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="title-asc">Title (A - Z)</option>
                <option value="title-desc">Title (Z - A)</option>
              </select>
            </div>

            {/* Info Badge */}
            <div className="mt-8 bg-[#D3C1FF]/20 text-[#8A38F5] px-4 py-3 rounded-[12px] text-[13px] text-center">
              Showing {totalItems} of {historyData.length} items
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
