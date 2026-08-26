"use client";

import { useEffect, useState } from "react";

const ZOOM_STEPS = [90, 100, 110, 125, 150, 175, 200] as const;
const THEME_KEY = "praja-theme";
const ZOOM_KEY = "praja-text-scale";

type Theme = "light" | "dark";

function nearestZoom(value: number) {
  return ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - value) < Math.abs(best - value) ? step : best,
  );
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode */
  }
}

function applyZoom(zoom: number) {
  const next = nearestZoom(zoom);
  document.documentElement.dataset.textScale = String(next);
  document.documentElement.style.setProperty("--text-scale", String(next / 100));
  try {
    localStorage.setItem(ZOOM_KEY, String(next));
  } catch {
    /* private mode */
  }
  return next;
}

function SunMoonIcon({ dark }: { dark: boolean }) {
  return (
    <svg aria-hidden="true" className={dark ? "is-dark" : undefined} fill="none" viewBox="0 0 24 24">
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
  );
}

export default function AccessibilityControls() {
  const [theme, setTheme] = useState<Theme>("light");
  const [zoom, setZoom] = useState(100);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const currentZoom = nearestZoom(Number(document.documentElement.dataset.textScale || 100));
    setTheme(currentTheme);
    setZoom(currentZoom);
    setReady(true);
  }, []);

  function setNextTheme() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  function setNextZoom(direction: -1 | 0 | 1) {
    const index = ZOOM_STEPS.indexOf(nearestZoom(zoom) as (typeof ZOOM_STEPS)[number]);
    const nextIndex = direction === 0 ? ZOOM_STEPS.indexOf(100) : Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction));
    const next = ZOOM_STEPS[nextIndex];
    setZoom(applyZoom(next));
  }

  const dark = theme === "dark";
  const minZoom = zoom <= ZOOM_STEPS[0];
  const maxZoom = zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1];

  return (
    <div className="a11y-dock">
      <div className="a11y-zoom" role="group" aria-label="Text size">
        <button
          aria-label="Decrease text size"
          disabled={!ready || minZoom}
          onClick={() => setNextZoom(-1)}
          type="button"
        >
          −
        </button>
        <button
          aria-label={`Text size ${zoom} percent. Reset to default`}
          className="a11y-zoom-value"
          onClick={() => setNextZoom(0)}
          type="button"
        >
          {zoom}%
        </button>
        <button
          aria-label="Increase text size"
          disabled={!ready || maxZoom}
          onClick={() => setNextZoom(1)}
          type="button"
        >
          +
        </button>
      </div>

      <button
        aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"}
        aria-pressed={dark}
        className="a11y-theme"
        onClick={setNextTheme}
        type="button"
      >
        <SunMoonIcon dark={dark} />
        <span className="a11y-theme-label">{dark ? "Light" : "Dark"}</span>
      </button>

      <span className="sr-only" aria-live="polite">
        {ready ? `${dark ? "Dark" : "Light"} appearance. Text size ${zoom} percent.` : ""}
      </span>
    </div>
  );
}
