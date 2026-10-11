"use client";

import * as React from "react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const KEY = "zentra-theme";

function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(KEY) as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let current: Theme = "light";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function apply(theme: Theme) {
  current = theme;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* noop */
  }
  emit();
}

// Apply stored theme ASAP
if (typeof window !== "undefined") {
  current = getTheme();
  document.documentElement.classList.toggle("dark", current === "dark");
  document.documentElement.style.colorScheme = current;
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => "light" as Theme
  );

  return {
    theme,
    toggleTheme: () => apply(current === "dark" ? "light" : "dark"),
    setTheme: (t: Theme) => apply(t),
  };
}
