"use client";
import { useEffect, useState } from "react";

type DocVT = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const flip = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("praja-theme", next);
      } catch {
        /* private mode */
      }
      setTheme(next);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as DocVT;

    if (!reduce && typeof doc.startViewTransition === "function") {
      const x = e.clientX;
      const y = e.clientY;
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );
      const vt = doc.startViewTransition(apply);
      vt.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 600,
              easing: "cubic-bezier(0.33, 1, 0.68, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {});
    } else {
      apply();
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Day desk" : "Night desk"}
      className="grid place-items-center size-9 rounded-full border border-[var(--line-strong)] bg-[var(--glass)] backdrop-blur text-[var(--fg-soft)] hover:text-[var(--fg)] hover:border-[var(--iris)]/50 active:scale-90 transition-all duration-200"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={`theme-ico${theme === "dark" ? " is-dark" : ""}`}
        fill="none"
      >
        <g className="sun-g" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.4" fill="currentColor" stroke="none" />
          <line x1="12" y1="2.2" x2="12" y2="4.6" />
          <line x1="12" y1="19.4" x2="12" y2="21.8" />
          <line x1="2.2" y1="12" x2="4.6" y2="12" />
          <line x1="19.4" y1="12" x2="21.8" y2="12" />
          <line x1="5.1" y1="5.1" x2="6.8" y2="6.8" />
          <line x1="17.2" y1="17.2" x2="18.9" y2="18.9" />
          <line x1="5.1" y1="18.9" x2="6.8" y2="17.2" />
          <line x1="17.2" y1="6.8" x2="18.9" y2="5.1" />
        </g>
        <g className="moon-g">
          <path
            d="M20.6 13.6A8.6 8.6 0 1 1 10.4 3.4a7 7 0 0 0 10.2 10.2z"
            fill="currentColor"
          />
        </g>
      </svg>
    </button>
  );
}
