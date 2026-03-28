export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Backend { success, token, name, email } veya { success, data: { token, name, email } } formatlarını destekler */
export interface AuthResponse {
  success: boolean;
  message?: string;
  // Flat format
  token?: string;
  userId?: string;
  email?: string;
  name?: string;
  // Nested format
  data?: {
    token?: string;
    accessToken?: string;
    userId?: string;
    email?: string;
    name?: string;
  };
}
