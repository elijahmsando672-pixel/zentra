"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { ApiResponse } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Refresh dependent API queries after a successful mutation.          */
/* ------------------------------------------------------------------ */

let apiVersion = 0;
const listeners = new Set<() => void>();

export function bumpApiVersion() {
  apiVersion += 1;
  listeners.forEach((l) => l());
}

function subscribeApi(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getApiVersion() {
  return apiVersion;
}

export function useApiVersion() {
  return useSyncExternalStore(subscribeApi, getApiVersion, () => 0);
}

/* ------------------------------------------------------------------ */
/* useApiQuery — typed query helper for the Zentra API.                */
/* ------------------------------------------------------------------ */

export function useApiQuery<T>(
  key: unknown[],
  queryFn: () => Promise<ApiResponse<T>>,
  options?: Omit<UseQueryOptions<ApiResponse<T>, Error, T, unknown[]>, "queryKey" | "queryFn">
) {
  const version = useApiVersion();
  return useQuery<ApiResponse<T>, Error, T, unknown[]>({
    queryKey: [...key, version],
    queryFn,
    select: (result) => {
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    ...options,
  });
}

/* ------------------------------------------------------------------ */
/* Generic list-loading helper for API resources.                     */
/* ------------------------------------------------------------------ */

export function useApiResource<T>(fetcher: () => Promise<ApiResponse<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetcher();
    if (res.ok) {
      setData(res.data);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, [fetcher]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
