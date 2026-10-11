import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest } from "@/lib/services/helpers";
import type { Announcement, ApiResponse } from "@/lib/types";

export async function getAnnouncements(): Promise<ApiResponse<Announcement[]>> {
  return apiRequest<Announcement[]>("/api/admin/announcements");
}

export async function publishAnnouncement(input: { title:string; body:string; severity:Announcement["severity"]; audience?:string }): Promise<ApiResponse<Announcement>> {
  const res=await apiRequest<Announcement>("/api/admin/announcements",{method:"POST",body:JSON.stringify(input)});
  if(res.ok)bumpApiVersion();
  return res;
}

export async function deleteAnnouncement(id:string): Promise<ApiResponse<{done:true}>> {
  const res=await apiRequest<{done:true}>(`/api/admin/announcements/${encodeURIComponent(id)}`,{method:"DELETE"});
  if(res.ok)bumpApiVersion();
  return res;
}
