import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAuthCookieToken } from "../../src/lib/auth";
import { authService } from "../../src/services/authService";

const fetchMock = vi.fn();

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

globalThis.fetch = fetchMock as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
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

describe("authService cookie auth", () => {
  it("stores the auth cookie and loads the user after login", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "Raka", email: "raka@mail.com" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    window.sessionStorage.setItem("chat_messages", "[]");
    window.sessionStorage.setItem("raw_tasks", "[]");

    await authService.login("raka@mail.com", "secret");

    expect(document.cookie).toContain("cookie_token=token-123");
    expect(window.sessionStorage.getItem("chat_messages")).toBeNull();
    expect(window.sessionStorage.getItem("raw_tasks")).toBeNull();
    expect(window.sessionStorage.getItem("app_user")).toBe(
      JSON.stringify({ name: "Raka", email: "raka@mail.com" }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/proxy/users/me",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("loads the current user without requiring a bearer token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: "Demo", email: "demo@mail.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    setAuthCookieToken("token-abc");

    const user = await authService.getCurrentUser();

    expect(user).toEqual({ name: "Demo", email: "demo@mail.com" });
    expect(window.sessionStorage.getItem("app_user")).toBe(
      JSON.stringify({ name: "Demo", email: "demo@mail.com" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/proxy/users/me",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});