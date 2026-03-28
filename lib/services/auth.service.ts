import type { AuthResponse, LoginRequest, RegisterRequest } from "@/lib/types/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://46.62.219.92:8080";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message ?? "Bir hata oluştu.");
  }

  return data as T;
}

export const authService = {
  async register(payload: RegisterRequest): Promise<AuthResponse> {
    return post<AuthResponse>("/api/users/register", payload);
  },

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await post<AuthResponse>("/api/users/login", payload);
    if (process.env.NODE_ENV === "development") {
      console.log("[auth] login response:", JSON.stringify(res));
    }
    return res;
  },
};
