"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";

export type ThemePreference = "DARK" | "LIGHT" | "SYSTEM";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: "dark" | "light";
  setTheme: (next: ThemePreference, persistToApi?: boolean) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "DARK",
  resolvedTheme: "dark",
  setTheme: () => undefined,
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

function resolveMode(pref: ThemePreference): "dark" | "light" {
  if (pref === "DARK") return "dark";
  if (pref === "LIGHT") return "light";
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

function applyHtmlClass(mode: "dark" | "light") {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function subscribeTheme(cb: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", cb);
  window.addEventListener("nexora:theme-change", cb);
  media.addEventListener("change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("nexora:theme-change", cb);
    media.removeEventListener("change", cb);
  };
}

function getThemeSnapshot(): ThemePreference {
  const saved = window.localStorage.getItem("nexora_theme") as ThemePreference | null;
  return saved && ["DARK", "LIGHT", "SYSTEM"].includes(saved) ? saved : "DARK";
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 25_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const theme = React.useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => "DARK" as ThemePreference
  );
  const resolvedTheme = resolveMode(theme);

  React.useEffect(() => {
    applyHtmlClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: ThemePreference, persistToApi = false) => {
    window.localStorage.setItem("nexora_theme", next);
    applyHtmlClass(resolveMode(next));
    window.dispatchEvent(new Event("nexora:theme-change"));

    if (persistToApi) {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { theme: next } }),
      }).catch(() => undefined);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster
            richColors
            position="bottom-right"
            theme={resolvedTheme}
            toastOptions={{
              className: "rounded-xl border border-border-strong",
            }}
          />
        </MotionConfig>
      </QueryClientProvider>
    </ThemeContext.Provider>
  );
}
