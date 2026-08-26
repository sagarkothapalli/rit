"use client";

import { useEffect } from "react";

export default function RevealObserver() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    if (reduceMotion || sections.length === 0) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12%", threshold: 0.12 },
    );

    sections.forEach((section) => {
      const bounds = section.getBoundingClientRect();
      if (bounds.top < window.innerHeight * 0.88) section.classList.add("is-visible");
      else observer.observe(section);
    });

    document.documentElement.classList.add("reveal-observer-ready");
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("reveal-observer-ready");
    };
  }, []);

  return null;
}
