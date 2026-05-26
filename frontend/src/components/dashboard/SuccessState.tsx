"use client";

import { Calendar, CheckCircle2, Plus } from "lucide-react";
import Link from "next/link";

interface SuccessStateProps {
  eventCount: number;
  onReset: () => void;
}

export function SuccessState({ eventCount, onReset }: SuccessStateProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center h-full bg-[#FFFFFF] animate-in fade-in duration-500">
      <div className="flex flex-col items-center justify-center text-center px-6 max-w-lg">
        {/* Success Icon Box */}
        <div className="w-[84px] h-[84px] rounded-[28px] bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 shadow-sm animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>

        <h2 className="text-[24px] font-bold text-[#0A0A0A] font-inter mb-3 leading-snug">
          Jadwal Berhasil Dikirim!
        </h2>

        <p className="text-[15px] text-[#717182] font-inter mb-8 leading-relaxed">
          Sebanyak{" "}
          <strong className="text-[#0A0A0A] font-bold">
            {eventCount} jadwal kegiatan
          </strong>{" "}
          telah sukses disinkronisasikan ke akun Google Calendar & Google Tasks
          Anda.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Link
            href="/dashboard/calendar"
            className="flex-1 py-4 px-6 rounded-2xl bg-[#8A38F5] hover:bg-[#7021dc] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:shadow-purple-100 active:scale-95 transition-all duration-200"
          >
            <Calendar className="w-5 h-5" />
            Lihat di Kalender
          </Link>

          <button
            onClick={onReset}
            className="flex-1 py-4 px-6 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-slate-700 font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-5 h-5 text-gray-500" />
            Buat Jadwal Baru
          </button>
        </div>
      </div>
    </main>
  );
}
