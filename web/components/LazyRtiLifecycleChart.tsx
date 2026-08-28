"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Chart = dynamic(() => import("@/components/RtiLifecycleChart"), {
  loading: () => <div aria-hidden="true" className="rti-chart rti-chart-skeleton" />,
});

/** Loads the interactive map only when it is about to enter the viewport. */
export default function LazyRtiLifecycleChart() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  // ponytail: no hash special case. #rti-lifecycle scrolls to the section this
  // sits in, so the observer below already fires on its first callback.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShow(true);
        observer.disconnect();
      },
      { rootMargin: "280px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{show ? <Chart /> : <div aria-hidden="true" className="rti-chart rti-chart-skeleton" />}</div>;
}
