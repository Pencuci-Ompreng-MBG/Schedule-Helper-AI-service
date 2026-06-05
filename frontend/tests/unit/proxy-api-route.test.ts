import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../src/app/api/proxy/[...path]/route";

const fetchMock = vi.fn();

globalThis.fetch = fetchMock as typeof fetch;

describe("proxy api route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("forwards the frontend cookie to the backend", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ name: "Raka" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new Request("http://localhost:3001/api/proxy/users/me", {
      method: "GET",
      headers: {
        cookie: "cookie_token=token-xyz",
      },
    });

    const response = await GET(request as never, {
      params: Promise.resolve({ path: ["users", "me"] }),
    } as never);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/users/me",
      expect.objectContaining({
        method: "GET",
      }),
    );

    const backendInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(backendInit?.headers).toBeInstanceOf(Headers);
    expect((backendInit?.headers as Headers).get("cookie")).toBe(
      "cookie_token=token-xyz",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ name: "Raka" });
  });
});