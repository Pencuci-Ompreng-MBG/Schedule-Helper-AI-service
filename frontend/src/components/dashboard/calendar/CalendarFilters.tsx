"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { CalendarCompletionFilter } from "@/types";

interface CalendarFiltersProps {
  totalCount: number;
  loadedCount: number;
  categories: string[];
  selectedCategory: string;
  completionFilter: CalendarCompletionFilter;
  searchInput: string;
  isCategoriesLoading: boolean;
  onCategoryChange: (value: string) => void;
  onCompletionChange: (value: CalendarCompletionFilter) => void;
  onSearchChange: (value: string) => void;
}

const completionOptions: Array<{
  value: CalendarCompletionFilter;
  label: string;
}> = [
  { value: "all", label: "Semua" },
  { value: "completed", label: "Selesai" },
  { value: "open", label: "Belum selesai" },
];

export function CalendarFilters({
  totalCount,
  loadedCount,
  categories,
  selectedCategory,
  completionFilter,
  searchInput,
  isCategoriesLoading,
  onCategoryChange,
  onCompletionChange,
  onSearchChange,
}: CalendarFiltersProps) {
  const [_isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="mb-4 rounded-[18px] border border-[#EEF0F5] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[12px] font-semibold text-[#0A0A0A]">
            Filter & pencarian
          </p>
          <p className="text-[12px] text-[#717182]">
            Cari task, pilih kategori, dan tampilkan status selesai secara
            cepat.
          </p>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          {loadedCount} / {totalCount || loadedCount} task
        </span>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            type="search"
            placeholder="Cari judul, deskripsi, kategori, atau isi task"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#8A38F5]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Kategori
            </span>
            <select
              value={selectedCategory}
              onChange={(event) => onCategoryChange(event.target.value)}
              disabled={isCategoriesLoading}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-[#8A38F5] disabled:cursor-not-allowed disabled:bg-gray-50"
            >
              <option value="all">Semua kategori</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Status selesai
            </span>
            <div className="grid grid-cols-3 gap-2">
              {completionOptions.map((option) => {
                const isActive = option.value === completionFilter;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onCompletionChange(option.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "border-[#8A38F5] bg-[#F4EEFF] text-[#7021dc]"
                        : "border-gray-200 bg-white text-slate-600 hover:border-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
