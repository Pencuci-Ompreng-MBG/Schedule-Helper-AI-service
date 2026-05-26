"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { QuestionnairePayload } from "@/types";
import { type ResumeData, useChat } from "./useChat";

/**
 * HOOK: Mengelola logika percakapan khusus untuk halaman DEMO.
 * Membungkus fungsionalitas useChat secara internal dan menambahkan pembatasan 3 pesan.
 */
export function useDemoChat(userEmail?: string) {
  const chat = useChat(userEmail);
  const [isLimitReached, setIsLimitReached] = useState(false);

  // Menghitung jumlah pesan user aktif
  const userMessages = chat.messages.filter((m) => m.role === "user");
  const messageCount = userMessages.length;

  useEffect(() => {
    // Batasan maksimal 3 pesan dari user
    if (messageCount >= 3) {
      setIsLimitReached(true);
    } else {
      setIsLimitReached(false);
    }
  }, [messageCount]);

  const handleSend = async (
    e: FormEvent | null,
    resumeData?: ResumeData,
    questionnaireData?: QuestionnairePayload,
  ) => {
    // Cegah pengiriman jika limit sudah tercapai (kecuali input berasal dari tombol persetujuan HITL/Resume)
    if (messageCount >= 3 && !resumeData) {
      setIsLimitReached(true);
      return;
    }

    await chat.handleSend(e, resumeData, questionnaireData);
  };

  return {
    ...chat,
    handleSend,
    isLimitReached,
    messageCount,
  };
}
