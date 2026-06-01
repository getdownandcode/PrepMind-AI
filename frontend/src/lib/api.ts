/**
 * Typed API client. Handles auth header injection and token refresh on 401.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(a: string | null, r: string | null) {
  accessToken = a;
  refreshToken = r;
  if (typeof window !== "undefined") {
    if (a) localStorage.setItem("pm_access", a);
    else localStorage.removeItem("pm_access");
    if (r) localStorage.setItem("pm_refresh", r);
    else localStorage.removeItem("pm_refresh");
  }
}

export function loadTokens() {
  if (typeof window === "undefined") return;
  accessToken = localStorage.getItem("pm_access");
  refreshToken = localStorage.getItem("pm_refresh");
}

loadTokens();

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function refreshAccess(): Promise<boolean> {
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
  options: { retryOn401?: boolean } = { retryOn401: true },
): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  if (!headers.has("content-type") && init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && options.retryOn401 && refreshToken) {
    const ok = await refreshAccess();
    if (ok) return api<T>(path, init, { retryOn401: false });
  }

  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ||
      `Request failed: ${res.status}`;
    throw new ApiError(res.status, body, message);
  }
  return body as T;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export { ApiError };
