"use client";

import { useSyncExternalStore } from "react";

export type AppTheme = "dark" | "light";

function getClientTheme(): AppTheme {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function subscribe(onChange: () => void) {
  const el = document.documentElement;
  const observer = new MutationObserver(onChange);
  observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/**
 * Tracks `html[data-theme]` for live theme toggles; `serverTheme` matches SSR/hydration.
 */
export function useDataTheme(serverTheme: AppTheme): AppTheme {
  return useSyncExternalStore(subscribe, getClientTheme, () => serverTheme);
}
