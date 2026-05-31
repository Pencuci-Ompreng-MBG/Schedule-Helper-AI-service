"use client";

import { type FormEvent, useEffect, useState } from "react";
import { AnalyzingState } from "@/components/dashboard/AnalyzingState";
import { ChatState } from "@/components/dashboard/ChatState";
import { StartState } from "@/components/dashboard/StartState";
import { SubmittingState } from "@/components/dashboard/SubmittingState";
import { SuccessState } from "@/components/dashboard/SuccessState";
import { type ResumeData, useChat } from "@/hooks/useChat";
import { useSchedule } from "@/hooks/useSchedule";
import { useUser } from "@/hooks/useUser";
import { CreateCalendarPayload, type QuestionnairePayload } from "@/types";
import { API_URL, getAppToken } from "@/utils/const";

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

export default function DashboardClient() {
  const { user, isUserLoading, userInitial } = useUser();
  const [energyLevel, setEnergyLevel] = useState<number>(50);
  const [mood, setMood] = useState<number>(50);
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
  } = useChat(user?.email);

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

  useEffect(() => {
    if (hitlPayload?.type !== "task_review") return;
    if (!hitlPayload.proposed_schedule?.length) return; // Patokannya dari proposed_schedule

    console.log("hitlPayload tasks: ", hitlPayload.tasks);
    console.log(
      "hitlPayload proposed_schedule: ",
      hitlPayload.proposed_schedule,
    );

    // Kita map dari proposed_schedule, lalu kita cari data blueprint pasangannya di array tasks
    const mappedScheduleItems = hitlPayload.proposed_schedule.map(
      (scheduleItem: any) => {
        // Cari blueprint task yang sesuai berdasarkan task_id
        const blueprintTask: any =
          hitlPayload.tasks?.find(
            (t: any) => t.task_id === scheduleItem.task_id,
          ) || {};

        return {
          task_id: scheduleItem.task_id,
          title: blueprintTask.title || scheduleItem.task, // Ambil title dari blueprint
          priority: scheduleItem.priority,
          // Bikin string jam "19:00 - 20:00"
          time: scheduleItem.start_time
            ? formatTimeRange(
                scheduleItem.start_time,
                scheduleItem.duration_minutes,
              )
            : "Belum dijadwalkan",
          start_time: scheduleItem.start_time, // Simpan format aslinya juga
          category: scheduleItem.category,
          subtasks: scheduleItem.subtasks || [],
          // Gabungkan data blueprint:
          estimated_minutes: scheduleItem.duration_minutes,
          deadline: blueprintTask.deadline || null,
          preferred_window: blueprintTask.preferred_window || "bebas",
          // Tambahan field untuk fitur lock jam spesifik yang baru kita buat
          is_locked_time: blueprintTask.is_locked_time || false,
          locked_start_time: blueprintTask.locked_start_time || null,
        };
      },
    );

    setScheduleItems(mappedScheduleItems);
  }, [hitlPayload, setScheduleItems]);
  useEffect(() => {
    console.log("Schedulet Items : ", scheduleItems);
  }, [scheduleItems]);

  const handleSendWrapper = async (
    e: FormEvent | null,
    resumeData?: ResumeData,
    questionnaireData?: QuestionnairePayload,
  ) => {
    const isApprove =
      resumeData && "approved" in resumeData && resumeData.approved === true;
    const isTaskReviewApprove = isApprove && hitlPayload?.type === "task_review";

    if (isTaskReviewApprove) {
      setIsSubmittingToCalendar(true);
    }

    try {
      await handleSend(e, resumeData, questionnaireData);
    } catch (error) {
      console.error("Gagal memproses pengiriman:", error);
    } finally {
      if (isTaskReviewApprove) {
        setIsSubmittingToCalendar(false);
      }
    }
  };

  if (isAnalyzing) {
    return <AnalyzingState />;
  }

  if (isSubmittingToCalendar) {
    return <SubmittingState />;
  }

  if (isSchedulingDone) {
    return (
      <SuccessState eventCount={scheduledEventCount} onReset={resetChat} />
    );
  }

  if (!isStarted) {
    return (
      <StartState
        user={user}
        isUserLoading={isUserLoading}
        userInitial={userInitial}
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
    );
  }

  return (
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
        hitlPayload?.type === "task_review" ? hitlPayload.tasks : undefined
      }
    />
  );
}
