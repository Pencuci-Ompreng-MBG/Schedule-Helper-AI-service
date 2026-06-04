import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAuthSession,
  clearConversationStorage,
  getAuthCookieToken,
  getStoredUser,
  saveUserToSession,
  setAuthCookieToken,
} from "../../src/lib/auth";

const storage = (() => {
  let entries = new Map<string, string>();

  return {
    getItem(key: string) {
      return entries.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      entries.set(key, value);
    },
    removeItem(key: string) {
      entries.delete(key);
    },
    clear() {
      entries = new Map();
    },
  };
})();

type TestWindow = {
  location: { protocol: string };
  sessionStorage: typeof storage;
  dispatchEvent: () => boolean;
};

type TestDocument = { cookie: string };

beforeEach(() => {
  storage.clear();
  const globals = globalThis as unknown as {
    window: TestWindow;
    document: TestDocument;
  };

  globals.window = {
    location: { protocol: "http:" },
    sessionStorage: storage,
    dispatchEvent: () => true,
  };
  globals.document = { cookie: "" };
});

describe("auth helpers", () => {
  it("reads and clears the auth cookie", () => {
    setAuthCookieToken("cookie-value");

    expect(getAuthCookieToken()).toBe("cookie-value");

    clearAuthSession();

    expect(getAuthCookieToken()).toBeNull();
  });

  it("persists user data and shared conversation storage", () => {
    saveUserToSession({ name: "User", email: "user@mail.com" });
    window.sessionStorage.setItem("chat_messages", "[]");
    window.sessionStorage.setItem("raw_tasks", "[]");

    expect(getStoredUser()).toEqual({ name: "User", email: "user@mail.com" });

    clearConversationStorage();

    expect(window.sessionStorage.getItem("chat_messages")).toBeNull();
    expect(window.sessionStorage.getItem("raw_tasks")).toBeNull();

    clearAuthSession();
    expect(window.sessionStorage.getItem("app_user")).toBeNull();
  });
});