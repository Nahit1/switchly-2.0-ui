const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://46.62.219.92:8080";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function buildHeaders(auth = false): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, init: RequestInit, auth = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...buildHeaders(auth), ...(init.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Bir hata oluştu.");
  return data as T;
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
};
