import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest, toQuery } from "@/lib/services/helpers";
import type { ApiResponse, AppNotification, NotificationCategory } from "@/lib/types";

export async function getNotifications(filter?: {
  unreadOnly?: boolean;
  category?: NotificationCategory | "all";
}): Promise<ApiResponse<AppNotification[]>> {
  return apiRequest<AppNotification[]>(`/api/notifications${toQuery({ ...filter })}`);
}

export async function getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
  return apiRequest<{ count: number }>("/api/notifications/unread-count");
}

export async function markNotificationRead(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/notifications/${id}`, {
    method: "PATCH",
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function markAllNotificationsRead(): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>("/api/notifications/read-all", {
    method: "POST",
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function deleteNotification(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/notifications/${id}`, {
    method: "DELETE",
  });
  if (res.ok) bumpApiVersion();
  return res;
}
