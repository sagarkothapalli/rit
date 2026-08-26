#!/usr/bin/env python3
"""Build a clean RTI Request Lifecycle flowchart as HTML, then PNG.

Version 2 — moderately large boxes, short thick connectors, 2480-wide layout.
"""

from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent
HTML_PATH = OUT_DIR / "rti-request-lifecycle.html"

W, H = 2480, 1736
SVG_TOP = 136
SVG_H = 1600
FOOTER_H = 0

# Columns (center x)
C1, C2, C3, C4, AND_X, C5 = 430, 900, 1240, 1640, 1930, 2220
JUN = 680

# Box geometry — v2: larger nodes, short thick connectors
BOX_W, BOX_H = 240, 68
PILL_W, PILL_H = 156, 54
START_W, START_H = 448, 82
AND_R = 32
DOT_R = 15
H_BOX = BOX_H / 2
H_PILL = PILL_H / 2
H_START = START_H / 2
STROKE = 5.0
CORNER = 10

PAPER = "#F5F2EB"
INK = "#17202D"
INK_SOFT = "#4B596A"
INK_FAINT = "#6E7B8A"
NAVY = "#082F5B"
NAVY_DEEP = "#052444"
NAVY_MID = "#0C3D73"
NAVY_SOFT = "#EAF0F6"
SAFFRON = "#D97706"
SAFFRON_SOFT = "#FFF5E8"
GREEN = "#2F7D3F"
RED = "#B42318"
TEAL = "#0E5C6B"
LINE_STRONG = "#3E4C5C"
WHITE = "#FFFFFF"
BAND1 = "#F1F5F8"
BAND2 = "#F6F3EC"
BAND3 = "#EFF5F5"
BAND4 = "#F6F2EA"


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def rounded_ortho(pts, r=CORNER):
    if len(pts) == 1:
        x, y = pts[0]
        return f"M {x:.1f} {y:.1f}"
    if len(pts) == 2:
        (x0, y0), (x1, y1) = pts
        return f"M {x0:.1f} {y0:.1f} L {x1:.1f} {y1:.1f}"

    parts = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i - 1]
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        inx, iny = x1 - x0, y1 - y0
        outx, outy = x2 - x1, y2 - y1
        in_len = max((inx * inx + iny * iny) ** 0.5, 1.0)
        out_len = max((outx * outx + outy * outy) ** 0.5, 1.0)
        rr = min(r, in_len / 2.15, out_len / 2.15)
        ix, iy = x1 - (inx / in_len) * rr, y1 - (iny / in_len) * rr
        ox, oy = x1 + (outx / out_len) * rr, y1 + (outy / out_len) * rr
        parts.append(f"L {ix:.1f} {iy:.1f}")
        parts.append(f"Q {x1:.1f} {y1:.1f} {ox:.1f} {oy:.1f}")
    parts.append(f"L {pts[-1][0]:.1f} {pts[-1][1]:.1f}")
    return " ".join(parts)


class Diagram:
    def __init__(self):
        self.nodes = []
        self.wires = []
        self.annots = []
        self.bands = []

    def band(self, y, h, fill, label):
        self.bands.append((y, h, fill, label))

    def wire(self, pts, arrow=True, dashed=False):
        self.wires.append((pts, arrow, dashed))

    def caption(self, x, y, text, anchor="middle", size=14, fill=INK_SOFT, weight=600, tracking="0.02em"):
        self.annots.append(
            f'<text x="{x}" y="{y}" text-anchor="{anchor}" fill="{fill}" '
            f'font-size="{size}" font-weight="{weight}" letter-spacing="{tracking}">{esc(text)}</text>'
        )

    def time_pill(self, x, y, days, cite=""):
        w, h = PILL_W, PILL_H
        self.nodes.append(
            f'''
            <g class="node" transform="translate({x},{y})">
              <rect x="{-w/2}" y="{-h/2}" width="{w}" height="{h}" rx="{h/2}" fill="url(#navyGrad)" filter="url(#shadow)"/>
              <text y="6" text-anchor="middle" fill="{WHITE}">
                <tspan font-size="22" font-weight="700">{days}</tspan>
                <tspan font-size="12" font-weight="700" dx="7" letter-spacing="0.14em">DAYS</tspan>
              </text>
            </g>'''
        )
        if cite:
            self.caption(x + w / 2 + 12, y + 5, cite, anchor="start", size=15, fill=INK_FAINT, weight=650, tracking="0.04em")

    def box(self, x, y, text, kind="process", w=BOX_W, h=BOX_H):
        styles = {
            "process": (WHITE, NAVY, NAVY, 2.6),
            "muted": (NAVY_SOFT, NAVY, NAVY, 2.6),
            "start": ("url(#navyGrad)", "none", WHITE, 0),
            "success": (GREEN, "none", WHITE, 0),
            "alert": (RED, "none", WHITE, 0),
            "appeal": (TEAL, "none", WHITE, 0),
            "alt": (SAFFRON_SOFT, SAFFRON, NAVY, 2.8),
            "limit": (WHITE, LINE_STRONG, NAVY, 2.6),
        }
        fill, stroke, tfill, sw = styles[kind]
        rx = 14 if kind == "start" else 12
        if kind == "start":
            w, h = START_W, START_H
        stroke_attr = f' stroke="{stroke}" stroke-width="{sw}"' if sw else ""
        lines = text if isinstance(text, (list, tuple)) else [text]
        n = len(lines)
        tracking = "0.10em" if kind == "start" else "0.06em"
        size = 22 if kind == "start" else 17
        if kind == "start" and n == 2:
            text_el = (
                f'<text y="-8" text-anchor="middle" fill="{tfill}" font-size="22" font-weight="650" letter-spacing="0.12em">{esc(lines[0])}</text>'
                f'<text y="18" text-anchor="middle" fill="{tfill}" opacity="0.82" font-size="13" font-weight="600" letter-spacing="0.08em">{esc(lines[1])}</text>'
            )
        else:
            title_y = 6 if n == 1 else -4
            tspans = []
            for i, line in enumerate(lines):
                dy = 0 if i == 0 else 20
                tspans.append(f'<tspan x="0" dy="{dy}">{esc(line)}</tspan>')
            text_el = (
                f'<text y="{title_y}" text-anchor="middle" fill="{tfill}" font-size="{size}" '
                f'font-weight="650" letter-spacing="{tracking}">{"".join(tspans)}</text>'
            )
        self.nodes.append(
            f'''
            <g class="node" transform="translate({x},{y})">
              <rect x="{-w/2}" y="{-h/2}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"{stroke_attr} filter="url(#shadow)"/>
              {text_el}
            </g>'''
        )
        return w, h

    def and_join(self, x, y):
        self.nodes.append(
            f'''
            <g class="node" transform="translate({x},{y})">
              <polygon points="0,-{AND_R} {AND_R},0 0,{AND_R} -{AND_R},0" fill="{NAVY_DEEP}" filter="url(#shadow)"/>
              <text y="5" text-anchor="middle" fill="{WHITE}" font-size="13" font-weight="700" letter-spacing="0.14em">AND</text>
            </g>'''
        )

    def junction(self, x, y):
        self.nodes.append(
            f'''
            <g class="node" transform="translate({x},{y})">
              <circle r="{DOT_R}" fill="{NAVY}" filter="url(#shadow)"/>
            </g>'''
        )

    def render_svg(self) -> str:
        band_svg = []
        for y, h, fill, label in self.bands:
            band_svg.append(f'<rect x="0" y="{y}" width="{W}" height="{h}" fill="{fill}"/>')
            band_svg.append(
                f'<text x="40" y="{y + 32}" fill="{NAVY}" fill-opacity="0.5" font-size="13" '
                f'font-weight="700" letter-spacing="0.16em">{esc(label)}</text>'
            )

        wire_svg = []
        for pts, arrow, dashed in self.wires:
            dash = ' stroke-dasharray="7 6"' if dashed else ""
            marker = ' marker-end="url(#arrow)"' if arrow else ""
            d = rounded_ortho(pts, r=CORNER)
            wire_svg.append(
                f'<path d="{d}" fill="none" stroke="{LINE_STRONG}" stroke-width="{STROKE}" '
                f'stroke-linecap="round" stroke-linejoin="round"{dash}{marker}/>'
            )

        return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{SVG_H}" viewBox="0 0 {W} {SVG_H}" role="img" aria-label="RTI request lifecycle flowchart">
  <defs>
    <linearGradient id="navyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{NAVY_MID}"/>
      <stop offset="100%" stop-color="{NAVY}"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="3.2" flood-color="{NAVY}" flood-opacity="0.12"/>
    </filter>
    <marker id="arrow" viewBox="0 0 14 14" refX="12.5" refY="7" markerWidth="13" markerHeight="13" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M 1 1.5 L 13 7 L 1 12.5 z" fill="{LINE_STRONG}"/>
    </marker>
  </defs>
  {''.join(band_svg)}
  <g class="wires">{''.join(wire_svg)}</g>
  <g class="annots">{''.join(self.annots)}</g>
  <g class="nodes">{''.join(self.nodes)}</g>
  <rect x="0" y="{SVG_H - 70}" width="{W}" height="70" fill="#EFEBE3"/>
  <line x1="0" y1="{SVG_H - 70}" x2="{W}" y2="{SVG_H - 70}" stroke="#D9D3C8" stroke-width="1"/>
  <text x="52" y="{SVG_H - 30}" fill="{NAVY}" font-size="14" font-weight="650">Replica of the RTI Online lifecycle diagram, redrawn for clarity. Section cites refer to the RTI Act, 2005.</text>
  <text x="{W - 52}" y="{SVG_H - 30}" text-anchor="end" fill="{INK_SOFT}" font-size="14">Not a government publication · For orientation only · Not legal advice</text>
</svg>'''


def build() -> Diagram:
    d = Diagram()

    d.band(0, 500, BAND1, "01  PIO")
    d.band(500, 430, BAND2, "02  APPLICANT")
    d.band(930, 250, BAND3, "03  FAA")
    d.band(1180, 420, BAND4, "04  CIC / SIC")

    y_start = 100
    y_t1 = 248
    y_p1 = 352
    y_t2 = 456
    y_p2 = 560
    y_not = 668
    y_t3 = 772
    y_app = 884
    y_t4 = 990
    y_dec = 1094
    y_bot = 1214
    y_90 = 1318
    y_sec = 1420

    d.box(C3, y_start, ["RTI REQUEST", "SECTION 6 · APPLICATION FILED"], kind="start")

    d.time_pill(C1, y_t1, "30", "§7(1)")
    d.time_pill(C3, y_t1, "5", "§6(3)")
    d.time_pill(C5, y_t1, "30", "§7(1)")

    d.box(C1, y_p1, "REPLY")
    d.box(C3, y_p1, "TRANSFER")
    d.box(C5, y_p1, "NO REPLY", kind="muted")

    d.time_pill(C2, y_t2, "30", "§7(1)")
    d.time_pill(C4, y_t2, "30", "§7(1)")

    d.box(C2, y_p2, "REPLY")
    d.box(C4, y_p2, "NO REPLY", kind="muted")
    d.and_join(AND_X, y_p2)

    d.box(C2, y_not, "NOT SATISFIED", kind="alert")

    d.time_pill(C2, y_t3, "30", "§19(1)")
    d.time_pill(C4, y_t3, "30", "§19(1)")
    d.box(C5, y_t3, "NO TIME LIMIT", kind="limit", w=220)

    d.box(C1, y_app, "SATISFIED", kind="success")
    d.box(C3, y_app, "FIRST APPEAL", kind="appeal", w=300)
    d.box(C5, y_app, ["SECTION 18", "COMPLAINT TO CIC"], kind="alt", w=280, h=78)

    d.time_pill(C2, y_t4, "45", "§19(6)")
    d.time_pill(C4, y_t4, "45", "§19(6)")

    d.box(C2, y_dec, "DECISION")
    d.box(C4, y_dec, "NO DECISION", kind="muted")

    d.box(C1, y_bot, "SATISFIED", kind="success")
    d.junction(JUN, y_bot)
    d.box(C2, y_bot, "NOT SATISFIED", kind="alert")

    d.time_pill(C2, y_90, "90", "§19(3)")
    d.time_pill(C4, y_90, "90", "§19(3)")

    d.box(C3 + 80, y_sec, "SECOND APPEAL TO CIC / SIC", kind="appeal", w=520)
    d.caption(C3 + 80, y_sec + 48, "Within 90 days of the FAA decision or default", size=14, fill=INK_FAINT, weight=500)

    d.caption(C1, y_t1 - 44, "A  ·  REPLY RECEIVED", size=14, fill=NAVY, weight=700, tracking="0.10em")
    d.caption(C3, y_t1 - 44, "B  ·  TRANSFERRED", size=14, fill=NAVY, weight=700, tracking="0.10em")
    d.caption(C5, y_t1 - 44, "C  ·  NO REPLY", size=14, fill=NAVY, weight=700, tracking="0.10em")

    d.caption(C1 - 20, y_app - 52, "If satisfied", size=14, fill=GREEN, weight=650, anchor="end")
    d.caption(C1 + 90, y_not - 18, "If not satisfied", size=14, fill=RED, weight=650)
    d.caption(AND_X, y_p2 - 46, "Either no-reply path", size=14, fill=INK_FAINT, weight=650, tracking="0.04em")
    d.caption(C5, y_t3 - 44, "Parallel remedy", size=14, fill=SAFFRON, weight=700, tracking="0.08em")
    d.caption(JUN - 80, y_bot - 40, "If satisfied", size=14, fill=GREEN, weight=650)
    d.caption(JUN + 90, y_bot - 40, "If not satisfied", size=14, fill=RED, weight=650)

    rail_y = y_start + H_START + 16
    d.wire([(C3, y_start + H_START), (C3, rail_y)], arrow=False)
    d.wire([(C3, rail_y), (C1, rail_y), (C1, y_t1 - H_PILL)])
    d.wire([(C3, rail_y), (C3, y_t1 - H_PILL)])
    d.wire([(C3, rail_y), (C5, rail_y), (C5, y_t1 - H_PILL)])

    d.wire([(C1, y_t1 + H_PILL), (C1, y_p1 - H_BOX)])
    d.wire([(C3, y_t1 + H_PILL), (C3, y_p1 - H_BOX)])
    d.wire([(C5, y_t1 + H_PILL), (C5, y_p1 - H_BOX)])

    tsplit = y_p1 + H_BOX + 16
    d.wire([(C3, y_p1 + H_BOX), (C3, tsplit)], arrow=False)
    d.wire([(C3, tsplit), (C2, tsplit), (C2, y_t2 - H_PILL)])
    d.wire([(C3, tsplit), (C4, tsplit), (C4, y_t2 - H_PILL)])
    d.wire([(C2, y_t2 + H_PILL), (C2, y_p2 - H_BOX)])
    d.wire([(C4, y_t2 + H_PILL), (C4, y_p2 - H_BOX)])

    d.wire([(C1, y_p1 + H_BOX), (C1, y_app - H_BOX)])
    d.wire([(C1, y_not), (C2 - BOX_W / 2, y_not)])
    d.wire([(C2, y_p2 + H_BOX), (C2, y_not - H_BOX)])

    d.wire([(C4 + BOX_W / 2, y_p2), (AND_X - AND_R, y_p2)], arrow=False)
    d.wire([(C5, y_p1 + H_BOX), (C5, y_p2), (AND_X + AND_R, y_p2)], arrow=False)

    asplit = y_p2 + AND_R + 16
    d.wire([(AND_X, y_p2 + AND_R), (AND_X, asplit)], arrow=False)
    d.wire([(AND_X, asplit), (C4, asplit), (C4, y_t3 - H_PILL)])
    d.wire([(AND_X, asplit), (C5, asplit), (C5, y_t3 - H_BOX)])

    d.wire([(C2, y_not + H_BOX), (C2, y_t3 - H_PILL)])

    merge = y_t3 + H_PILL + 16
    d.wire([(C2, y_t3 + H_PILL), (C2, merge)], arrow=False)
    d.wire([(C4, y_t3 + H_PILL), (C4, merge)], arrow=False)
    d.wire([(C2, merge), (C4, merge)], arrow=False)
    d.wire([(C3, merge), (C3, y_app - H_BOX)])

    d.wire([(C5, y_t3 + H_BOX), (C5, y_app - 39)])

    fsplit = y_app + H_BOX + 16
    d.wire([(C3, y_app + H_BOX), (C3, fsplit)], arrow=False)
    d.wire([(C3, fsplit), (C2, fsplit), (C2, y_t4 - H_PILL)])
    d.wire([(C3, fsplit), (C4, fsplit), (C4, y_t4 - H_PILL)])
    d.wire([(C2, y_t4 + H_PILL), (C2, y_dec - H_BOX)])
    d.wire([(C4, y_t4 + H_PILL), (C4, y_dec - H_BOX)])

    elbow = y_bot - H_BOX - 22
    d.wire([(C2, y_dec + H_BOX), (C2, elbow), (JUN, elbow), (JUN, y_bot - DOT_R)])
    d.wire([(JUN - DOT_R, y_bot), (C1 + BOX_W / 2, y_bot)])
    d.wire([(JUN + DOT_R, y_bot), (C2 - BOX_W / 2, y_bot)])

    d.wire([(C4, y_dec + H_BOX), (C4, y_90 - H_PILL)])
    d.wire([(C2, y_bot + H_BOX), (C2, y_90 - H_PILL)])

    sec_x = C3 + 80
    merge90 = y_90 + H_PILL + 16
    d.wire([(C2, y_90 + H_PILL), (C2, merge90)], arrow=False)
    d.wire([(C4, y_90 + H_PILL), (C4, merge90)], arrow=False)
    d.wire([(C2, merge90), (C4, merge90)], arrow=False)
    d.wire([(sec_x, merge90), (sec_x, y_sec - H_BOX)])

    return d


def html_page(svg: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>RTI Request Lifecycle</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html, body {{
      width: {W}px;
      min-height: {H}px;
      overflow: visible;
      background: {PAPER};
      color: {INK};
      font-family: "Avenir Next", "Helvetica Neue", "Noto Sans", ui-sans-serif, sans-serif;
      -webkit-font-smoothing: antialiased;
    }}
    body {{ display: flex; flex-direction: column; }}
    .toprule {{
      height: 4px;
      flex: 0 0 auto;
      background: linear-gradient(90deg, {SAFFRON} 0 34%, {WHITE} 34% 66%, {GREEN} 66% 100%);
    }}
    header {{
      height: {SVG_TOP - 4}px;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 48px 0 52px;
      border-bottom: 1px solid #E4DED3;
      background: {PAPER};
    }}
    .brand {{ display: flex; flex-direction: column; gap: 5px; }}
    .eyebrow {{
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: {SAFFRON};
    }}
    h1 {{
      font-size: 34px;
      font-weight: 650;
      letter-spacing: -0.03em;
      color: {NAVY};
      line-height: 1;
    }}
    .sub {{ font-size: 14px; color: {INK_SOFT}; font-weight: 500; }}
    .legend {{ display: flex; gap: 20px; align-items: center; }}
    .leg {{
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 650;
      color: {INK_SOFT};
    }}
    .swatch {{
      width: 18px;
      height: 12px;
      border-radius: 3px;
      border: 1px solid rgba(8,47,91,0.12);
    }}
    .swatch.time {{ background: {NAVY}; border: 0; border-radius: 8px; width: 22px; }}
    .swatch.step {{ background: {WHITE}; border: 1.5px solid {NAVY}; }}
    .swatch.ok {{ background: {GREEN}; border: 0; }}
    .swatch.bad {{ background: {RED}; border: 0; }}
    .swatch.appeal {{ background: {TEAL}; border: 0; }}
    .swatch.alt {{ background: {SAFFRON_SOFT}; border: 1.5px solid {SAFFRON}; }}
    .diagram {{ height: {SVG_H}px; width: {W}px; flex: 0 0 auto; }}
    .diagram svg {{
      display: block;
      overflow: visible;
      font-family: "Avenir Next", "Helvetica Neue", "Noto Sans", ui-sans-serif, sans-serif;
    }}
  </style>
</head>
<body>
  <div class="toprule"></div>
  <header>
    <div class="brand">
      <div class="eyebrow">RIGHT TO INFORMATION ACT, 2005</div>
      <h1>RTI Request Lifecycle</h1>
      <div class="sub">Statutory timelines from filing through first appeal, second appeal, and a Section 18 complaint.</div>
    </div>
    <div class="legend">
      <div class="leg"><span class="swatch time"></span>Time limit</div>
      <div class="leg"><span class="swatch step"></span>Process</div>
      <div class="leg"><span class="swatch ok"></span>Closed</div>
      <div class="leg"><span class="swatch bad"></span>Not satisfied</div>
      <div class="leg"><span class="swatch appeal"></span>Appeal</div>
      <div class="leg"><span class="swatch alt"></span>Complaint</div>
    </div>
  </header>
  <div class="diagram">{svg}</div>
</body>
</html>
"""


def main():
    d = build()
    HTML_PATH.write_text(html_page(d.render_svg()), encoding="utf-8")
    print(f"Wrote {HTML_PATH}")


if __name__ == "__main__":
    main()
