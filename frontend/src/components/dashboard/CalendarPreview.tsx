import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Blueprint } from "./resultStateTypes";
import { DEFAULT_TASK } from "./resultStateUtils";

interface CalendarPreviewProps {
  blueprints: Blueprint[];
  timeLabel: string;
  subtasks: string[];
  blueprintAvailable: boolean;
}

export function CalendarPreview({
  blueprints,
  timeLabel,
  subtasks,
  blueprintAvailable,
}: CalendarPreviewProps) {
  const [displayedData, setDisplayedData] = useState<Blueprint[]>([]);
  const [dates, setDates] = useState<string[]>([""]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  useEffect(() => {
    const extractedDates = blueprints?.map(
      (blueprint) => blueprint.specific_start_time.date,
    );
    const uniqueDates = [...new Set(extractedDates)];

    setDates(uniqueDates);
  }, [blueprints]);

  useEffect(() => {
    if (!dates.length) return;

    const currentDate = dates[currentDateIndex];

    const filteredData = blueprints?.filter(
      (blueprint) => blueprint.specific_start_time.date === currentDate,
    );

    setDisplayedData(filteredData);
  }, [currentDateIndex, dates, blueprints]);

  const handlePrev = () => {
    setCurrentDateIndex((prev) => (prev > 0 ? prev - 1 : prev));
    console.log(displayedData);
  };

  const handleNext = () => {
    setCurrentDateIndex((prev) => (prev < dates.length - 1 ? prev + 1 : prev));
  };
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 h-fit">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CalendarDays size={18} className="text-emerald-600" />
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">Draft Kalender</h2>

          <p className="text-sm text-slate-400">Visualisasi jadwal</p>
        </div>
      </div>
      {blueprintAvailable ? (
        <div className="flex h-full text-3xl text-center justify-center items-center">
          <span>Belum ada tugas yang ditambahkan</span>
        </div>
      ) : (
        <>
          <div className="h-14 border border-slate-200 rounded-2xl px-4 flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-slate-500" />

              <span className="font-medium text-slate-700">
                {displayedData?.[0]?.specific_start_time?.date
                  ? new Date(
                      displayedData[0].specific_start_time.date,
                    ).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1">
                {/* prev */}
                {currentDateIndex > 0 ? (
                  <button
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                    onClick={handlePrev}
                  >
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <div className="w-8 h-8" />
                )}

                {/* next */}
                {currentDateIndex < dates.length - 1 ? (
                  <button
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                    onClick={handleNext}
                  >
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <div className="w-8 h-8" />
                )}
              </div>
            </div>
          </div>

          {displayedData?.map((data, i) => (
            <div key={i} className="relative pl-8">
              <div className="absolute left-1.75 top-2 bottom-0 w-px bg-slate-200"></div>

              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white"></div>

              <div className="pb-8">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-2">
                  <Clock size={16} />

                  <span>
                    {data.isSpecificTime
                      ? `${data.specific_start_time} - Selesai`
                      : data.time}
                  </span>

                  <span
                    className={`ml-2 text-xs ${data.priority === 1 ? "bg-red-50 text-red-600" : data.priority === 2 ? "bg-orange-50  text-orange-600" : "bg-green-50  text-green-600"}  px-2 py-1 rounded-full font-medium`}
                  >
                    {data.priority === 1
                      ? "Sangat Penting"
                      : data.priority === 2
                        ? "Penting"
                        : "Biasa"}
                  </span>
                </div>

                <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                  {data.title}
                </h3>

                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/70">
                  <h4 className="font-medium text-slate-800 mb-4">Subtasks</h4>

                  <div className="space-y-3">
                    {data.subtasks.map((subtask, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle2
                          size={16}
                          className="text-indigo-500 shrink-0"
                        />

                        <span className="text-sm text-slate-600 flex-1">
                          {subtask}
                        </span>

                        <button className="text-slate-400 hover:text-slate-600">
                          <Pencil size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {i === displayedData.length - 1 && (
                <div className="relative pb-2">
                  <div className="absolute -left-[30.5px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></div>

                  <p className="text-sm text-slate-400">Sisa waktu luang...</p>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
