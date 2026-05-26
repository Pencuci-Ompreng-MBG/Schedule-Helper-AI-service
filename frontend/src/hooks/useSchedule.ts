import { useState } from "react";
import { defaultScheduleItems } from "@/data/mockData";
import { scheduleService } from "@/services/scheduleService";
import { QuestionnairePayload, type ScheduleItem } from "@/types";

/**
 * Hook untuk mengelola state kuesioner dan hasil pembuatan jadwal.
 */
export function useSchedule() {
  const [availableTime, setAvailableTime] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Status States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResult, setIsResult] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [isSubmittingToCalendar, setIsSubmittingToCalendar] = useState(false);

  // Data States
  const [scheduleItems, setScheduleItems] =
    useState<ScheduleItem[]>(defaultScheduleItems);

  // const handleGenerateSchedule = async () => {
  //   setIsAnalyzing(true);

  //   try {
  //     const payload: QuestionnairePayload = { availableTime };
  //     const result = await scheduleService.generateSchedule(payload);

  //     // === INTEGRASI BE: Update state dengan data nyata dari response ===
  //     // setScheduleItems(result.timeline);

  //     setIsAnalyzing(false);
  //     setIsResult(true);
  //   } catch (error) {
  //     console.error("Failed to generate schedule:", error);
  //     setIsAnalyzing(false);
  //   }
  // };

  return {
    availableTime,
    setAvailableTime,
    isDropdownOpen,
    setIsDropdownOpen,

    // Status
    isAnalyzing,
    isResult,
    setIsResult,
    isEditingSchedule,
    setIsEditingSchedule,
    isSubmittingToCalendar,
    setIsSubmittingToCalendar,

    // Data
    scheduleItems,
    setScheduleItems,

    // Logic
    // handleGenerateSchedule
  };
}
