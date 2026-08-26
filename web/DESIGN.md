---
name: Praja RTI
description: An independent civic workspace that turns citizen speech into reviewable records requests
colors:
  paper-ground: "#f7f7f4"
  surface: "#ffffff"
  surface-soft: "#f5f7f9"
  ink: "#17202d"
  ink-soft: "#4b596a"
  ink-faint: "#687486"
  rule: "#d8dde4"
  rule-strong: "#b9c2cf"
  civic-navy: "#082f5b"
  civic-navy-deep: "#052444"
  civic-navy-soft: "#eaf0f6"
  saffron: "#d97706"
  saffron-soft: "#fff5e8"
  confirmation-green: "#2f7d3f"
  confirmation-green-soft: "#edf7ef"
  refusal-red: "#b42318"
  caution-amber: "#8a5b00"
  appeal-teal: "#0e5c6b"
typography:
  display:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.65rem, 4.5vw, 4.05rem)"
    fontWeight: 630
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.7vw, 3.25rem)"
    fontWeight: 630
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.05em"
  devanagari:
    fontFamily: "Noto Sans Devanagari, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  compact: "6px"
  action: "8px"
  panel: "12px"
  workspace: "14px"
  circle: "50%"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "28px"
  xl: "52px"
components:
  masthead:
    backgroundColor: "{colors.civic-navy}"
    textColor: "{colors.surface}"
    padding: "22px 28px"
  button-primary:
    backgroundColor: "{colors.civic-navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.action}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.civic-navy-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.action}"
    padding: "12px 20px"
  button-light:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.civic-navy}"
    rounded: "{rounded.action}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.civic-navy}"
    rounded: "7px"
    padding: "8px 11px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "12px 16px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  truth-strip:
    backgroundColor: "#fff8eb"
    textColor: "#5f4a20"
    padding: "9px 28px"
---

# Design System: Praja RTI

## Overview

**Creative North Star: "The Civic Records Desk"**

Praja RTI is a restrained public-service workspace where a citizen's natural words visibly become a precise request for records. India navy, warm off-white paper, thin neutral rules, sparse saffron and green signals, and measured Public Sans typography create civic gravity without imitating an official portal. The feeling is calm, legible, and quietly capable: closer to a well-run assistance desk than a campaign landing page.

The visual system is flat and information-led. Solid regions establish hierarchy; the bilingual masthead establishes identity; authored line icons explain actions; and the speech-to-records transformation demonstrates the product in the first viewport. Generous section spacing is balanced by compact controls, labels, and corners so complex public information remains approachable rather than promotional.

The service boundary is part of the design, not footer fine print. Praja RTI prepares, explains, and lets the citizen review; the official RTI Online portal is a separate destination for filing. Every consequential workspace surface must plainly state that Praja RTI is independent, is not a government portal, does not connect to a government system, and has not filed or submitted the citizen's request.

**Key Characteristics:**

- A solid India-navy civic masthead above an off-white service-paper ground.
- One visible speech-to-numbered-records workspace as the signature product demonstration.
- Public Sans throughout Latin text, with Noto Sans Devanagari for Hindi identity text.
- Flat solid surfaces, one-pixel rules, rare soft shadows, and mostly 6–12px corners.
- Saffron, green, amber, red, and teal communicate emphasis or semantic state; navy owns action and structure.
- Authored outline SVG icons, an interactive four-lane RTI lifecycle map, and one-time IntersectionObserver reveals.
- Independent preparation and official filing are always presented as two distinct services.

## Colors

The palette carries institutional clarity without claiming institutional authority: navy structures the experience, off-white and white hold the reading surfaces, and Indian civic colors appear only as restrained signals.

### Primary

- **Civic Navy:** The masthead, primary actions, active tabs, numbered request markers, key links, structural icons, lifecycle time capsules, and the RTI REQUEST start block. It is the system's dominant interactive and civic color.
- **Deep Civic Navy:** Hovered primary actions, footer ground, and the strongest heading emphasis.
- **Civic Navy Wash:** Selected choices, icon fields, quiet informational emphasis, and muted lifecycle process blocks (no-reply / no-decision) where a solid navy block would be too strong.

### Secondary

- **Saffron Signal:** A sparse highlight for active underlines, keyboard-hot lifecycle hits, and complaint-branch strokes. It never becomes a general fill.
- **Saffron Wash:** Complaint nodes and complaint next-chips on a light field.

### Tertiary

- **Confirmation Green:** Ready, allowed, satisfied, and citizen-confirmed states. Pair color with explicit text or an icon; never rely on color alone.
- **Refusal Red:** Exemption refusals, errors, `NOT_SUBMITTED` receipt status, and not-satisfied lifecycle outcomes. Red is semantic, not promotional.
- **Caution Amber:** Local fallback, uncertainty, and operational caution states.
- **Appeal Teal:** First and second appeal blocks on the official lifecycle map, and appeal next-chips. Teal is a process-kind signal, never a page accent.

### Neutral

- **Paper Ground:** The slightly warm page background that separates the service from stark portal white.
- **Surface:** Primary workspace, content, field, navigation-action surfaces, and white lifecycle process blocks.
- **Soft Surface:** Toolbars, inactive tabs, and quiet grouped regions.
- **Ink / Soft Ink / Faint Ink:** Three levels for primary content, supporting explanation, and metadata.
- **Rule / Strong Rule:** One-pixel dividers and form boundaries; use the stronger rule for controls that need a clearer affordance.

### Named Rules

**The Navy Owns Action Rule.** Navy is the only general-purpose interactive color. Saffron, green, amber, red, and teal stay semantic.

**The Signal, Not Decoration Rule.** Tricolour hues appear in the four-pixel top rule and selected lifecycle or state cues; they never become large decorative fields.

**The Independent Service Rule.** Civic colors and the State Emblem may orient the citizen, but they must always be paired with the independent-assistance label and adjacent truth boundary. Never use them to imply government affiliation, connection, filing, or endorsement.

## Typography

**Display Font:** Public Sans with system sans fallbacks

**Body Font:** Public Sans with system sans fallbacks

**Devanagari Font:** Noto Sans Devanagari with system sans fallbacks

**Character:** One public-service sans family carries the entire Latin hierarchy, moving from broad, tightly tracked headings to compact operational labels without changing personality. Devanagari is a first-class identity script, not a decorative subtitle.

### Hierarchy

- **Display** (630, responsive 2.65–4.05rem, 1.02 line-height): First-viewport proposition only. Keep it modest in width and balance the lines; do not turn it into an oversized campaign slogan.
- **Headline** (630, responsive 2–3.25rem, 1.1 line-height): Major public-information sections and closing calls to action.
- **Workspace Title** (500, 1.75–2rem, 1.1 line-height): One task or decision per application stage.
- **Body** (400, 1rem, 1.55–1.72 line-height): Explanations and instructional text, typically capped around 53–64 characters per line.
- **Label** (680–750, 0.64–0.79rem, 0.03–0.2em tracking): Metadata, step numbers, statuses, and control labels. Uppercase is reserved for short operational readouts.
- **Devanagari Identity** (400, 0.9rem, 1.45 line-height): The Hindi service name within the brand lockup.

### Named Rules

**The One Sans Rule.** Do not introduce a serif, display face, or code-style monospace. Public Sans creates hierarchy through size, weight, tracking, and case; `.font-mono` remains the same family with compact operational tracking.

**The Bilingual Peer Rule.** Hindi and English identity text must read as coordinated peers with correct Noto Sans Devanagari shaping, never as ornamental script.

## Layout

The public surface uses a centered 1240px container with 28px desktop gutters, 22px tablet gutters below 860px, and 18px mobile gutters below 640px. The opening composition is a 40/60-style split: a concise proposition and primary action on the left, with the larger working speech-to-records transformation on the right. It becomes a single column below 1100px without changing reading order.

Major sections breathe on an 88–140px vertical rhythm. Information inside workspaces is denser: toolbars are about 46px high, fields and action groups use 8–18px gaps, and card padding typically sits between 22px and 30px. The system uses borders and whitespace to group content before reaching for cards.

Ordered processes use visible connectors on wide screens and a vertical reading path below 860px. Two-column safeguards collapse to one column at the same breakpoint. Below 640px, the transformation stacks transcript, directional connector, and draft; actions become full width where useful; the lifecycle map drops its side borders and radius, pulls −22px to the viewport edge, and pans horizontally with the opening view pinned on RTI REQUEST; and all primary targets remain at least 44px tall.

Viewport reveals are progressive enhancement. Sections rise, wipe, or focus once at approximately 12% intersection with a lower root margin; content already near the first viewport is shown immediately. The record-to-request sequence may animate in order, but page reading order and task state must remain clear without motion.

### Named Rules

**The Workspace Leads Rule.** Show the product mechanism as one coherent work surface; never replace it with a grid of feature cards or promotional statistics.

**The Reading Order Rule.** Responsive layouts may stack or simplify, but transcript always precedes transformation and prepared records, and official filing always follows independent preparation.

## Elevation & Depth

This is a flat-by-default system. Navy mastheads, white work surfaces, soft neutral bands, and one-pixel rules create depth through tonal contrast. Shadows are reserved for the signature transformation, primary application papers, and slight action feedback; they never create floating glass layers.

### Shadow Vocabulary

- **Panel Shadow** (`0 22px 60px -38px rgba(23, 32, 45, 0.44)`): The first-viewport transformation workspace only, or an equally important composite work surface.
- **Paper Shadow** (`0 18px 45px -32px rgba(8, 47, 91, 0.48)`): Main task papers in the drafting and administration workspaces.
- **Action Shadow** (`0 10px 25px -18px rgba(8, 47, 91, 0.7)`): Subtle primary-action presence; deepen slightly on hover while moving no more than two pixels.

### Named Rules

**The Flat Civic Rule.** Solid fills and rules do the structural work. Do not use translucency, backdrop blur, gradients, colored glow, or ornamental floating layers.

**The Rare Lift Rule.** A shadow identifies a major work object or interaction state, never an ordinary content block.

## Shapes

Corners are compact and functional. Use 6px for tabs and tight controls, 7–8px for buttons and small icon fields, and 10–12px for inputs and task papers. The 14px transformation shell is the single softer signature container. Circular geometry is reserved for microphones, numbered markers, step icons, and small state dots.

Borders are one pixel and neutral by default. State changes may shift a border to navy, green, saffron, amber, or red, always with text or an icon. Full pills are limited to compact status or internal utility chips — including lifecycle time capsules; primary calls to action stay rectangular.

### Named Rules

**The Compact Corner Rule.** Most surfaces live between 6px and 12px. Do not reintroduce oversized 20px cards or pill-shaped primary actions.

**The Circle Means Sequence Rule.** Circles denote voice input, ordered progress, or a compact state marker; they are not general decoration.

## Components

The component family feels precise, calm, and reviewable. Every state explains itself in words, every icon is an authored SVG with a 1.5–1.7px outline, and no component implies an action the service did not perform.

### Buttons

- **Shape:** Rectangular with compact soft corners (usually 8px), a minimum 44px target, and 12px vertical padding for primary actions.
- **Primary:** Solid civic navy with white text and an authored 18–20px SVG icon when the action benefits from one.
- **Hover / Focus:** Deepen to navy-deep and lift one or two pixels. Keyboard focus is a three-pixel saffron outline with a three-pixel offset.
- **Light:** White on navy for the masthead or closing action region; its hover moves toward a warm cream.
- **Secondary:** White, one-pixel strong rule, navy label, and a subtle navy-wash hover. Text links use an underline rather than button chrome.

### Chips

- **Style:** Compact 5–8px corners, one-pixel border, 0.64–0.75rem label text, and restrained tracking.
- **State:** Active choices use navy wash with navy border and text. Green means confirmed or live, amber means fallback or uncertain, and red means error or refusal. State text is mandatory.

### Cards / Containers

- **Corner Style:** Task papers use 12px; the transformation shell uses 14px; unboxed columns and ruled regions are preferred for ordinary content.
- **Background:** White or the soft neutral surface, never translucent.
- **Shadow Strategy:** Refer to the Rare Lift Rule; most containers use no shadow.
- **Border:** One-pixel neutral rule when separation is not already provided by background or whitespace.
- **Internal Padding:** Typically 22–30px for work areas and 16–20px for compact states.

### Inputs / Fields

- **Style:** White solid fill, strong one-pixel neutral border, 8–12px corners, and 14–15px body text.
- **Focus:** Navy border with a quiet four-pixel navy wash ring; the global saffron focus outline remains visible for keyboard navigation.
- **Error / Disabled:** Error copy and border use refusal red; disabled controls retain their label and reduce opacity without disappearing.

### Navigation

The four-pixel tricolour rule and light-gray utility bar precede the solid civic-navy masthead. The lockup combines the State Emblem, bilingual Praja RTI name, and an explicit “Independent Citizen Assistance” context label. Desktop navigation is plain light text with a saffron hover underline; it hides below 860px while the home or start action remains available. The masthead must be followed by the independent-service truth strip on citizen-facing routes.

### Speech-to-Records Workspace

This is the signature pattern. A quiet toolbar labels the draft workspace and review status. The left region holds an editable transcript and restrained green waveform; a bordered directional rail bridges to the right region, where numbered navy markers organize neutral requests for records. On mobile the rail rotates downward so the same transformation reads top to bottom. Copy and download controls are secondary and the output always retains a plain not-filed statement.

### Lifecycle and Process

The official RTI Online lifecycle is an interactive four-lane map — PIO, Applicant, FAA, CIC/SIC — redrawn for this desk. It is not a static illustration and not a government thumbnail. Lane washes stay quiet; numbered lane labels sit in tracked operational type. Connectors are 1.7px ink paths that thicken to 2.5px navy when live.

Semantic node kinds are fixed: navy capsules for statutory time limits; white navy-stroked rectangles for process; navy-wash rectangles for silence or default process; green for satisfied/closed; red for not satisfied; teal for appeal; saffron-wash with a saffron stroke for Section 18 complaint. Pair every color with a label. Hover, tap, or keyboard focus lights the active block and the next connected stages — one hop when the node branches, two hops on a linear path, so two or three neighbors come up with the active step. Unrelated nodes, edges, and annotations dim to about 18% opacity. A dock under the map names the lit step, explains it in plain language, and shows next-step chips; with nothing selected it invites the citizen to trace a request.

Every node is a tabbable button. Focus lights the same path, draws the saffron focus stroke on the hit target, and scrolls the node into view. Enter or Space pins; Escape clears the pin. A details list restates the same sequence for linear reading. The original RTI Online flowchart is cited as a text link in the source line, never as an embedded image. On viewports below 640px the chart bleeds to the page edge, the SVG keeps a 980px minimum and pans horizontally, and the first scroll position is centered on RTI REQUEST.

**The Lit Path Rule.** Lighting a lifecycle node highlights that node and the next connected stages only. Dim the rest; never flood the whole map.

**The Source Is Text Rule.** Cite the official flowchart as a text link. Do not embed a thumbnail of the government image.

### Preparation Receipt

Receipts summarize the citizen's work only. The status `NOT_SUBMITTED` is red and explicit; nearby copy must say that no payment was processed and nothing was sent to a government system. Never style the receipt as an official acknowledgement, government stamp, or filing confirmation.

### Motion

Controls transition in roughly 150–200ms. Request lines reveal over 650ms with 160ms staggering; application-stage content enters over 360ms; and viewport sections reveal over 720–820ms with the emphasized ease `cubic-bezier(0.16, 1, 0.3, 1)`. Lifecycle path lighting uses the same 180ms opacity shift; the hot node lifts one pixel. `prefers-reduced-motion` reduces animation and transition durations to effectively zero and disables smooth scrolling.

## Do's and Don'ts

### Do:

- **Do** lead citizen-facing pages with the bilingual civic identity, explicit independent-assistance label, and adjacent truth strip.
- **Do** show speech becoming numbered, records-focused requests in one visible workspace.
- **Do** separate independent preparation from official filing in layout, labels, links, and receipt states.
- **Do** use Public Sans, Noto Sans Devanagari, one-pixel rules, compact corners, and solid surfaces.
- **Do** pair semantic color with plain-language status text and authored SVG icons.
- **Do** preserve reading order, 44px targets, keyboard focus, scalable text, and reduced-motion behavior.

### Don't:

- **Don't** imply that Praja RTI is a government portal, connects to a government system, files an application, accepts a payment, or produces an official receipt.
- **Don't** use the State Emblem as a product seal, watermark, success stamp, or substitute for the independent-service disclosure.
- **Don't** use purple, gradients, glass effects, decorative glow, or a return to the discarded leather or editorial visual worlds.
- **Don't** use public-facing “demo” wording, promote a statutory price, or make the service sound like a hackathon pitch.
- **Don't** build promotional feature-card grids, oversized headlines, excessive rounded cards, pill-shaped primary actions, or decorative dash characters.
- **Don't** introduce icon libraries when an authored, accessible inline SVG fits the civic line-icon grammar.
