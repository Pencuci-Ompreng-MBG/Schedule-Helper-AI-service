"use client";

import { useEffect, useState, useMemo } from "react";
import { HistoryCard } from "@/components/dashboard/HistoryCard";
import { scheduleService } from "@/services/scheduleService";
import type { HistoryItem } from "@/types";

/**
 * Helper untuk mengubah format "6 Juni 2026 pukul 00.12" menjadi timestamp (angka)
 * agar bisa di-sort oleh JavaScript.
 */
const parseIndonesianDate = (dateStr: string) => {
  if (!dateStr) return 0;

  const monthNames: Record<string, number> = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
  };

  try {
    // Regex menangkap: [Tanggal] [Bulan] [Tahun] pukul [Jam].[Menit]
    const regex = /(\d+)\s+([a-zA-Z]+)\s+(\d{4})(?:\s+pukul\s+(\d{1,2})[\.:](\d{2}))?/;
    const match = dateStr.match(regex);

    if (match) {
      const day = parseInt(match[1], 10);
      const month = monthNames[match[2].toLowerCase()] || 0;
      const year = parseInt(match[3], 10);
      const hour = match[4] ? parseInt(match[4], 10) : 0;
      const minute = match[5] ? parseInt(match[5], 10) : 0;

      return new Date(year, month, day, hour, minute).getTime();
    }

    // Fallback jika sewaktu-waktu format dari backend menggunakan ISO standar
    return new Date(dateStr).getTime() || 0;
  } catch {
    return 0;
  }
};

export default function HistoryPage() {
  const [historyData, setHistoryData] = useState<HistoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("date-desc");

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
    const statuses = historyData.map((item) => item.status);
    return Array.from(new Set(statuses));
  }, [historyData]);

  const processedData = useMemo(() => {
    if (!historyData) return [];

    let result = [...historyData];

    if (searchQuery.trim()) {
      result = result.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (filterStatus !== "All") {
      result = result.filter((item) => item.status === filterStatus);
    }

    result.sort((a, b) => {
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

    return result;
  }, [historyData, searchQuery, filterStatus, sortBy]);

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

      {/* Main Content: 2 Columns */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Kolom Kiri: List History */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="w-full flex flex-col gap-4">
            {/* Skeleton Loader */}
            {isLoading && (
              <>
                {[1, 2, 3].map((skeleton) => (
                  <div
                    key={skeleton}
                    className="w-full bg-white border border-[#F3F4F6] rounded-[16px] h-[124px] animate-pulse flex flex-col justify-center px-6 py-5 gap-3 shadow-sm"
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-7 bg-[#D3C1FF]/40 rounded-full w-24"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/4 mt-2"></div>
                  </div>
                ))}
              </>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <div className="flex flex-col items-center justify-center text-center mt-10 p-10 border border-dashed border-red-200 rounded-[16px] bg-red-50">
                <p className="text-[15px] text-red-500 font-medium">{error}</p>
              </div>
            )}

            {/* Empty State / Not Found State */}
            {!isLoading && !error && processedData.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center mt-10 p-10 border border-dashed border-gray-200 rounded-[16px] bg-gray-50">
                <p className="text-[15px] text-[#717182] font-medium">
                  {historyData?.length === 0
                    ? "No history found. Start your first session on the Dashboard!"
                    : "No matching history found for your filter."}
                </p>
              </div>
            )}

            {/* History Cards */}
            {!isLoading &&
              !error &&
              processedData.length > 0 &&
              processedData.map((item) => (
                <HistoryCard key={item.id} item={item} />
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
              Showing {processedData.length} of {historyData.length} items
            </div>
          </div>
        )}
      </div>
    </main>
  );
}