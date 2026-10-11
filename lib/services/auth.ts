import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest } from "@/lib/services/helpers";
import type { ApiResponse, User } from "@/lib/types";

export interface RegisterInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  inviteCode?: string;
}

export async function registerUser(
  input: RegisterInput
): Promise<ApiResponse<{ user: User; verificationRequired: true }>> {
  const res = await apiRequest<{ user: User; verificationRequired: true }>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify(input) }
  );
  if (res.ok) bumpApiVersion();
  return res;
}

export async function login(
  identifier: string,
  password: string
): Promise<ApiResponse<{ user: User; demoHint?: string }>> {
  const res = await apiRequest<{ user: User; demoHint?: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function logout(): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>("/api/auth/logout", { method: "POST" });
  bumpApiVersion();
  return res;
}

export async function requestOtp(
  target: string
): Promise<ApiResponse<{ channel: string; demoCode: string }>> {
  return apiRequest<{ channel: string; demoCode: string }>("/api/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ target }),
  });
}

export async function verifyOtp(
  target: string,
  code: string
): Promise<ApiResponse<{ verified: true }>> {
  const res = await apiRequest<{ verified: true }>("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ target, code }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function resetPassword(
  target: string,
  newPassword: string
): Promise<ApiResponse<{ done: true }>> {
  return apiRequest<{ done: true }>("/api/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ target, newPassword }),
  });
}

export async function getSession(): Promise<
  ApiResponse<{ authed: boolean; adminAuthed: boolean; user: User | null }>
> {
  return apiRequest<{ authed: boolean; adminAuthed: boolean; user: User | null }>(
    "/api/auth/session"
  );
}

/* ------------------------------------------------------------------ */
export async function adminLogin(
  identifier: string,
  password: string
): Promise<ApiResponse<{ ok: true; staffName: string }>> {
  const res = await apiRequest<{ ok: true; staffName: string }>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: identifier, password }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function adminLogout(): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>("/api/admin/auth/logout", { method: "POST" });
  bumpApiVersion();
  return res;
}
