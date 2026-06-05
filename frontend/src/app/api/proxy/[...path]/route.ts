import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

const BACKEND_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function getCookieFromHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const cookieEntry = cookieHeader
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookieEntry) return null;

  const value = decodeURIComponent(cookieEntry.slice(name.length + 1));
  return value || null;
}

async function proxyToBackend(
  req: NextRequest,
  pathSegments: string[],
  method: string,
) {
  const backendUrl = new URL(BACKEND_API_BASE);
  const backendPath = `/${pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  backendUrl.pathname = `${backendUrl.pathname.replace(/\/$/, "")}${backendPath}`;
  const requestUrl = "nextUrl" in req && req.nextUrl ? req.nextUrl : new URL(req.url);
  backendUrl.search = requestUrl.search;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers.set("authorization", authHeader);
  }

  const cookieToken =
    "cookies" in req && req.cookies
      ? req.cookies.get(AUTH_COOKIE_NAME)?.value ?? null
      : getCookieFromHeader(req.headers.get("cookie"), AUTH_COOKIE_NAME);
  if (cookieToken) {
    headers.set("cookie", `${AUTH_COOKIE_NAME}=${cookieToken}`);
  }

  const body = method === "GET" || method === "HEAD" ? undefined : await req.text();

  const response = await fetch(backendUrl.toString(), {
    method,
    headers,
    body,
  });

  const responseHeaders = new Headers();
  const responseContentType = response.headers.get("content-type");
  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  const cacheControl = response.headers.get("cache-control");
  if (cacheControl) {
    responseHeaders.set("cache-control", cacheControl);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToBackend(req, path, "GET");
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToBackend(req, path, "POST");
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToBackend(req, path, "PATCH");
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToBackend(req, path, "PUT");
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyToBackend(req, path, "DELETE");
}