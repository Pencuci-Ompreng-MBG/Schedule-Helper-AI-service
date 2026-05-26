"use client";

import { Loader2 } from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { ChatState } from "@/components/dashboard/ChatState";
import { StartState } from "@/components/dashboard/StartState";
import { SubmittingState } from "@/components/dashboard/SubmittingState";
import { SuccessState } from "@/components/dashboard/SuccessState";
import { useDemoChat } from "@/hooks/useDemoChat";
import { useSchedule } from "@/hooks/useSchedule";
import { authService } from "@/services/authService";

const inter = Inter({ subsets: ["latin"] });

const formatTimeRange = (startTime: string, durationMinutes: number) => {
  let hours: number | null = null;
  let minutes: number | null = null;

  const parsed = new Date(startTime);
  if (!Number.isNaN(parsed.getTime())) {
    hours = parsed.getHours();
    minutes = parsed.getMinutes();
  } else {
    const timePart = startTime.includes("T")
      ? startTime.split("T")[1]
      : startTime;
    const [rawHours, rawMinutes] = timePart.split(":");
    hours = Number(rawHours);
    minutes = Number(rawMinutes);
  }

  if (
    hours === null ||
    minutes === null ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return `${startTime} (${durationMinutes} min)`;
  }

  const startTotalMinutes = hours * 60 + minutes;
  const endTotalMinutes = startTotalMinutes + durationMinutes;
  const endHours = Math.floor(endTotalMinutes / 60) % 24;
  const endMinutes = endTotalMinutes % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)} - ${pad(endHours)}:${pad(endMinutes)}`;
};

function DemoClient() {
  const [demoUserLoading, setDemoUserLoading] = useState(true);
  const [energyLevel, setEnergyLevel] = useState<number>(50);
  const [mood, setMood] = useState<number>(50);

  // Inisialisasi Demo User secara otomatis di latar belakang
  useEffect(() => {
    const initDemoUser = async () => {
      const token = sessionStorage.getItem("app_token");
      if (token) {
        setDemoUserLoading(false);
        return;
      }

      const demoEmail = "demo@schedulehelper.com";
      const demoPassword = "DemoPassword123!";
      const demoName = "Demo User";

      try {
        await authService.login(demoEmail, demoPassword);
        console.log("Demo user logged in successfully.");
      } catch (e) {
        try {
          await authService.register(demoName, demoEmail, demoPassword);
          console.log("Demo user registered and logged in successfully.");
        } catch (regError) {
          console.error("Failed to initialize demo user:", regError);
        }
      } finally {
        setDemoUserLoading(false);
      }
    };

    initDemoUser();
  }, []);

  const {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    currentAgentStep,
    isSchedulingDone,
    scheduledEventCount,
    isStarted,
    messagesEndRef,
    handleSend,
    hitlPayload,
    resetChat,
    isLimitReached,
    messageCount,
  } = useDemoChat("demo@schedulehelper.com");

  const {
    availableTime,
    setAvailableTime,
    isDropdownOpen,
    setIsDropdownOpen,
    isAnalyzing,
    isResult,
    setIsResult,
    isEditingSchedule,
    setIsEditingSchedule,
    scheduleItems,
    setScheduleItems,
    isSubmittingToCalendar,
    setIsSubmittingToCalendar,
  } = useSchedule();

  // Mapping proposed_schedule dari NestJS ke UI
  useEffect(() => {
    if (hitlPayload?.type !== "task_review") return;
    if (!hitlPayload.proposed_schedule?.length) return;

    const mappedScheduleItems = hitlPayload.proposed_schedule.map(
      (scheduleItem: any) => {
        const blueprintTask: any =
          hitlPayload.tasks?.find(
            (t: any) => t.task_id === scheduleItem.task_id,
          ) || {};

        return {
          task_id: scheduleItem.task_id,
          title: blueprintTask.title || scheduleItem.task,
          priority: scheduleItem.priority,
          time: scheduleItem.start_time
            ? formatTimeRange(
                scheduleItem.start_time,
                scheduleItem.duration_minutes,
              )
            : "Belum dijadwalkan",
          start_time: scheduleItem.start_time,
          category: scheduleItem.category,
          subtasks: scheduleItem.subtasks || [],
          estimated_minutes: scheduleItem.duration_minutes,
          deadline: blueprintTask.deadline || null,
          preferred_window: blueprintTask.preferred_window || "bebas",
          is_locked_time: blueprintTask.is_locked_time || false,
          locked_start_time: blueprintTask.locked_start_time || null,
        };
      },
    );

    setScheduleItems(mappedScheduleItems);
  }, [hitlPayload, setScheduleItems]);

  const handleSendWrapper = async (
    e: FormEvent | null,
    resumeData?: any,
    questionnaireData?: any,
  ) => {
    const isApprove =
      resumeData && "approved" in resumeData && resumeData.approved === true;
    if (isApprove) {
      setIsSubmittingToCalendar(true);
    }

    try {
      await handleSend(e, resumeData, questionnaireData);
    } catch (error) {
      console.error("Gagal memproses pengiriman:", error);
    } finally {
      if (isApprove) {
        setIsSubmittingToCalendar(false);
      }
    }
  };

  if (demoUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#8A38F5] animate-spin" />
          <span className="text-sm text-gray-500 font-medium animate-pulse">
            Initializing Demo Session...
          </span>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return <SubmittingState />;
  }

  if (isSubmittingToCalendar) {
    return <SubmittingState />;
  }

  if (isSchedulingDone) {
    return (
      <SuccessState eventCount={scheduledEventCount} onReset={resetChat} />
    );
  }

  // Footer khusus jika limit chat tercapai
  const limitReachedFooter = (
    <div className="w-full flex justify-center p-6 border-t border-gray-100 bg-[#F9FAFB]">
      <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-6 w-full max-w-3xl text-center shadow-sm flex flex-col items-center gap-3">
        <div className="w-10 h-10 bg-[#F3E8FF] rounded-xl flex items-center justify-center">
          <img
            src="/images-homepage/AI%20Clarifies%20&%20Prioritizes.webp"
            alt="AI"
            className="w-5 h-5 object-contain animate-pulse"
          />
        </div>
        <h3 className="text-[18px] font-bold text-[#0A0A0A]">
          Demo Limit Reached
        </h3>
        <p className="text-[#717182] text-[13.5px] max-w-md leading-relaxed">
          Unlock unlimited conversations, history features, and full AI-powered
          Google Calendar scheduling by signing up for free.
        </p>
        <Link
          href="/auth/register"
          className="bg-[#8A38F5] text-white px-8 py-3 rounded-xl text-[14px] font-semibold hover:bg-[#7b32db] transition-all shadow-md mt-2"
        >
          Sign Up Free
        </Link>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen bg-white ${inter.className}`}>
      {/* HEADER */}
      <header className="px-8 py-5 flex justify-between items-center border-b border-gray-100 shrink-0 bg-white z-10 shadow-xs">
        <Link
          href="/"
          className="flex items-center gap-3 text-[15px] text-[#717182] hover:text-[#0A0A0A] transition-colors"
        >
          <img
            src="/images-button/Icon%20Back%20To%20Home.webp"
            alt="Back"
            className="w-5 h-5 object-contain"
          />
          Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-[#717182] font-semibold">
            Demo Mode
          </span>
          <div className="bg-[#D3C1FF] text-[#8A38F5] px-4 py-1.5 rounded-full text-[13px] font-semibold">
            {messageCount}/3 messages
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        {!isStarted ? (
          <StartState
            user={{ name: "Demo User", email: "demo@schedulehelper.com" }}
            isUserLoading={false}
            userInitial="D"
            inputValue={inputValue}
            setInputValue={setInputValue}
            isTyping={isTyping}
            handleSend={handleSendWrapper}
            energyLevel={energyLevel}
            setEnergyLevel={setEnergyLevel}
            mood={mood}
            setMood={setMood}
            availableTime={availableTime}
            setAvailableTime={setAvailableTime}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
          />
        ) : (
          <ChatState
            messages={messages}
            isTyping={isTyping}
            currentAgentStep={currentAgentStep}
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSend={handleSendWrapper}
            messagesEndRef={messagesEndRef}
            hitlPayload={hitlPayload}
            scheduleItems={scheduleItems}
            setScheduleItems={setScheduleItems}
            isEditingSchedule={isEditingSchedule}
            setIsEditingSchedule={setIsEditingSchedule}
            setIsResult={setIsResult}
            setIsAnalyzing={setIsResult}
            prioritizerTasks={
              hitlPayload?.type === "task_review"
                ? hitlPayload.tasks
                : undefined
            }
            footerOverride={isLimitReached ? limitReachedFooter : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[#8A38F5] animate-spin" />
            <span className="text-sm text-gray-500 font-medium animate-pulse">
              Loading Demo...
            </span>
          </div>
        </div>
      }
    >
      <DemoClient />
    </Suspense>
  );
}
