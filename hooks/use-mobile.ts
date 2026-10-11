"use client";

import { useSyncExternalStore } from "react";

const widthListeners = new Set<() => void>();
let width = typeof window !== "undefined" ? window.innerWidth : 1024;

if (typeof window !== "undefined") {
  const onResize = () => {
    width = window.innerWidth;
    widthListeners.forEach((l) => l());
  };
  window.addEventListener("resize", onResize);
}

function subscribe(callback: () => void) {
  widthListeners.add(callback);
  return () => widthListeners.delete(callback);
}

function getSnapshot() {
  return width;
}

function getServerSnapshot() {
  return 1024;
}

export function useIsMobile(breakpoint = 768) {
  const w = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return w < breakpoint;
}

export function useBreakpoint() {
  const w = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (w < 640) return "xs" as const;
  if (w < 768) return "sm" as const;
  if (w < 1024) return "md" as const;
  if (w < 1280) return "lg" as const;
  return "xl" as const;
}
