"use client";

import { useEffect, useState } from "react";

/* ============================================================
   Appearance toggle only. There is deliberately no in-page
   text-size slider: the browser's own zoom (Cmd/Ctrl + and −)
   scales the whole layout better than any per-site control.
   ============================================================ */

export default function AccessibilityControls() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [announcement, setAnnouncement] = useState<string>("");

  useEffect(() => {
    const syncFromDOM = () => {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";
      setTheme(currentTheme);
    };

    syncFromDOM();
    window.addEventListener("praja-prefs", syncFromDOM);
    return () => window.removeEventListener("praja-prefs", syncFromDOM);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("praja-theme", nextTheme);
    } catch {}
    setAnnouncement(
      `${nextTheme === "dark" ? "Dark" : "Light"} appearance.`
    );
    try {
      window.dispatchEvent(new Event("praja-prefs"));
    } catch {}
  };

  return (
    <div className="a11y-dock">
      <button
        aria-label={
          theme === "dark"
            ? "Switch to light appearance"
            : "Switch to dark appearance"
        }
        aria-pressed={theme === "dark"}
        className="a11y-theme"
        onClick={toggleTheme}
        suppressHydrationWarning
        type="button"
      >
        <svg aria-hidden="true" className="theme-ico" fill="none" viewBox="0 0 24 24">
          <g className="sun-g" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7">
            <circle cx="12" cy="12" fill="currentColor" r="4.2" stroke="none" />
            <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.4 5.4l1.6 1.6M17 17l1.6 1.6M5.4 18.6l1.6-1.6M17 7l1.6-1.6" />
          </g>
          <path
            className="moon-g"
            d="M20.2 13.4A8.4 8.4 0 1 1 10.6 3.8a6.8 6.8 0 0 0 9.6 9.6Z"
            fill="currentColor"
          />
        </svg>
        <span className="a11y-theme-label a11y-theme-on-light">Dark</span>
        <span className="a11y-theme-label a11y-theme-on-dark">Light</span>
      </button>

      <span className="sr-only" aria-live="polite" suppressHydrationWarning>
        {announcement}
      </span>
    </div>
  );
}
