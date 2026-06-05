"use client";

import { Check, ExternalLink, Info, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CalendarTaskList } from "@/components/dashboard/calendar/CalendarTaskList";
import { useCalendarTasks } from "@/hooks/useCalendarTasks";
import { useUser } from "@/hooks/useUser";

/**
 * CALENDAR PAGE
 * Menampilkan split view: daftar jadwal AI di sebelah kiri dan embed Google Calendar di sebelah kanan.
 */
export default function CalendarPage() {
  const { user } = useUser();
  const {
    tasks,
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
    loadMoreRef,
    handleSync,
    handleToggleMainTask,
    updatingTaskId,
    refreshTasks,
  } = useCalendarTasks();

  const [iframeKey, setIframeKey] = useState(0);
  const [_iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeTimeout, setIframeTimeout] = useState(false);
  const iframeLoadedRef = useRef(false);
  const loadTimer = useRef<number | null>(null);

  useEffect(() => {
    setIframeLoaded(false);
    iframeLoadedRef.current = false;
    setIframeTimeout(false);

    if (loadTimer.current) {
      window.clearTimeout(loadTimer.current);
      loadTimer.current = null;
    }

    loadTimer.current = window.setTimeout(() => {
      if (!iframeLoadedRef.current) {
        setIframeTimeout(true);
      }
    }, 5000);

    return () => {
      if (loadTimer.current) {
        window.clearTimeout(loadTimer.current);
        loadTimer.current = null;
      }
    };
  }, []);

  const userEmail = user?.email;
  const calendarIframeUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(userEmail ?? "")}&ctz=Asia%2FJakarta&mode=MONTH`;

  const handleReloadIframe = () => {
    setIframeKey((current) => current + 1);
    setIframeTimeout(false);
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-[#FFFFFF] overflow-y-auto">
      <div className="px-8 pt-10 pb-6 shrink-0">
        <h1 className="text-[26px] font-semibold text-[#0A0A0A] mb-1">
          Calendar Schedule History
        </h1>
        <p className="text-[15px] text-[#717182]">
          View and manage your AI-generated schedules and calendar integrations
        </p>
      </div>

      <div className="flex-1 px-8 pb-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full w-full">
          <CalendarTaskList
            tasks={tasks}
            categories={categories}
            selectedCategory={selectedCategory}
            completionFilter={completionFilter}
            searchInput={searchInput}
            totalCount={totalCount}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            isCategoriesLoading={isCategoriesLoading}
            error={error}
            hasMore={hasMore}
            onCategoryChange={setSelectedCategory}
            onCompletionChange={setCompletionFilter}
            onSearchChange={setSearchInput}
            onRetry={refreshTasks}
            onToggleMainTask={handleToggleMainTask}
            updatingTaskId={updatingTaskId}
            loadMoreRef={loadMoreRef}
          />

          <div className="lg:col-span-7 flex flex-col h-full">
            <div className="bg-white border border-[#F3F4F6] rounded-3xl p-6 shadow-sm flex flex-col h-full gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-[18px] font-bold text-[#0A0A0A]">
                    Google Calendar
                  </h2>
                  <p className="text-xs text-[#717182]">
                    Menampilkan sinkronisasi event real-time
                  </p>
                </div>

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

              <div className="relative flex-1 bg-gray-50 border border-gray-100 rounded-[20px] overflow-hidden min-h-125 shadow-inner">
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
                  onLoad={() => {
                    setIframeLoaded(true);
                    iframeLoadedRef.current = true;
                    setIframeTimeout(false);

                    if (loadTimer.current) {
                      window.clearTimeout(loadTimer.current);
                      loadTimer.current = null;
                    }
                  }}
                />

                {iframeTimeout && (
                  <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="text-lg font-semibold text-[#0A0A0A]">
                      Tidak dapat memuat Google Calendar
                    </div>
                    <p className="text-sm text-[#717182] max-w-md">
                      Google Calendar tidak tampil karena Anda belum login ke
                      akun Google di browser ini, kalender bersifat privat, atau
                      browser memblokir cookie lintas-site.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => window.open(calendarIframeUrl, "_blank")}
                        className="px-4 py-2 bg-white border rounded-xl text-sm font-semibold hover:bg-gray-50"
                      >
                        Buka di Tab Baru
                      </button>
                      <button
                        onClick={() => {
                          const apiBase = (
                            process.env.NEXT_PUBLIC_API_URL ||
                            "http://localhost:3000/api"
                          ).replace(/\/api$/, "");
                          window.location.href = `${apiBase}/auth/google`;
                        }}
                        className="px-4 py-2 bg-[#8A38F5] text-white rounded-xl text-sm font-semibold hover:bg-[#7021dc]"
                      >
                        Login dengan Google
                      </button>
                      <button
                        onClick={handleReloadIframe}
                        className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-semibold hover:bg-gray-200"
                      >
                        Coba Ulang
                      </button>
                    </div>
                  </div>
                )}
              </div>

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

              <div className="pt-2 flex justify-center">
                <button
                  onClick={async () => {
                    await handleSync();
                    setIframeKey((current) => current + 1);
                  }}
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
