import { api } from "@/lib/utils/api";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@/lib/types/auth";

export const authService = {
  register(payload: RegisterRequest): Promise<AuthResponse> {
    return api.post<AuthResponse>("/api/users/register", payload, false);
  },

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/users/login", payload, false);
    if (process.env.NODE_ENV === "development") {
      console.log("[auth] login response:", JSON.stringify(res));
    }
    return res;
  },
};
