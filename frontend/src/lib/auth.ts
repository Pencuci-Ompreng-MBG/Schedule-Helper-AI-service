import type { UserProfile } from "@/types";

export const AUTH_COOKIE_NAME = "cookie_token";

const USER_STORAGE_KEY = "app_user";
const CHAT_MESSAGES_KEY = "chat_messages";
const RAW_TASKS_KEY = "raw_tasks";

const isBrowser = () => typeof window !== "undefined";

const getCookieValue = (name: string) => {
  if (!isBrowser()) return null;

  const cookieEntry = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookieEntry) return null;

  const value = decodeURIComponent(cookieEntry.slice(name.length + 1));
  return value ? value : null;
};

export const getAuthCookieToken = () => getCookieValue(AUTH_COOKIE_NAME);

export const setAuthCookieToken = (token: string) => {
  if (!isBrowser()) return;

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`;
};

export const clearAuthCookieToken = () => {
  if (!isBrowser()) return;

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
};

export const saveUserToSession = (user: UserProfile) => {
  if (!isBrowser()) return;

  window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("user_updated"));
};

export const getStoredUser = () => {
  if (!isBrowser()) return null;

  const storedUser = window.sessionStorage.getItem(USER_STORAGE_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as UserProfile;
  } catch {
    return null;
  }
};

export const clearConversationStorage = () => {
  if (!isBrowser()) return;

  window.sessionStorage.removeItem(CHAT_MESSAGES_KEY);
  window.sessionStorage.removeItem(RAW_TASKS_KEY);
};

export const clearAuthSession = () => {
  if (!isBrowser()) return;

  clearAuthCookieToken();
  window.sessionStorage.removeItem("app_token");
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
  clearConversationStorage();
};
