"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themeLabels = {
  system: "Automático",
  light: "Claro",
  dark: "Escuro",
} as const;

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const selectedTheme = mounted && theme && Object.prototype.hasOwnProperty.call(themeLabels, theme)
    ? theme as keyof typeof themeLabels
    : "system";
  const Icon = selectedTheme === "dark" ? Moon : selectedTheme === "light" ? Sun : Monitor;

  return (
    <label className="theme-control">
      <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
      <span className="sr-only">Tema da interface</span>
      <select
        aria-label="Tema da interface"
        data-testid="theme-select"
        disabled={!mounted}
        onChange={(event) => setTheme(event.currentTarget.value)}
        value={selectedTheme}
      >
        {Object.entries(themeLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </label>
  );
}
