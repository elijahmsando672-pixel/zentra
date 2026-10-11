import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest } from "@/lib/services/helpers";
import type { ApiResponse, SupportTicket } from "@/lib/types";

export async function getSupportTickets(): Promise<ApiResponse<SupportTicket[]>> {
  return apiRequest<SupportTicket[]>("/api/support/tickets");
}

export async function getTicketById(id: string): Promise<ApiResponse<SupportTicket>> {
  return apiRequest<SupportTicket>(`/api/support/tickets/${id}`);
}

export interface CreateTicketInput {
  subject: string;
  category: SupportTicket["category"];
  priority: SupportTicket["priority"];
  message: string;
}

export async function createTicket(input: CreateTicketInput): Promise<ApiResponse<SupportTicket>> {
  const res = await apiRequest<SupportTicket>("/api/support/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function replyToTicket(id: string, body: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/support/tickets/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function rateTicket(id: string, rating: 1 | 2 | 3 | 4 | 5): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/support/tickets/${id}/rate`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function closeTicket(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/support/tickets/${id}/close`, { method: "POST" });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function getAdminSupportTickets(): Promise<ApiResponse<SupportTicket[]>> {
  return apiRequest<SupportTicket[]>("/api/admin/tickets");
}

export async function adminReplyToTicket(id: string, body: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/admin/tickets/${id}`, { method: "POST", body: JSON.stringify({ message: body }) });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function adminCloseTicket(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/admin/tickets/${id}`, { method: "POST", body: JSON.stringify({ action: "close" }) });
  if (res.ok) bumpApiVersion();
  return res;
}
