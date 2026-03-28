"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark = stored !== "light";
    setIsDark(dark);
    applyTheme(dark);
  }, []);

  function applyTheme(dark: boolean) {
    const html = document.documentElement;
    html.setAttribute("data-theme", dark ? "dark" : "light");
    html.classList.toggle("dark", dark);
  }

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
      className="relative flex-shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95"
      style={{ width: 44, height: 26 }}
      suppressHydrationWarning
    >
      {/* Track */}
      <span
        className="absolute inset-0 rounded-full transition-all duration-300 shadow-md"
        style={{
          background: isDark
            ? "linear-gradient(90deg, #7c3aed, #3b82f6)"
            : "linear-gradient(90deg, #a78bfa, #60a5fa)",
          boxShadow: isDark
            ? "0 0 8px rgba(124,58,237,0.5)"
            : "0 0 8px rgba(167,139,250,0.4)",
        }}
      />
      {/* Thumb */}
      <span
        className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 flex items-center justify-center"
        style={{ left: isDark ? "calc(100% - 23px)" : "3px" }}
      >
        {/* Icon inside thumb */}
        {isDark ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </span>
    </button>
  );
}
