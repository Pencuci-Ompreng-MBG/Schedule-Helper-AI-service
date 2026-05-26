"use client";

import { Loader2 } from "lucide-react";

export function SubmittingState() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center h-full bg-[#FFFFFF] animate-in fade-in duration-500">
      <div className="flex flex-col items-center justify-center text-center px-6">
        {/* Animated Icon Box */}
        <div className="w-[80px] h-[80px] rounded-[24px] bg-[#FAF9FF] border border-[#ECE9FC] flex items-center justify-center mb-6 shadow-sm">
          <Loader2 className="w-10 h-10 text-[#8A38F5] animate-spin" />
        </div>

        <h2 className="text-[22px] font-bold text-[#0A0A0A] font-inter mb-3">
          Mengirim Jadwal ke Google Calendar
        </h2>

        <p className="text-[14px] text-[#717182] font-inter max-w-sm leading-relaxed">
          Tugas dan jadwal harian Anda sedang diproses, disinkronkan, dan
          dikirim secara real-time ke akun Google Anda. Mohon tunggu sebentar...
        </p>
      </div>
    </main>
  );
}
