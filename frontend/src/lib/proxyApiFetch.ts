const PROXY_BASE = "/api/proxy";

export function buildProxyPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PROXY_BASE}${normalizedPath}`;
}

export async function proxyApiFetch(path: string, init: RequestInit = {}) {
  return fetch(buildProxyPath(path), {
    ...init,
    credentials: "include",
  });
}
