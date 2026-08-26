"use client";

import { useEffect, useRef } from "react";

const STEPS = [90, 100, 125, 150, 175];
const NAMES = ["Smaller", "Default", "Large", "Larger", "Largest"];

function nearestIndex(zoom: number) {
  return STEPS.reduce((best, step, index) =>
    Math.abs(step - zoom) < Math.abs(STEPS[best] - zoom) ? index : best,
  1);
}

export default function AccessibilityControls() {
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => {
      const slider = sliderRef.current;
      if (!slider) return;
      const zoom = parseInt(document.documentElement.dataset.textScale || "100", 10);
      const index = nearestIndex(Number.isNaN(zoom) ? 100 : zoom);
      slider.value = String(index);
      slider.setAttribute("aria-valuetext", NAMES[index]);
    };
    sync();
    window.addEventListener("praja-prefs", sync);
    return () => window.removeEventListener("praja-prefs", sync);
  }, []);

  return (
    <div className="a11y-dock">
      <div className="a11y-zoom">
        <span className="a11y-zoom-min" aria-hidden="true">A</span>
        <input
          aria-label="Text size"
          aria-valuetext="Default"
          className="a11y-zoom-slider"
          defaultValue="1"
          max="4"
          min="0"
          ref={sliderRef}
          step="1"
          suppressHydrationWarning
          type="range"
        />
        <span className="a11y-zoom-max" aria-hidden="true">A</span>
      </div>

      <button
        aria-label="Switch to dark appearance"
        aria-pressed="false"
        className="a11y-theme"
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

      <span className="sr-only" aria-live="polite" suppressHydrationWarning />
    </div>
  );
}
