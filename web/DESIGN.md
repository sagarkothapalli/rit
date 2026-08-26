---
name: Praja-RTI
description: Voice-first RTI drafting, calmly done — light glass editor design system
colors:
  bg: "#f7f5f0"
  bg-raise: "#ffffff"
  fg: "#16181d"
  fg-soft: "#4d525c"
  fg-faint: "#6f747e"
  line: "rgba(22,24,29,0.08)"
  line-strong: "rgba(22,24,29,0.16)"
  iris: "#4f46e5"
  iris-deep: "#4338ca"
  violet-pastel: "#c4b5fd"
  sky-pastel: "#bae6fd"
  rose-pastel: "#fbcfe8"
  red: "#b91c1c"
  green: "#047857"
  amber: "#92400e"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontWeight: 500
    letterSpacing: "-0.02em"
    fontVariation: "opsz, SOFT"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    textTransform: "uppercase"
    letterSpacing: "0.14-0.2em"
rounded:
  card: "20px"
  control: "9999px"
  tab: "12px 12px 0 0"
components:
  button-primary:
    backgroundColor: "{colors.iris}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "12px 28px"
  card:
    backgroundColor: "rgba(255,255,255,0.65)"
    textColor: "{colors.fg}"
    borderColor: "{colors.line}"
    rounded: "{rounded.card}"
---

# Design System: Praja-RTI

## Overview

**Creative North Star: "A quiet editorial desk by a window."**

Ivory paper ground, pastel light moving through frosted glass, one calm indigo signal. The surface refuses the dark-instrument console, the neon demo aesthetic, and every government-portal habit. Fraunces carries the editorial voice — including a light italic second line in the headline. React Bits motion: a pastel Aurora wash behind the hero, BlurText assembling the headline, a soft indigo spotlight following the pointer across glass panels, CountUp instruments for the real portal numbers.

**Key Characteristics**
- Indigo (#4f46e5) is the only interactive colour; pastels are atmosphere; red/green/amber are status-only and darkened for ivory contrast.
- Panels are frosted glass: white 65%, 16px blur, hairline border, layered soft shadow, 20px radius.
- Fraunces display (medium, tight) with an italic light accent line; Inter body; JetBrains Mono uppercase readouts.
- The independent-demo ribbon (amber dot) sits above every page on a white/60 blur band.
- Depth is soft and layered — never neon, never hard offsets.

## Colors

### Signal
- **Iris** (#4f46e5): every interactive element — links, active tab, primary button, focus ring, spotlight.
- **Iris Deep** (#4338ca): hover state.

### Atmosphere (never interactive)
- **Violet Pastel** (#c4b5fd) / **Sky Pastel** (#bae6fd) / **Rose Pastel** (#fbcfe8): the Aurora stops.

### Status (darkened for ivory)
- **Red** (#b91c1c): Sec 8 guard, NOT-SUBMITTED.
- **Green** (#047857): simulated success.
- **Amber** (#92400e): the independent ribbon marker.

### Neutral
- **Ivory** (#f7f5f0) ground · **Ink** (#16181d / #4d525c / #6f747e) three-step text · **Hairline** (rgba(22,24,29,0.08)) borders.

### Named Rules
**The One Signal Rule.** Indigo is the only colour that invites a click.
**The Darkened Status Rule.** Status colours are darkened for 4.5:1 on ivory; never use bright status hues on light ground.
**The Glass Rule.** Panels blur what is behind them; they are never opaque white cards and never dark glass on light ground.

## Typography

**Display:** Fraunces 500, -0.02em, opsz axis; italic light for accent lines.
**Body:** Inter 400, 14–16.5px, 1.6 line-height, 55–65ch.
**Mono:** JetBrains Mono uppercase, 10–11px, 0.18–0.2em tracking — readouts only.

### Named Rules
**The Italic Accent Rule.** The headline's second line is Fraunces italic light in iris; it never repeats the roman weight.

## Layout

`max-w-6xl` container, 24px gutters. Aurora occupies the top 560px, masked to an ellipse from the top edge. Hero centred; sections separated by 80px rhythm and hairline gradient rules. Grids: 2-col panels, 4-col stats, 2-col guardrails; single column below md.

## Elevation & Depth

Glass shadow only: `0 1px 2px rgba(20,20,30,0.04), 0 16px 40px -16px rgba(20,20,30,0.14)`. Buttons add a coloured soft shadow on hover (`0 12px 28px -10px rgba(79,70,229,0.55)`). No glows at rest.

## Shapes

Cards 20px, pills for all buttons/chips, tabs 12px top corners only. No 4px corners.

## Components

- **Primary button:** iris pill, white text, deepens on hover with coloured soft shadow.
- **Ghost button:** white/60 blur pill, hairline border, ink text.
- **SpotlightCard:** glass panel; pointer-tracked radial (iris 0.06 / red 0.06 for the guard).
- **Tab:** glass chip, active = iris tint + iris text.
- **Stat instrument:** glass card, Fraunces CountUp figure, mono caption.
- **Ribbon:** white/60 blur band, amber dot, mono "Independent" tag.

## Do's and Don'ts

### Do:
- **Do** keep indigo as the only click-inviting colour.
- **Do** use Fraunces italic for editorial accent lines.
- **Do** carry the ribbon on every page.
- **Do** darken status colours for ivory contrast.

### Don't:
- **Don't** use dark panels or neon on this ground.
- **Don't** use bright status hues on ivory.
- **Don't** claim filing, acceptance, or government status anywhere.
- **Don't** replace glass with opaque flat cards.
