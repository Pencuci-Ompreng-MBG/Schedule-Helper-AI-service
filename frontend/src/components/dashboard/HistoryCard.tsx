import Link from "next/link";
import type { HistoryItem } from "@/types";

interface HistoryCardProps {
  item: HistoryItem;
}

/**
 * Komponen kartu untuk menampilkan satu item riwayat jadwal.
 * Saat diklik, navigasi ke /dashboard?thread_id={item.id} agar
 * useChat hook otomatis memuat percakapan tersebut.
 */
export function HistoryCard({ item }: HistoryCardProps) {
  return (
    <Link href={`/dashboard?thread_id=${item.id}`} className="block">
      <div className="w-full bg-white border border-[#F3F4F6] rounded-[16px] p-6 hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:border-[#D3C1FF] transition-all cursor-pointer flex flex-col gap-2.5 relative">
        <div className="absolute top-6 right-6 bg-[#D3C1FF] text-[#8A38F5] px-4 py-1 rounded-full text-[13px] font-medium tracking-wide">
          {item.status}
        </div>
        <h3 className="text-[17px] font-bold text-[#0A0A0A] pr-32">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-[14px] text-[#717182]">
          <img
            src="/images-history/Date.webp"
            alt="Date"
            className="w-[18px] h-[18px] object-contain"
          />
          <span>{item.date}</span>
        </div>
      </div>
    </Link>
  );
}
