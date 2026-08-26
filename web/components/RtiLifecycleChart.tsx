"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ANNOTS,
  EDGES,
  LANES,
  LEGEND,
  LIST_SUMMARY,
  NODES,
  NODE_BY_ID,
  SPLIT_Y,
  VIEW,
  lightFrom,
  nodeAnnouncement,
  type FlowNode,
} from "@/lib/rti-lifecycle";

function nodeClass(kind: FlowNode["kind"]): string {
  return `rti-node rti-node-${kind}`;
}

function NodeGraphic({ node }: { node: FlowNode }) {
  const x = node.x - node.w / 2;
  const y = node.y - node.h / 2;

  if (node.kind === "join") {
    const r = 18;
    return (
      <>
        <polygon
          className="rti-shape"
          points={`${node.x},${node.y - r} ${node.x + r},${node.y} ${node.x},${node.y + r} ${node.x - r},${node.y}`}
        />
        <text className="rti-label" textAnchor="middle" x={node.x} y={node.y + 4}>
          AND
        </text>
      </>
    );
  }

  const rx = node.kind === "time" ? node.h / 2 : 8;

  return (
    <>
      <rect className="rti-shape" height={node.h} rx={rx} width={node.w} x={x} y={y} />
      {node.kind === "time" ? (
        <text className="rti-label" textAnchor="middle" x={node.x} y={node.y + 5}>
          <tspan className="rti-time-num">{node.label}</tspan>
          <tspan className="rti-time-unit" dx="6">
            {node.sub}
          </tspan>
        </text>
      ) : node.lines ? (
        <text className="rti-label" textAnchor="middle" x={node.x} y={node.y - 6}>
          {node.lines.map((line) => (
            <tspan dy={line === node.lines![0] ? 0 : 16} key={line} x={node.x}>
              {line}
            </tspan>
          ))}
        </text>
      ) : node.kind === "start" ? (
        <>
          <text className="rti-label" textAnchor="middle" x={node.x} y={node.y - 4}>
            {node.label}
          </text>
          <text className="rti-sub" textAnchor="middle" x={node.x} y={node.y + 16}>
            {node.sub}
          </text>
        </>
      ) : (
        <text className="rti-label" textAnchor="middle" x={node.x} y={node.y + 5}>
          {node.label}
        </text>
      )}
    </>
  );
}

function nodeIdFromTarget(target: EventTarget | null): string | null {
  const el = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return el?.closest("[data-node]")?.getAttribute("data-node") ?? null;
}

export default function RtiLifecycleChart() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeId = hovered ?? pinned;
  const lit = useMemo(() => (activeId ? lightFrom(activeId) : null), [activeId]);
  const active = activeId ? NODE_BY_ID[activeId] : null;
  const nextNodes = lit ? lit.next.map((id) => NODE_BY_ID[id]).filter(Boolean) : [];

  useEffect(() => {
    const shell = viewportRef.current;
    if (!shell) return;
    const viewport: HTMLDivElement = shell;
    viewport.dataset.interactive = "true";

    function frameStart() {
      const svg = viewport.querySelector("svg");
      if (!svg) return;
      const scale = svg.getBoundingClientRect().width / VIEW.w;
      const target = NODE_BY_ID.start.x * scale - viewport.clientWidth / 2;
      viewport.scrollLeft = Math.max(0, Math.min(target, viewport.scrollWidth - viewport.clientWidth));
    }

    function onMove(event: PointerEvent | MouseEvent) {
      if ("pointerType" in event && event.pointerType === "touch") return;
      const id = nodeIdFromTarget(event.target);
      setHovered((current) => (current === id ? current : id));
    }

    function onLeave() {
      setHovered(null);
    }

    function onClick(event: MouseEvent) {
      const id = nodeIdFromTarget(event.target);
      if (id) setPinned((current) => (current === id ? null : id));
      else setPinned(null);
    }

    const ready = window.requestAnimationFrame(() => frameStart());
    let userPanned = false;
    const onScroll = () => {
      userPanned = true;
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    const resize = new ResizeObserver(() => {
      if (!userPanned) frameStart();
    });
    resize.observe(viewport);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("mousemove", onMove);
    viewport.addEventListener("pointerleave", onLeave);
    viewport.addEventListener("mouseleave", onLeave);
    viewport.addEventListener("click", onClick);
    return () => {
      window.cancelAnimationFrame(ready);
      resize.disconnect();
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("mousemove", onMove);
      viewport.removeEventListener("pointerleave", onLeave);
      viewport.removeEventListener("mouseleave", onLeave);
      viewport.removeEventListener("click", onClick);
    };
  }, []);

  function handleKey(event: KeyboardEvent<SVGGElement>, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPinned((current) => (current === id ? null : id));
    }
    if (event.key === "Escape") {
      setPinned(null);
      setHovered(null);
    }
  }

  return (
    <div className={`rti-chart${lit ? " is-tracing" : ""}`}>
      <div className="rti-chart-toolbar">
        <p className="rti-chart-hint">The map opens on the RTI request. Swipe to see the other branches, and tap a step to pin its path.</p>
        <ul className="rti-legend">
          {LEGEND.map((item) => (
            <li key={item.id}>
              <i aria-hidden="true" className={`rti-swatch rti-swatch-${item.id}`} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="rti-chart-viewport" ref={viewportRef}>
        <svg
          aria-describedby="rti-chart-dock"
          aria-label="Interactive RTI request lifecycle. Hover or focus a step to light that block and the next connected stages."
          fontFamily="inherit"
          role="group"
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        >
          <defs>
            <marker id="rti-arrow" markerHeight="11" markerWidth="11" orient="auto" refX="10" refY="6" viewBox="0 0 12 12">
              <path d="M1 1.6 L11 6 L1 10.4 Z" fill="var(--chart-line)" />
            </marker>
            <marker id="rti-arrow-live" markerHeight="11" markerWidth="11" orient="auto" refX="10" refY="6" viewBox="0 0 12 12">
              <path d="M1 1.6 L11 6 L1 10.4 Z" fill="var(--navy)" />
            </marker>
          </defs>

          {LANES.map((lane) => (
            <g key={lane.id}>
              <rect className={`rti-lane rti-lane-${lane.id}`} height={lane.h} width={VIEW.w} x={0} y={lane.y} />
              <text className="rti-lane-label" x="18" y={lane.y + 22}>
                {lane.label}
              </text>
            </g>
          ))}

          <g className="rti-edges">
            {EDGES.map((item) => {
              const state = !lit ? "idle" : lit.edges.has(item.id) ? "live" : "dim";
              return (
                <path
                  className={`rti-edge is-${state}`}
                  d={item.d}
                  fill="none"
                  key={item.id}
                  markerEnd={item.arrow === false ? undefined : state === "live" ? "url(#rti-arrow-live)" : "url(#rti-arrow)"}
                />
              );
            })}
            <circle
              className={`rti-split-dot${
                lit && (lit.edges.has("e-decision-satisfiedFaa") || lit.edges.has("e-decision-notSatFaa"))
                  ? " is-live"
                  : lit
                    ? " is-dim"
                    : ""
              }`}
              cx={NODE_BY_ID.decision.x}
              cy={SPLIT_Y}
              r="5.5"
            />
          </g>

          <g className="rti-annots">
            {ANNOTS.map((annot) => {
              const related = annot.edgeIds?.some((id) => lit?.edges.has(id)) ?? false;
              const state = !lit ? "idle" : related ? "live" : "dim";
              return (
                <text
                  className={`rti-annot rti-annot-${annot.fill} is-${state}`}
                  key={annot.id}
                  letterSpacing={annot.tracking ?? "0.02em"}
                  textAnchor={annot.anchor ?? "middle"}
                  x={annot.x}
                  y={annot.y}
                >
                  {annot.text}
                </text>
              );
            })}
          </g>

          {NODES.map((node) => {
            const state = !lit ? "idle" : node.id === activeId ? "hot" : lit.nodes.has(node.id) ? "lit" : "dim";
            const hitPad = node.kind === "join" ? 8 : 6;
            return (
              <g
                aria-label={nodeAnnouncement(node.id)}
                aria-pressed={pinned === node.id}
                className={`${nodeClass(node.kind)} is-${state}`}
                data-node={node.id}
                key={node.id}
                onBlur={() => setHovered((current) => (current === node.id ? null : current))}
                onFocus={(event) => {
                  setHovered(node.id);
                  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  event.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "center",
                    behavior: reduce ? "auto" : "smooth",
                  });
                }}
                onKeyDown={(event) => handleKey(event, node.id)}
                role="button"
                tabIndex={0}
              >
                <NodeGraphic node={node} />
                <rect
                  className="rti-hit"
                  height={node.h + hitPad * 2}
                  rx={node.kind === "time" ? (node.h + hitPad * 2) / 2 : 10}
                  width={node.w + hitPad * 2}
                  x={node.x - node.w / 2 - hitPad}
                  y={node.y - node.h / 2 - hitPad}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rti-chart-dock" id="rti-chart-dock" role="status">
        {active ? (
          <>
            <strong>{active.kind === "time" ? `${active.label} days` : active.label}</strong>
            <p>{active.blurb}</p>
            {nextNodes.length > 0 ? (
              <p className="rti-chart-next">
                Next
                {nextNodes.map((node) => (
                  <span className={`rti-next-chip rti-next-${node.kind}`} key={node.id}>
                    {node.kind === "time" ? `${node.label} days` : node.label}
                  </span>
                ))}
              </p>
            ) : (
              <p className="rti-chart-next">This path can close here.</p>
            )}
          </>
        ) : (
          <>
            <strong>Trace a request</strong>
            <p>Hover or tap any block to light that step and the next two or three connected stages.</p>
          </>
        )}
        <span className="sr-only" aria-live="polite">
          {active ? nodeAnnouncement(active.id) : "No step selected."}
        </span>
      </div>

      <details className="rti-chart-list">
        <summary>Read the lifecycle as a list</summary>
        <ol>
          {LIST_SUMMARY.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </details>

      <p className="rti-chart-source">
        Replica of the RTI Online lifecycle, redrawn for interaction. Section cites refer to the RTI Act, 2005. Not a
        government publication, and not legal advice.{" "}
        <a href="https://rtionline.gov.in/images/rti_lifecycle.jpg" rel="noreferrer" target="_blank">
          View the original flowchart
        </a>
        .
      </p>
    </div>
  );
}
