"use client";

import { useEffect, useState } from "react";
import { type ThemeMode } from "@/components/prompt-chain/shared";

const STORAGE_KEY = "prompt-chain-theme";

function applyTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const resolved = mode === "system" ? (mediaQuery.matches ? "dark" : "light") : mode;
  root.dataset.theme = resolved;
}

export function ThemeModeControl({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const current = window.localStorage.getItem(STORAGE_KEY);
      applyTheme(current === "light" || current === "dark" || current === "system" ? current : "system");
    };

    applyTheme(themeMode);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, themeMode);
    applyTheme(themeMode);
  }, [themeMode]);

  return (
    <label className={`themeControl${compact ? " themeControlCompact" : ""}${className ? ` ${className}` : ""}`}>
      <span className="themeControlLabel">Appearance</span>
      <select
        className="themeSelect"
        value={themeMode}
        onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
        aria-label="Appearance"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
