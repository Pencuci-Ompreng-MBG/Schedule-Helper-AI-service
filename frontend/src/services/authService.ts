import type { UserProfile } from "@/types";
import { API_URL } from "@/utils/const";
import {
  clearAuthSession,
  clearConversationStorage,
  saveUserToSession,
  setAuthCookieToken,
} from "@/lib/auth";
import { apiFetch } from "@/lib/apiFetch";

export const authService = {
  /**
   * Mengambil data profil user yang sedang login dari Backend.
   */
  async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await apiFetch(`${API_URL}/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();
      const userData: UserProfile = {
        name: data.name,
        email: data.email,
      };

      saveUserToSession(userData);
      return userData;
    } catch (error) {
      // Only attempt logout if we are actually in the browser
      if (typeof window !== "undefined") {
        this.logout();
      }
      throw error;
    }
  },

  /**
   * Menangani proses logout.
   */
  async logout(): Promise<void> {
    clearAuthSession();

    try {
      await apiFetch(`${API_URL}/auth/logout`, { method: "POST" });
    } catch (_e) {
      // Abaikan jika API gagal saat logout
    }
  },

  /**
   * Menangani proses login.
   */
  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Login failed");
    }

    const data = await response.json();
    if (data.access_token) {
      clearConversationStorage();
      setAuthCookieToken(data.access_token);
      await this.getCurrentUser();
    } else {
      throw new Error("Token not found in response");
    }
  },

  /**
   * Menangani proses registrasi akun baru.
   */
  async register(name: string, email: string, password: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Registration failed");
    }

    const data = await response.json();
    if (data.access_token) {
      clearConversationStorage();
      setAuthCookieToken(data.access_token);
      await this.getCurrentUser();
    } else {
      throw new Error("Token not found in response");
    }
  },

  /**
   * Menangani redirect OAuth (Google/etc).
   */
  async oauth(provider: string = "google"): Promise<void> {
    const response = await fetch(`${API_URL}/auth/${provider}`, { credentials: "include" });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "OAuth failed");
    }

    const data = await response.json();
    if (data.access_token) {
      setAuthCookieToken(data.access_token);
      await this.getCurrentUser();
    } else {
      throw new Error("Token not found in response");
    }
  },

  /**
   * Menyimpan data user secara manual ke storage.
   */
  saveUserToSession(user: UserProfile): void {
    saveUserToSession(user);
  },
};
