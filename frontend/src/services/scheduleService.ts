import type {
  CalendarTask,
  HistoryItem,
  QuestionnairePayload,
  ScheduleItem,
} from "@/types";
import { API_URL, getAppToken } from "@/utils/const";

// =============================================================
// SCHEDULE SERVICE: Mengelola pembuatan jadwal dan riwayat
// =============================================================

// Tipe response Session dari backend GET /api/agent
interface BackendSession {
  id: string;
  userId: string;
  latestIntent: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: number;
    sessionId: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

/**
 * Ekstrak pesan asli user dari konten yang mungkin mengandung prefix USER STATE.
 * Format dari buildUserContent():
 *   "USER STATE: {...}\nwith Energy level: ...\nUSER MESSAGES: <pesan asli>"
 * Jika tidak ada prefix tersebut, kembalikan konten apa adanya.
 */
function extractUserMessage(content: string): string {
  const marker = "USER MESSAGES:";
  const idx = content.indexOf(marker);
  if (idx !== -1) {
    return content.slice(idx + marker.length).trim();
  }
  return content.trim();
}

/**
 * Mapping dari BackendSession ke HistoryItem untuk ditampilkan di UI.
 * - title    : pesan asli user (setelah strip USER STATE prefix), fallback ke intent
 * - date     : format dari updatedAt
 * - status   : langsung dari session.status
 * - priorities & quickWins : belum ada di backend, default 0
 */
function mapSessionToHistoryItem(session: BackendSession): HistoryItem {
  const firstUserMessage = session.messages.find((m) => m.role === "user");
  const rawContent = firstUserMessage?.content ?? "";
  const extracted = rawContent
    ? extractUserMessage(rawContent)
    : (session.latestIntent ?? "Untitled Session");

  const title =
    extracted.length > 80 ? extracted.slice(0, 77) + "..." : extracted;

  // Format tanggal: "26 May 2026, 16:49"
  const date = new Date(session.updatedAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Capitalize status untuk tampilan
  const statusLabel =
    session.status === "waiting_hitl"
      ? "Waiting"
      : session.status.charAt(0).toUpperCase() + session.status.slice(1);

  return {
    id: session.id,
    title,
    date,
    priorities: 0,
    quickWins: 0,
    status: statusLabel,
  };
}

export const scheduleService = {
  /**
   * Mengirim data kuesioner ke AI untuk menghasilkan jadwal baru.
   * (Belum terintegrasi — masih simulasi)
   */
  async generateSchedule(payload: QuestionnairePayload): Promise<{
    scheduleId: string;
    topPriorities: any[];
    quickWins: any[];
    timeline: ScheduleItem[];
    reasoning: string;
  }> {
    console.log("Generating schedule with payload:", payload);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return {
      scheduleId: "new-schedule-id-" + Date.now(),
      topPriorities: [],
      quickWins: [],
      timeline: [],
      reasoning: "Based on your current state, I've optimized your schedule...",
    };
  },

  /**
   * Mengambil daftar riwayat chat session milik user yang sedang login.
   * Terintegrasi dengan GET /api/agent
   */
  async getHistory(): Promise<HistoryItem[]> {
    const token = getAppToken();

    if (!token) {
      console.warn("[scheduleService.getHistory] No auth token found.");
      return [];
    }

    const response = await fetch(`${API_URL}/agent`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[scheduleService.getHistory] Failed: ${response.status} ${response.statusText}`,
      );
      throw new Error(`Gagal mengambil riwayat: ${response.statusText}`);
    }

    const sessions: BackendSession[] = await response.json();
    return sessions.map(mapSessionToHistoryItem);
  },

  /**
   * Mengambil detail satu sesi berdasarkan thread_id.
   * Terintegrasi dengan GET /api/agent/:thread_id
   */
  async getScheduleById(id: string): Promise<any> {
    const token = getAppToken();

    if (!token) {
      console.warn("[scheduleService.getScheduleById] No auth token found.");
      return null;
    }

    const response = await fetch(`${API_URL}/agent/${id}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[scheduleService.getScheduleById] Failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    return response.json();
  },

  /**
   * Mengambil daftar tugas/jadwal yang terintegrasi dengan kalender.
   * Terintegrasi dengan GET /api/calendar
   */
  async getCalendarTasks(): Promise<CalendarTask[]> {
    const token = getAppToken();

    if (!token) {
      console.warn("[scheduleService.getCalendarTasks] No auth token found.");
      return [];
    }

    const response = await fetch(`${API_URL}/calendar`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[scheduleService.getCalendarTasks] Failed: ${response.status} ${response.statusText}`,
      );
      throw new Error(
        `Gagal sinkronisasi data kalender: ${response.statusText}`,
      );
    }

    return response.json();
  },

  /**
   * Memperbarui tugas kalender (contoh: mengubah status menjadi completed).
   * Terintegrasi dengan PATCH /api/calendar/:id
   */
  async updateCalendarTask(id: string, payload: any): Promise<any> {
    const token = getAppToken();

    if (!token) {
      console.warn("[scheduleService.updateCalendarTask] No auth token found.");
      return null;
    }

    const response = await fetch(`${API_URL}/calendar/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[scheduleService.updateCalendarTask] Failed: ${response.status} ${response.statusText}`,
      );
      throw new Error(`Gagal memperbarui tugas: ${response.statusText}`);
    }

    return response.json();
  },
};
