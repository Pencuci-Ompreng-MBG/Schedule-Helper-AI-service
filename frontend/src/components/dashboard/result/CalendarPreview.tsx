import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ProposedSchedule } from "@/hooks/useChat"; // Import dari lokasi yg benar

interface CalendarPreviewProps {
  proposedSchedule?: ProposedSchedule[];
}

const mappingPriority = (priority:number)=> {
  if(priority===1) return "sangat penting"
  if(priority===2) return "penting"
  if(priority===3) return "biasa"
}
export function CalendarPreview({
  proposedSchedule = [],
}: CalendarPreviewProps) {
  const [displayedData, setDisplayedData] = useState<ProposedSchedule[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  useEffect(() => {
    // Kumpulkan tanggal unik dari start_time "2026-05-13T19:00:00"
    const extractedDates = proposedSchedule
      .map((s) => s.start_time?.split("T")[0])
      .filter(Boolean) as string[];

    const uniqueDates = [...new Set(extractedDates)].sort(); // Urutkan tgl
    setDates(uniqueDates);
    setCurrentDateIndex(0);
  }, [proposedSchedule]);

  useEffect(() => {
    if (!dates.length) {
      setDisplayedData([]);
      return;
    }
    const currentDate = dates[currentDateIndex];
    // Filter jadwal berdasarkan tanggal yg aktif
    const filteredData = proposedSchedule.filter(
      (s) => s.start_time?.split("T")[0] === currentDate,
    );
    setDisplayedData(filteredData);
  }, [currentDateIndex, dates, proposedSchedule]);

  const handlePrev = () => setCurrentDateIndex((p) => Math.max(0, p - 1));
  const handleNext = () =>
    setCurrentDateIndex((p) => Math.min(dates.length - 1, p + 1));

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 h-fit max-h-[65vh] overflow-y-auto scrollbar-thin z-10 sticky -top-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CalendarDays size={18} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Draft Kalender</h2>
          <p className="text-sm text-slate-400">Visualisasi hasil AI</p>
        </div>
      </div>

      {proposedSchedule.length === 0 ? (
        <div className="flex h-40 text-lg text-slate-400 text-center justify-center items-center">
          <span>Draft jadwal sedang dihitung...</span>
        </div>
      ) : (
        <>
          <div className="h-14 border border-slate-200 rounded-2xl px-4 flex items-center justify-between mb-5 bg-slate-50">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-slate-500" />
              <span className="font-medium text-slate-700">
                {dates[currentDateIndex]
                  ? new Date(dates[currentDateIndex]).toLocaleDateString(
                      "id-ID",
                      {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      },
                    )
                  : "-"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${currentDateIndex > 0 ? "hover:bg-slate-200 text-slate-700" : "text-slate-300 cursor-not-allowed"}`}
                onClick={handlePrev}
                disabled={currentDateIndex === 0}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${currentDateIndex < dates.length - 1 ? "hover:bg-slate-200 text-slate-700" : "text-slate-300 cursor-not-allowed"}`}
                onClick={handleNext}
                disabled={currentDateIndex === dates.length - 1}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {displayedData.map((data, i) => {
            const timeStr =
              data.start_time?.split("T")[1]?.substring(0, 5) || "??:??";
            const startDate = new Date(data.start_time);

            const endDate = new Date(
              startDate.getTime() + data.duration_minutes * 60 * 1000,
            );

            const endTime = endDate.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });

            return (
              <div key={i} className="relative pl-8 mb-6">
                <div className="absolute left-1.5 top-2 bottom-[-24px] w-0.5 bg-slate-200"></div>
                <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white"></div>

                <div className="pb-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
                    <div>
                      <div className="flex justify-center items-center gap-2">
                        <Clock size={16} />
                        <span>{timeStr} - {endTime}</span>
                      </div>
                      <span className="text-slate-400 font-medium ml-1 text-sm">
                        ({data.duration_minutes} menit)
                      </span>
                    </div>

                    <span
                      className={`ml-auto text-xs px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider ${data.priority === 1 ? "bg-red-100 text-red-600" : data.priority === 2 ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"}`}
                    >
                      {mappingPriority(data.priority)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-3">
                    {data.task}
                  </h3>

                  {data.subtasks && data.subtasks.length > 0 && (
                    <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
                      <div className="space-y-2.5">
                        {data.subtasks.map((subtask, index) => (
                          <div key={index} className="flex items-start gap-2.5">
                            <CheckCircle2
                              size={16}
                              className="text-emerald-500 shrink-0 mt-0.5"
                            />
                            <span className="text-sm text-slate-600 leading-snug">
                              {subtask}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
