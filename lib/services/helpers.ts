import { sleep } from "@/lib/utils";
import type { ApiError, ApiResponse, ApiResult, Paginated } from "@/lib/types";

/**
 * Thin fetch wrapper around Zentra route handlers.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    const res = await fetch(path, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers,
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (res.status === 401 && !json.ok) {
      const staffArea = path.startsWith("/api/admin/");
      return {
        ...json,
        message: staffArea ? "Your Zentra staff session has expired. Sign in again to continue." : "Your Zentra session has expired. Sign in again to continue.",
        code: "unauthorized",
      };
    }
    return json;
  } catch {
    return fail("We could not reach the Zentra servers. Please try again.", "network_error");
  }
}

export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const NETWORK_DELAY = { min: 350, max: 900 } as const;

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail(message: string, code?: string, fieldErrors?: Record<string, string>): ApiError {
  return { ok: false, message, code, fieldErrors };
}

export async function simulateNetwork<T>(data: T, delayMs?: number): Promise<ApiResult<T>> {
  const [min, max] = [NETWORK_DELAY.min, NETWORK_DELAY.max];
  const ms = delayMs ?? Math.floor(Math.random() * (max - min + 1)) + min;
  await sleep(ms);
  return ok(data);
}

export function paginate<T>(items: T[], page = 1, pageSize = 10): Paginated<T> {
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    total: items.length,
    page,
    pageSize,
    hasMore: start + pageSize < items.length,
  };
}

export function round2(value: number) {
  return Number(value.toFixed(2));
}
