"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** Toggles + persists the light/dark theme on <html data-theme>. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("atelier-theme", next);
    } catch {
      /* ignore storage failures */
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="shell-theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
