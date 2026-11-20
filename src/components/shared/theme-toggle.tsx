"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ persist = false }: { persist?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    const next = resolvedTheme === "dark" ? "LIGHT" : "DARK";
    setTheme(next, persist);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={resolvedTheme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
      title={resolvedTheme === "dark" ? "Thème clair" : "Thème sombre"}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-violet-600" />
      )}
    </Button>
  );
}
