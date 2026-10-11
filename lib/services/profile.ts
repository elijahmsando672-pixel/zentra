import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest } from "@/lib/services/helpers";
import type { ApiResponse, DeviceSession, User } from "@/lib/types";

export async function getProfile(): Promise<ApiResponse<User>> {
  return apiRequest<User>("/api/profile");
}

export interface UpdateProfileInput {
  fullName?: string;
  email?: string;
  notificationPreferences?: Partial<User["notificationPreferences"]>;
}

export async function updateProfile(input: UpdateProfileInput): Promise<ApiResponse<User>> {
  const res = await apiRequest<User>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function getSessions(): Promise<ApiResponse<DeviceSession[]>> {
  return apiRequest<DeviceSession[]>("/api/profile/sessions");
}

export async function revokeSession(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/profile/sessions/${id}`, {
    method: "POST",
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function revokeAllSessions(): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>("/api/profile/sessions/revoke-all", {
    method: "POST",
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function changePassword(
  current: string,
  next: string
): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>("/api/profile/password", {
    method: "POST",
    body: JSON.stringify({ current, next }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function setTransactionPin(
  newPin: string,
  currentPin?: string
): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>("/api/profile/pin", {
    method: "POST",
    body: JSON.stringify({ newPin, currentPin }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function toggleTwoFactor(enabled: boolean): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>("/api/profile/two-factor", {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function uploadVerificationDocument(
  kind: "id" | "selfie" | "proof"
): Promise<ApiResponse<{ status: "pending"; maskedHint: string }>> {
  const res = await apiRequest<{ status: "pending"; maskedHint: string }>(
    "/api/profile/verification",
    { method: "POST", body: JSON.stringify({ kind }) }
  );
  if (res.ok) bumpApiVersion();
  return res;
}

export async function getAccountActivitySummary() {
  return apiRequest<{
    joinedAt: string;
    lastLoginAt: string;
    lastLoginIp: string;
    device: string;
    maskedPhone: string;
    maskedEmail: string;
    totalInvestments: number;
    totalTransactions: number;
    openTickets: number;
  }>("/api/profile/activity");
}
