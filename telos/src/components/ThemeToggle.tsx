import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "telos-theme";

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const stored = document.documentElement.getAttribute("data-theme");
  if (stored === "light" || stored === "dark") return stored;
  return systemTheme();
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        // Storage can be unavailable; follow the system setting instead.
      }
      const next: Theme = event.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      setTheme(next);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting the preference is optional.
    }
  };

  const label =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      className="btn btn-plain btn-sm theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
