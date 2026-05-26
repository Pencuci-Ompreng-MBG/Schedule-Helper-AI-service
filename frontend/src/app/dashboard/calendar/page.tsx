"use client";

import {
  AlertCircle,
  CalendarDays,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Info,
  RotateCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { scheduleService } from "@/services/scheduleService";
import type { CalendarTask } from "@/types";

/**
 * CALENDAR PAGE
 * Menampilkan split view: Daftar jadwal AI di sebelah kiri
 * dan embed Google Calendar di sebelah kanan beserta tombol sinkronisasi.
 */
export default function CalendarPage() {
  const { user, isUserLoading } = useUser();
  const [tasks, setTasks] = useState<CalendarTask[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(
    {},
  );
  const [iframeKey, setIframeKey] = useState(0);

  // Load awal data tugas/jadwal
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await scheduleService.getCalendarTasks();
      setTasks(data);
    } catch (e) {
      console.error("Gagal memuat jadwal kalender:", e);
      setError(
        "Gagal memuat jadwal kalender. Pastikan koneksi dan token aktif.",
      );
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pemicu tombol Sync
  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      // Sync memicu sinkronisasi Google Calendar & Google Tasks di backend,
      // lalu mengembalikan daftar tugas terbaru yang tersimpan.
      const data = await scheduleService.getCalendarTasks();
      setTasks(data);
      setSyncSuccess(true);
      // Force reload Google Calendar iframe
      setIframeKey((prev) => prev + 1);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (e) {
      console.error("Gagal sinkronisasi kalender:", e);
      setError(
        "Gagal sinkronisasi dengan Google Calendar. Cek izin koneksi di backend.",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Format tanggal display (misal: "Selasa, 26 Mei 2026")
  const formatTaskDate = (dateStr?: string | null) => {
    if (!dateStr) return "Waktu belum diatur";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Format jam display (misal: "19:00 - 20:00")
  const formatTaskTime = (dateStr?: string | null, minutes?: number | null) => {
    if (!dateStr) return "";
    const startDate = new Date(dateStr);
    const startHour = startDate.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (minutes) {
      const endDate = new Date(startDate.getTime() + minutes * 60000);
      const endHour = endDate.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${startHour} - ${endHour}`;
    }
    return startHour;
  };

  // Google Calendar Iframe Source
  const userEmail = user?.email || "dipson@gmail.com";
  const calendarIframeUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(userEmail)}&ctz=Asia%2FJakarta&mode=MONTH`;

  return (
    <main className="flex-1 flex flex-col h-full bg-[#FFFFFF] overflow-y-auto">
      {/* Header Halaman */}
      <div className="px-8 pt-10 pb-6 shrink-0">
        <h1 className="text-[26px] font-semibold text-[#0A0A0A] mb-1">
          Calendar Schedule History
        </h1>
        <p className="text-[15px] text-[#717182]">
          View and manage your AI-generated schedules and calendar integrations
        </p>
      </div>

      <div className="flex-1 px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-w-[1500px]">
          {/* BAGIAN KIRI: Schedule List (5/12 cols) */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <h2 className="text-[18px] font-semibold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#8A38F5]" />
              AI Scheduled Tasks ({tasks?.length || 0})
            </h2>

            {/* Area List Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[700px] min-h-[400px]">
              {isLoading ? (
                // Skeleton Loader
                <>
                  {[1, 2, 3].map((skeleton) => (
                    <div
                      key={skeleton}
                      className="w-full bg-white border border-[#F3F4F6] rounded-[20px] p-6 animate-pulse flex flex-col gap-3 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3 mt-2"></div>
                    </div>
                  ))}
                </>
              ) : error ? (
                // Error State
                <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-red-200 rounded-[20px] bg-red-50/50">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-[14px] text-red-600 font-medium mb-3">
                    {error}
                  </p>
                  <button
                    onClick={() => loadData(true)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : tasks?.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center text-center py-20 px-8 border border-dashed border-gray-200 rounded-[24px] bg-gray-50/50">
                  <CalendarDays className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-[16px] font-semibold text-gray-700 mb-1">
                    Belum Ada Jadwal
                  </h3>
                  <p className="text-[14px] text-[#717182] max-w-sm">
                    Buat jadwal harianmu lewat dashboard AI chat dan setujui
                    untuk mensinkronisasikannya ke kalender.
                  </p>
                </div>
              ) : (
                // Task Cards
                tasks?.map((task) => {
                  const isExpanded = !!expandedTasks[task.id];
                  return (
                    <div
                      key={task.id}
                      className="bg-white border border-[#F3F4F6] rounded-[24px] p-6 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300"
                    >
                      {/* Top Header Card */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                          {task.category || "Task"}
                        </span>

                        <div className="flex gap-1.5 items-center">
                          {/* Priority Badge */}
                          <span
                            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                              task.priority === 1
                                ? "bg-red-50 text-red-600 border-red-100"
                                : task.priority === 2
                                  ? "bg-orange-50 text-orange-600 border-orange-100"
                                  : "bg-green-50 text-green-600 border-green-100"
                            }`}
                          >
                            {task.priority === 1
                              ? "Urgent"
                              : task.priority === 2
                                ? "Medium"
                                : "Low"}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                              task.status === "scheduled"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : task.status === "completed"
                                  ? "bg-blue-50 text-blue-600 border-blue-100"
                                  : "bg-amber-50 text-amber-600 border-amber-100"
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-[17px] font-bold text-[#0A0A0A] mb-1.5 leading-snug">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-[13px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Time Detail */}
                      <div className="flex flex-col gap-1.5 text-[13px] text-[#555566] border-t border-b border-[#F9FAFB] py-3 mb-3">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span>{formatTaskDate(task.startTime)}</span>
                        </div>
                        {task.startTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-slate-800">
                              {formatTaskTime(
                                task.startTime,
                                task.estimatedMinutes,
                              )}
                            </span>
                            {task.estimatedMinutes && (
                              <span className="text-gray-400">
                                ({task.estimatedMinutes} mins)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Google integrations status */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {task.googleEventId && (
                          <div className="bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Google Calendar Synced
                          </div>
                        )}
                        {task.googleTaskId && (
                          <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Google Tasks Synced
                          </div>
                        )}
                      </div>

                      {/* Subtasks Accordion Toggle */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleTaskExpand(task.id)}
                            className="flex items-center justify-between w-full text-left text-xs font-semibold text-[#8A38F5] hover:text-[#7021dc] transition-colors mt-2"
                          >
                            <span>
                              {isExpanded
                                ? "Hide Subtasks"
                                : `Show Subtasks (${task.subtasks.length})`}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 pl-2 border-l-2 border-gray-100 space-y-2 animate-fadeIn">
                              {task.subtasks.map((sub, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2.5"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="text-[13px] text-slate-700 leading-normal">
                                    {sub}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* BAGIAN KANAN: Google Calendar Embed & Sync (7/12 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <div className="bg-white border border-[#F3F4F6] rounded-[24px] p-6 shadow-sm flex flex-col h-full gap-5">
              {/* Box Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-[18px] font-bold text-[#0A0A0A]">
                    Google Calendar
                  </h2>
                  <p className="text-xs text-[#717182]">
                    Menampilkan sinkronisasi event real-time
                  </p>
                </div>

                {/* External link to Google Calendar */}
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#8A38F5] hover:underline"
                >
                  Buka Google Calendar
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* IFrame Google Calendar */}
              <div className="relative flex-1 bg-gray-50 border border-gray-100 rounded-[20px] overflow-hidden min-h-[500px] shadow-inner">
                {/* Loader Overlay when Syncing */}
                {isSyncing && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                    <RotateCw className="w-10 h-10 text-[#8A38F5] animate-spin" />
                    <span className="text-sm font-semibold text-slate-700">
                      Mensinkronisasikan Google Calendar...
                    </span>
                  </div>
                )}

                <iframe
                  key={iframeKey}
                  src={calendarIframeUrl}
                  style={{ border: 0 }}
                  className="w-full h-full"
                  frameBorder="0"
                  scrolling="no"
                ></iframe>
              </div>

              {/* Google Integration Help Text */}
              <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-gray-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-[#717182] leading-relaxed">
                  <strong>Penting:</strong> Pastikan Anda telah login ke akun
                  Google (<strong>{userEmail}</strong>) di browser ini agar
                  Google Calendar dapat ter-render dengan benar. Apabila
                  kalender tidak muncul, silakan klik tombol{" "}
                  <em>Buka Google Calendar</em> di atas untuk melakukan
                  otentikasi.
                </p>
              </div>

              {/* Action Sync Button */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`w-full max-w-md py-4 px-6 rounded-2xl font-semibold text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 ${
                    isSyncing
                      ? "bg-[#D3C1FF] text-white cursor-not-allowed"
                      : syncSuccess
                        ? "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-100"
                        : "bg-[#8A38F5] hover:bg-[#7021dc] shadow-md shadow-purple-100"
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <RotateCw className="w-5 h-5 animate-spin" />
                      Sedang Sinkronisasi...
                    </>
                  ) : syncSuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      Berhasil Disinkronisasikan!
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-5 h-5" />
                      Sync
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
