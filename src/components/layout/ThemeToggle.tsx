"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <span className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      title={theme === "light" ? "Mudar para tema escuro" : "Mudar para tema claro"}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 transition-transform rotate-0 scale-100" />
      ) : (
        <Sun className="h-4 w-4 transition-transform rotate-0 scale-100" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
