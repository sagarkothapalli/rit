export type NodeKind =
  | "start"
  | "time"
  | "process"
  | "processSoft"
  | "ok"
  | "bad"
  | "appeal"
  | "complaint"
  | "join";

export type FlowNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  lines?: string[];
  sub?: string;
  cite?: string;
  blurb: string;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  d: string;
  arrow?: boolean;
};

export type FlowAnnot = {
  id: string;
  x: number;
  y: number;
  text: string;
  fill: "muted" | "navy" | "green" | "red" | "saffron";
  anchor?: "start" | "middle" | "end";
  size?: number;
  tracking?: string;
  edgeIds?: string[];
};

export const VIEW = { w: 1240, h: 920 };

export const LANES = [
  { id: "pio", label: "01  PIO", y: 0, h: 244 },
  { id: "applicant", label: "02  APPLICANT", y: 244, h: 304 },
  { id: "faa", label: "03  FAA", y: 548, h: 150 },
  { id: "cic", label: "04  CIC / SIC", y: 698, h: 222 },
] as const;

const X = { A: 178, BL: 418, MID: 620, BR: 828, C: 1068, AND: 948 };
const Y = {
  start: 52,
  t1: 140,
  p1: 200,
  t2: 276,
  p2: 334,
  notSat: 392,
  tAppeal: 450,
  outcomes: 516,
  t45: 590,
  faa: 648,
  faaOut: 752,
  t90: 808,
  second: 864,
};

const TIME = { w: 110, h: 38 };
const BOX = { w: 156, h: 44 };

export const NODES: FlowNode[] = [
  {
    id: "start",
    kind: "start",
    x: X.MID,
    y: Y.start,
    w: 292,
    h: 56,
    label: "RTI REQUEST",
    sub: "SECTION 6  ·  APPLICATION FILED",
    cite: "§6",
    blurb: "The citizen files an application with a public authority under Section 6 of the RTI Act.",
  },
  {
    id: "t30a",
    kind: "time",
    x: X.A,
    y: Y.t1,
    ...TIME,
    label: "30",
    sub: "DAYS",
    cite: "§7(1)",
    blurb: "The public information officer has 30 days to send a reply.",
  },
  {
    id: "t5b",
    kind: "time",
    x: X.MID,
    y: Y.t1,
    ...TIME,
    label: "5",
    sub: "DAYS",
    cite: "§6(3)",
    blurb: "If the request belongs elsewhere, the authority has 5 days to transfer it.",
  },
  {
    id: "t30c",
    kind: "time",
    x: X.C,
    y: Y.t1,
    ...TIME,
    label: "30",
    sub: "DAYS",
    cite: "§7(1)",
    blurb: "If no reply is sent within 30 days, the request is treated as unanswered.",
  },
  {
    id: "replyA",
    kind: "process",
    x: X.A,
    y: Y.p1,
    ...BOX,
    label: "REPLY",
    blurb: "A reply has been received. The citizen may be satisfied, or may go on to a first appeal.",
  },
  {
    id: "transfer",
    kind: "process",
    x: X.MID,
    y: Y.p1,
    ...BOX,
    label: "TRANSFER",
    blurb: "The receiving public authority now has to reply, or the request may again go unanswered.",
  },
  {
    id: "noReplyC",
    kind: "processSoft",
    x: X.C,
    y: Y.p1,
    ...BOX,
    label: "NO REPLY",
    blurb: "No response arrived within the statutory period. This path joins the other no-reply route.",
  },
  {
    id: "t30bReply",
    kind: "time",
    x: X.BL,
    y: Y.t2,
    ...TIME,
    label: "30",
    sub: "DAYS",
    cite: "§7(1)",
    blurb: "After a transfer, the new authority has 30 days to reply.",
  },
  {
    id: "t30bNoReply",
    kind: "time",
    x: X.BR,
    y: Y.t2,
    ...TIME,
    label: "30",
    sub: "DAYS",
    cite: "§7(1)",
    blurb: "After a transfer, 30 days with no response opens the no-reply path.",
  },
  {
    id: "replyB",
    kind: "process",
    x: X.BL,
    y: Y.p2,
    ...BOX,
    label: "REPLY",
    blurb: "The transferred authority has replied. If the citizen is not satisfied, a first appeal can follow.",
  },
  {
    id: "noReplyB",
    kind: "processSoft",
    x: X.BR,
    y: Y.p2,
    ...BOX,
    label: "NO REPLY",
    blurb: "The transferred authority did not reply. This joins the original no-reply path.",
  },
  {
    id: "andJoin",
    kind: "join",
    x: X.AND,
    y: Y.p2,
    w: 44,
    h: 44,
    label: "AND",
    blurb: "Either no-reply path can lead to a first appeal, and also to a Section 18 complaint.",
  },
  {
    id: "notSat",
    kind: "bad",
    x: X.BL,
    y: Y.notSat,
    ...BOX,
    label: "NOT SATISFIED",
    blurb: "The citizen is not satisfied with the reply. A first appeal can be filed within 30 days.",
  },
  {
    id: "t30FromUnsat",
    kind: "time",
    x: X.BL,
    y: Y.tAppeal,
    ...TIME,
    label: "30",
    sub: "DAYS",
    cite: "§19(1)",
    blurb: "A first appeal should be filed within 30 days of the reply.",
  },
  {
    id: "t30FromNone",
    kind: "time",
    x: X.BR,
    y: Y.tAppeal,
    ...TIME,
    label: "30",
    sub: "DAYS",
    cite: "§19(1)",
    blurb: "If there is no reply, a first appeal can still be filed within 30 days of when the reply was due.",
  },
  {
    id: "noTimeLimit",
    kind: "process",
    x: X.C,
    y: Y.tAppeal,
    ...BOX,
    label: "NO TIME LIMIT",
    blurb: "A Section 18 complaint to the Commission has no statutory time limit. It is a parallel remedy.",
  },
  {
    id: "satisfiedA",
    kind: "ok",
    x: X.A,
    y: Y.outcomes,
    ...BOX,
    label: "SATISFIED",
    blurb: "The reply is complete. The request can close.",
  },
  {
    id: "firstAppeal",
    kind: "appeal",
    x: X.MID,
    y: Y.outcomes,
    w: 210,
    h: 46,
    label: "FIRST APPEAL",
    cite: "§19",
    blurb: "The first appellate authority may decide, or may fail to decide, within the statutory window.",
  },
  {
    id: "section18",
    kind: "complaint",
    x: X.C,
    y: Y.outcomes,
    w: 196,
    h: 52,
    label: "SECTION 18",
    lines: ["SECTION 18", "COMPLAINT TO CIC"],
    cite: "§18",
    blurb: "A complaint may be made to the Central or State Information Commission. This does not replace the appeal route.",
  },
  {
    id: "t45dec",
    kind: "time",
    x: X.BL,
    y: Y.t45,
    ...TIME,
    label: "45",
    sub: "DAYS",
    cite: "§19(6)",
    blurb: "The appellate authority should decide within 30 days, or record reasons and take up to 45 days.",
  },
  {
    id: "t45none",
    kind: "time",
    x: X.BR,
    y: Y.t45,
    ...TIME,
    label: "45",
    sub: "DAYS",
    cite: "§19(6)",
    blurb: "If the first appeal is not decided in time, the citizen may go further.",
  },
  {
    id: "decision",
    kind: "process",
    x: X.BL,
    y: Y.faa,
    ...BOX,
    label: "DECISION",
    blurb: "The first appellate authority has given a decision. The citizen may accept it or remain unsatisfied.",
  },
  {
    id: "noDecision",
    kind: "processSoft",
    x: X.BR,
    y: Y.faa,
    ...BOX,
    label: "NO DECISION",
    blurb: "No first-appeal decision arrived. A second appeal may be filed with the Commission.",
  },
  {
    id: "satisfiedFaa",
    kind: "ok",
    x: X.A,
    y: Y.faaOut,
    ...BOX,
    label: "SATISFIED",
    blurb: "The first-appeal decision resolves the request. The process can close.",
  },
  {
    id: "notSatFaa",
    kind: "bad",
    x: X.BL,
    y: Y.faaOut,
    ...BOX,
    label: "NOT SATISFIED",
    blurb: "The citizen remains unsatisfied after the first appeal and may file a second appeal within 90 days.",
  },
  {
    id: "t90unsat",
    kind: "time",
    x: X.BL,
    y: Y.t90,
    ...TIME,
    label: "90",
    sub: "DAYS",
    cite: "§19(3)",
    blurb: "A second appeal should be filed within 90 days of the first-appeal decision.",
  },
  {
    id: "t90none",
    kind: "time",
    x: X.BR,
    y: Y.t90,
    ...TIME,
    label: "90",
    sub: "DAYS",
    cite: "§19(3)",
    blurb: "If the first appeal is not decided, a second appeal may be filed within 90 days of when that decision was due.",
  },
  {
    id: "secondAppeal",
    kind: "appeal",
    x: X.MID,
    y: Y.second,
    w: 360,
    h: 46,
    label: "SECOND APPEAL TO CIC / SIC",
    cite: "§19(3)",
    blurb: "A second appeal may be made to the Central or State Information Commission, as applicable.",
  },
];

export const NODE_BY_ID: Record<string, FlowNode> = Object.fromEntries(NODES.map((node) => [node.id, node]));

function roundedPath(points: [number, number][], r = 10): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  if (points.length === 2) {
    const [[x0, y0], [x1, y1]] = points;
    return `M ${x0} ${y0} L ${x1} ${y1}`;
  }

  const parts = [`M ${points[0][0]} ${points[0][1]}`];
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const inx = x1 - x0;
    const iny = y1 - y0;
    const outx = x2 - x1;
    const outy = y2 - y1;
    const inLen = Math.hypot(inx, iny) || 1;
    const outLen = Math.hypot(outx, outy) || 1;
    const rr = Math.min(r, inLen / 2.2, outLen / 2.2);
    parts.push(`L ${x1 - (inx / inLen) * rr} ${y1 - (iny / inLen) * rr}`);
    parts.push(`Q ${x1} ${y1} ${x1 + (outx / outLen) * rr} ${y1 + (outy / outLen) * rr}`);
  }
  const last = points[points.length - 1];
  parts.push(`L ${last[0]} ${last[1]}`);
  return parts.join(" ");
}

function top(node: FlowNode): [number, number] {
  return [node.x, node.y - node.h / 2];
}

function bottom(node: FlowNode): [number, number] {
  return [node.x, node.y + node.h / 2];
}

function left(node: FlowNode): [number, number] {
  return [node.x - node.w / 2, node.y];
}

function right(node: FlowNode): [number, number] {
  return [node.x + node.w / 2, node.y];
}

function edge(id: string, from: string, to: string, points: [number, number][], arrow = true): FlowEdge {
  return { id, from, to, d: roundedPath(points), arrow };
}

const n = NODE_BY_ID;
const busY = bottom(n.start)[1] + 16;
const splitY = 708;

export const EDGES: FlowEdge[] = [
  edge("e-start-t30a", "start", "t30a", [bottom(n.start), [n.start.x, busY], [n.t30a.x, busY], top(n.t30a)]),
  edge("e-start-t5b", "start", "t5b", [bottom(n.start), [n.start.x, busY], top(n.t5b)]),
  edge("e-start-t30c", "start", "t30c", [bottom(n.start), [n.start.x, busY], [n.t30c.x, busY], top(n.t30c)]),
  edge("e-t30a-replyA", "t30a", "replyA", [bottom(n.t30a), top(n.replyA)]),
  edge("e-t5b-transfer", "t5b", "transfer", [bottom(n.t5b), top(n.transfer)]),
  edge("e-t30c-noReplyC", "t30c", "noReplyC", [bottom(n.t30c), top(n.noReplyC)]),
  edge("e-transfer-t30bReply", "transfer", "t30bReply", [
    bottom(n.transfer),
    [n.transfer.x, (bottom(n.transfer)[1] + top(n.t30bReply)[1]) / 2],
    [n.t30bReply.x, (bottom(n.transfer)[1] + top(n.t30bReply)[1]) / 2],
    top(n.t30bReply),
  ]),
  edge("e-transfer-t30bNoReply", "transfer", "t30bNoReply", [
    bottom(n.transfer),
    [n.transfer.x, (bottom(n.transfer)[1] + top(n.t30bNoReply)[1]) / 2],
    [n.t30bNoReply.x, (bottom(n.transfer)[1] + top(n.t30bNoReply)[1]) / 2],
    top(n.t30bNoReply),
  ]),
  edge("e-t30bReply-replyB", "t30bReply", "replyB", [bottom(n.t30bReply), top(n.replyB)]),
  edge("e-t30bNoReply-noReplyB", "t30bNoReply", "noReplyB", [bottom(n.t30bNoReply), top(n.noReplyB)]),
  edge("e-replyA-satisfiedA", "replyA", "satisfiedA", [bottom(n.replyA), top(n.satisfiedA)]),
  edge("e-replyA-notSat", "replyA", "notSat", [
    [n.replyA.x, n.notSat.y],
    left(n.notSat),
  ]),
  edge("e-replyB-notSat", "replyB", "notSat", [bottom(n.replyB), top(n.notSat)]),
  edge("e-notSat-t30FromUnsat", "notSat", "t30FromUnsat", [bottom(n.notSat), top(n.t30FromUnsat)]),
  edge("e-t30FromUnsat-firstAppeal", "t30FromUnsat", "firstAppeal", [
    bottom(n.t30FromUnsat),
    [n.t30FromUnsat.x, (bottom(n.t30FromUnsat)[1] + top(n.firstAppeal)[1]) / 2],
    [n.firstAppeal.x, (bottom(n.t30FromUnsat)[1] + top(n.firstAppeal)[1]) / 2],
    top(n.firstAppeal),
  ]),
  edge("e-noReplyB-andJoin", "noReplyB", "andJoin", [right(n.noReplyB), left(n.andJoin)], false),
  edge("e-noReplyC-andJoin", "noReplyC", "andJoin", [
    bottom(n.noReplyC),
    [n.noReplyC.x, n.andJoin.y],
    right(n.andJoin),
  ], false),
  edge("e-andJoin-t30FromNone", "andJoin", "t30FromNone", [
    [n.andJoin.x, n.andJoin.y + 18],
    [n.andJoin.x, (n.andJoin.y + 18 + top(n.t30FromNone)[1]) / 2],
    [n.t30FromNone.x, (n.andJoin.y + 18 + top(n.t30FromNone)[1]) / 2],
    top(n.t30FromNone),
  ]),
  edge("e-andJoin-noTimeLimit", "andJoin", "noTimeLimit", [
    [n.andJoin.x, n.andJoin.y + 18],
    [n.andJoin.x, (n.andJoin.y + 18 + top(n.noTimeLimit)[1]) / 2],
    [n.noTimeLimit.x, (n.andJoin.y + 18 + top(n.noTimeLimit)[1]) / 2],
    top(n.noTimeLimit),
  ]),
  edge("e-t30FromNone-firstAppeal", "t30FromNone", "firstAppeal", [
    bottom(n.t30FromNone),
    [n.t30FromNone.x, (bottom(n.t30FromNone)[1] + top(n.firstAppeal)[1]) / 2],
    [n.firstAppeal.x, (bottom(n.t30FromNone)[1] + top(n.firstAppeal)[1]) / 2],
    top(n.firstAppeal),
  ]),
  edge("e-noTimeLimit-section18", "noTimeLimit", "section18", [bottom(n.noTimeLimit), top(n.section18)]),
  edge("e-firstAppeal-t45dec", "firstAppeal", "t45dec", [
    bottom(n.firstAppeal),
    [n.firstAppeal.x, (bottom(n.firstAppeal)[1] + top(n.t45dec)[1]) / 2],
    [n.t45dec.x, (bottom(n.firstAppeal)[1] + top(n.t45dec)[1]) / 2],
    top(n.t45dec),
  ]),
  edge("e-firstAppeal-t45none", "firstAppeal", "t45none", [
    bottom(n.firstAppeal),
    [n.firstAppeal.x, (bottom(n.firstAppeal)[1] + top(n.t45none)[1]) / 2],
    [n.t45none.x, (bottom(n.firstAppeal)[1] + top(n.t45none)[1]) / 2],
    top(n.t45none),
  ]),
  edge("e-t45dec-decision", "t45dec", "decision", [bottom(n.t45dec), top(n.decision)]),
  edge("e-t45none-noDecision", "t45none", "noDecision", [bottom(n.t45none), top(n.noDecision)]),
  edge("e-decision-satisfiedFaa", "decision", "satisfiedFaa", [
    bottom(n.decision),
    [n.decision.x, splitY],
    [n.satisfiedFaa.x, splitY],
    top(n.satisfiedFaa),
  ]),
  edge("e-decision-notSatFaa", "decision", "notSatFaa", [
    bottom(n.decision),
    [n.decision.x, splitY],
    top(n.notSatFaa),
  ]),
  edge("e-notSatFaa-t90unsat", "notSatFaa", "t90unsat", [bottom(n.notSatFaa), top(n.t90unsat)]),
  edge("e-noDecision-t90none", "noDecision", "t90none", [bottom(n.noDecision), top(n.t90none)]),
  edge("e-t90unsat-secondAppeal", "t90unsat", "secondAppeal", [
    bottom(n.t90unsat),
    [n.t90unsat.x, (bottom(n.t90unsat)[1] + top(n.secondAppeal)[1]) / 2],
    [n.secondAppeal.x, (bottom(n.t90unsat)[1] + top(n.secondAppeal)[1]) / 2],
    top(n.secondAppeal),
  ]),
  edge("e-t90none-secondAppeal", "t90none", "secondAppeal", [
    bottom(n.t90none),
    [n.t90none.x, (bottom(n.t90none)[1] + top(n.secondAppeal)[1]) / 2],
    [n.secondAppeal.x, (bottom(n.t90none)[1] + top(n.secondAppeal)[1]) / 2],
    top(n.secondAppeal),
  ]),
];

export const OUTGOING: Record<string, FlowEdge[]> = EDGES.reduce<Record<string, FlowEdge[]>>((map, item) => {
  map[item.from] = map[item.from] ? [...map[item.from], item] : [item];
  return map;
}, {});

export const ANNOTS: FlowAnnot[] = [
  { id: "a-branch-a", x: X.A, y: 108, text: "A  ·  REPLY RECEIVED", fill: "navy", tracking: "0.10em" },
  { id: "a-branch-b", x: X.MID, y: 108, text: "B  ·  TRANSFERRED", fill: "navy", tracking: "0.10em" },
  { id: "a-branch-c", x: X.C, y: 108, text: "C  ·  NO REPLY", fill: "navy", tracking: "0.10em" },
  { id: "a-cite-t30a", x: X.A + 64, y: Y.t1 + 4, text: "§7(1)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t5b", x: X.MID + 64, y: Y.t1 + 4, text: "§6(3)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t30c", x: X.C + 64, y: Y.t1 + 4, text: "§7(1)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t30bReply", x: X.BL + 64, y: Y.t2 + 4, text: "§7(1)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t30bNoReply", x: X.BR + 64, y: Y.t2 + 4, text: "§7(1)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t30FromUnsat", x: X.BL + 64, y: Y.tAppeal + 4, text: "§19(1)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t30FromNone", x: X.BR + 64, y: Y.tAppeal + 4, text: "§19(1)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t45dec", x: X.BL + 64, y: Y.t45 + 4, text: "§19(6)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t45none", x: X.BR + 64, y: Y.t45 + 4, text: "§19(6)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t90unsat", x: X.BL + 64, y: Y.t90 + 4, text: "§19(3)", fill: "muted", anchor: "start", size: 11 },
  { id: "a-cite-t90none", x: X.BR + 64, y: Y.t90 + 4, text: "§19(3)", fill: "muted", anchor: "start", size: 11 },
  {
    id: "a-if-sat-a",
    x: X.A - 86,
    y: 470,
    text: "If satisfied",
    fill: "green",
    anchor: "end",
    size: 11,
    edgeIds: ["e-replyA-satisfiedA"],
  },
  {
    id: "a-if-unsat-a",
    x: (X.A + X.BL) / 2,
    y: Y.notSat - 16,
    text: "If not satisfied",
    fill: "red",
    size: 11,
    edgeIds: ["e-replyA-notSat"],
  },
  {
    id: "a-either",
    x: X.AND,
    y: Y.p2 - 36,
    text: "Either no-reply path",
    fill: "muted",
    size: 11,
    tracking: "0.04em",
    edgeIds: ["e-noReplyB-andJoin", "e-noReplyC-andJoin"],
  },
  {
    id: "a-parallel",
    x: X.C,
    y: Y.tAppeal - 28,
    text: "Parallel remedy",
    fill: "saffron",
    size: 11,
    tracking: "0.08em",
    edgeIds: ["e-andJoin-noTimeLimit", "e-noTimeLimit-section18"],
  },
  {
    id: "a-if-sat-faa",
    x: (X.A + X.BL) / 2 - 8,
    y: splitY - 12,
    text: "If satisfied",
    fill: "green",
    size: 11,
    edgeIds: ["e-decision-satisfiedFaa"],
  },
  {
    id: "a-if-unsat-faa",
    x: X.BL + 78,
    y: splitY - 12,
    text: "If not satisfied",
    fill: "red",
    anchor: "start",
    size: 11,
    edgeIds: ["e-decision-notSatFaa"],
  },
  {
    id: "a-second-note",
    x: X.MID,
    y: 902,
    text: "Within 90 days of the FAA decision or default",
    fill: "muted",
    size: 11,
    edgeIds: ["e-t90unsat-secondAppeal", "e-t90none-secondAppeal"],
  },
];

export function lightFrom(id: string): { nodes: Set<string>; edges: Set<string>; next: string[] } {
  const nodes = new Set<string>([id]);
  const edges = new Set<string>();
  const hop1 = OUTGOING[id] ?? [];

  for (const item of hop1) {
    nodes.add(item.to);
    edges.add(item.id);
  }

  if (hop1.length <= 1) {
    for (const item of hop1) {
      for (const nextEdge of OUTGOING[item.to] ?? []) {
        if (nodes.size >= 4) break;
        nodes.add(nextEdge.to);
        edges.add(nextEdge.id);
      }
    }
  }

  return {
    nodes,
    edges,
    next: [...nodes].filter((nodeId) => nodeId !== id),
  };
}

export function nodeAnnouncement(id: string): string {
  const node = NODE_BY_ID[id];
  if (!node) return "";
  const { next } = lightFrom(id);
  const nextLabels = next
    .map((nodeId) => NODE_BY_ID[nodeId]?.label)
    .filter(Boolean)
    .join(", ");
  const cite = node.cite ? ` ${node.cite}.` : "";
  if (!nextLabels) return `${node.label}.${cite} ${node.blurb}`;
  return `${node.label}.${cite} ${node.blurb} Next: ${nextLabels}.`;
}

export const LEGEND = [
  { id: "time", label: "Time limit" },
  { id: "process", label: "Process" },
  { id: "ok", label: "Closed" },
  { id: "bad", label: "Not satisfied" },
  { id: "appeal", label: "Appeal" },
  { id: "complaint", label: "Complaint" },
] as const;

export const LIST_SUMMARY: { title: string; body: string }[] = [
  {
    title: "File the request",
    body: "An RTI application is filed under Section 6. Three things can then happen.",
  },
  {
    title: "Reply, transfer, or silence",
    body: "A reply may arrive in 30 days. The request may be transferred in 5 days. Or there may be no reply in 30 days.",
  },
  {
    title: "After a transfer",
    body: "The new authority then has 30 days to reply, or the no-reply path opens.",
  },
  {
    title: "If the citizen is satisfied",
    body: "A complete reply can close the process.",
  },
  {
    title: "First appeal",
    body: "If the citizen is not satisfied, or if there is no reply, a first appeal may be filed within 30 days under Section 19(1).",
  },
  {
    title: "Section 18 complaint",
    body: "A complaint to the Commission is a parallel remedy with no statutory time limit.",
  },
  {
    title: "First appellate decision",
    body: "The appellate authority may decide within 30 days, or take up to 45 days with recorded reasons.",
  },
  {
    title: "Second appeal",
    body: "If the citizen remains unsatisfied, or if there is no decision, a second appeal may be made to the CIC or SIC within 90 days.",
  },
];
