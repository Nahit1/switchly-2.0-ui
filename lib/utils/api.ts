const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function buildHeaders(auth: boolean): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function request<T>(path: string, init: RequestInit, auth: boolean): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...buildHeaders(auth), ...(init.headers ?? {}) },
  });

  // 401 on an authenticated call = stale/invalid token → bounce to login.
  // For pre-auth calls (login/register) a 401 means bad credentials, surface normally.
  if (res.status === 401 && auth) {
    handleUnauthorized();
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }

  // Empty body (204 No Content veya 0 length) için JSON parse yapmıyoruz.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.message ?? "Bir hata oluştu.");
  return data as T;
}

export const api = {
  get: <T>(path: string, auth = true) =>
    request<T>(path, { method: "GET" }, auth),
  post: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, auth),
  put: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }, auth),
  patch: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, auth),
  delete: <T>(path: string, auth = true) =>
    request<T>(path, { method: "DELETE" }, auth),
};
