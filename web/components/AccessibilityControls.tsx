"use client";

import { useEffect, useState } from "react";

const STEPS = [90, 100, 125, 150, 175];
const NAMES = ["Smaller", "Default", "Large", "Larger", "Largest"];

function nearestIndex(zoom: number) {
  return STEPS.reduce(
    (best, step, index) =>
      Math.abs(step - zoom) < Math.abs(STEPS[best] - zoom) ? index : best,
    1
  );
}

function getZoomFill(index: number) {
  return `${(index / (STEPS.length - 1)) * 100}%`;
}

export default function AccessibilityControls() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [zoomIndex, setZoomIndex] = useState<number>(1);
  const [announcement, setAnnouncement] = useState<string>("");

  useEffect(() => {
    const syncFromDOM = () => {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light";
      const currentZoom = parseInt(
        document.documentElement.getAttribute("data-text-scale") || "100",
        10
      );
      const index = nearestIndex(
        Number.isNaN(currentZoom) ? 100 : currentZoom
      );
      setTheme(currentTheme);
      setZoomIndex(index);
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
      `${NAMES[zoomIndex]} text size. ${nextTheme === "dark" ? "Dark" : "Light"} appearance.`
    );
    try {
      window.dispatchEvent(new Event("praja-prefs"));
    } catch {}
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIdx = Math.max(
      0,
      Math.min(STEPS.length - 1, parseInt(e.target.value, 10) || 1)
    );
    setZoomIndex(newIdx);
    const zoom = STEPS[newIdx];
    document.documentElement.setAttribute("data-text-scale", String(zoom));
    document.documentElement.style.setProperty("--text-scale", String(zoom / 100));
    document.documentElement.style.setProperty("--zoom-fill", getZoomFill(newIdx));
    try {
      localStorage.setItem("praja-text-scale", String(zoom));
    } catch {}
    setAnnouncement(
      `${NAMES[newIdx]} text size. ${theme === "dark" ? "Dark" : "Light"} appearance.`
    );
    try {
      window.dispatchEvent(new Event("praja-prefs"));
    } catch {}
  };

  return (
    <div className="a11y-dock">
      <div className="a11y-zoom">
        <span className="a11y-zoom-min" aria-hidden="true">
          A
        </span>
        <input
          aria-label="Text size"
          aria-valuetext={NAMES[zoomIndex]}
          className="a11y-zoom-slider"
          max="4"
          min="0"
          onChange={handleZoomChange}
          step="1"
          suppressHydrationWarning
          type="range"
          value={zoomIndex}
        />
        <span className="a11y-zoom-max" aria-hidden="true">
          A
        </span>
      </div>

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
