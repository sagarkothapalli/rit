# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript. React Bits (MCP-fetched: BlurText, Aurora) for motion. Static-friendly; deploy target not yet chosen.

## Users

Indian citizens previewing Praja-RTI before they would file an RTI. Most are comfortable speaking rather than typing formal legal English/Hindi; many prefer regional languages or Hinglish code-mixing; literacy levels vary. They arrive unsure what an RTI is, and unsure whether to trust a non-government site. Hackathon judges may also visit, but the public landing is built for citizens first.

## Product Purpose

Turn a spoken complaint ("the road near my house is broken, where did the budget go?") into a properly worded RTI application for specific records, recommend the right public authority, and create a reviewable application PDF plus a locally stored Praja acknowledgement — so the citizen leaves with a complete application record and a confident destination choice, not a grievance rejected as inadmissible.

## Positioning

The product never claims to file with the Government of India. It prepares and routes. Its differentiated mechanism is the same in two places: it separates *grievance language* from the *records request* underneath, and it explains *why* it suggests the public authority it does. It creates a complete local application record without silently choosing an authority, processing payment, or implying Government submission.

## Operating Context

- User has just decided (or is considering) to file an RTI. They may be on a phone, on a low-bandwidth connection, in a regional language, and unfamiliar with the official portal.
- They will compare the product's claims to the actual Central portal (`rtionline.gov.in`, which displays a 2,916-authority heading). Praja's independent-service boundary is always visible.
- The local outcome is an application PDF and Praja acknowledgement receipt with a `NOT_SUBMITTED` status. No money moves. No official filing happens. The product must never imply otherwise.

## Capabilities and Constraints

- Voice / text / photo intake. Multilingual: Hindi, English, Hinglish in scope; additional languages are aspirational.
- Agent-authored editable RTI application — 3–5 numbered, specific, records-focused requests; never invents facts; asks one plain follow-up when something material is missing.
- Exemption guard (Section 8(1)): if a request targets exempt material (national security, cabinet papers, an official's personal details unconnected to public duty), the agent does not draft and returns a plain-language reason summary instead.
- Photo evidence: vision pass extracts only what is clearly observable; every finding is read back and only enters the draft after the citizen confirms it; images are referenced as attached supporting evidence, never as accusations.
- Routing: exactly 3 explained candidates on a successful match; a reconciled Central RTI Online directory is supplemented by explicit State-jurisdiction rules so named State projects are not forced into the wrong Central authority. Manual search and override remain available.
- Verification: local OTP gate before confirmation; deterministic code for offline and appathon use.
- Fee preview: ₹10 (BPL ₹0), no payment processing, idempotent local Praja acknowledgement, `government_submission_status: NOT_SUBMITTED`.
- Sandbox notifications: test email/SMS with on-screen fallback; no production delivery.
- Stored applications: application and receipt PDFs are saved with the acknowledgement; Postgres is used when configured, with browser IndexedDB as the static/offline fallback. Home-page retrieval supports acknowledgement number or local email/OTP access.
- Directory data: dated RTI Online snapshot with 2,907 unique Central public-authority IDs, reconciled against the portal's 2,916 heading, 3,114 rendered rows, and 207 duplicate IDs. Curated jurisdiction rules are kept separate and labelled.
- Deterministic no-key mode: the full preparation path works with zero credentials, every adapter labelled.

## Brand Commitments

- Independent civic-tech hackathon concept. Not affiliated with the Government of India.
- No official emblems, seals, `gov.in` look-alike styling, or affiliation copy.
- Intake, verification, preview, receipt, and history repeat the independent-service boundary in plain language.
- Honest internal vocabulary only: `Draft`, `Authority selected`, `Mock payment pending`, `Prepared`, `Simulated submission complete`, `Receipt generated`, `Notification sent/failed`, `Deleted`. Never `accepted`, `received by department`, `under CPIO processing`, `reply received`, `decided`.
- Voice: minimal, accessible, plain language, multilingual-aware, low-literacy-tolerant.
- Accessibility: WCAG 2.2 AA intent; large tap targets, contrast, keyboard, reduced-motion, scalable text, screen-reader parity.
- **Visual world: leather-stitched reading shelf** (skeuomorph). Confirmed in new-work, seed key `eac0b48e`, challenger `digital-design-canon-skeuomorph-leather-studio`. The product's surface renders each draft, receipt, and signed acknowledgement as a real physical object on a desk — leather folder, typed page, stamped card, brass-stamp controls. Commits fully to the system grammar of that world across navigation, content, controls, and states. Survives only at full fidelity.

## Evidence on Hand

- Live `/Volumes/Untitled/varun/plan.md` — authoritative product spec (flows, API, data model, must-pass checks, demo script).
- `praja-rti-plan.pdf` — 2-page plan artifact (flowchart + summary).
- Live `rtionline.gov.in/request/allpa.php` verified at 2,916 public authorities (Aug 2026).
- `web/` — Next.js 16 scaffold with current landing page; three React Bits components (BlurText, Aurora, Magnet — Magnet removed from CTAs per the user's stability feedback).
- `web/app/page.tsx` is the current landing surface; `/request` is the nine-stage drafting workflow and `/demo` remains an alias.

## Product Principles

1. Prepare, never pretend to file. Every consequential screen is honest about the Government boundary; the citizen never walks away thinking they filed with the Government of India.
2. Records over grievances. The agent's job is to convert a complaint into a request for material records — never a re-statement of the complaint.
3. Explain, don't auto-choose. Routing recommendations and the sensitive-request refusal both come with reasons the citizen can challenge.
4. Citizen confirms every consequential action. Silence, navigation, or successful OTP is not confirmation; acknowledgement storage never runs without explicit consent.
5. Reconcile before claiming completeness. Display the official heading and the deduplicated snapshot count together, retain the duplicate-row audit, and label every non-directory jurisdiction rule.

## Accessibility & Inclusion

- Multilingual: at minimum Hindi + English + Hinglish on the public surface; copy must localise, not be hard-coded.
- Voice-first with complete text fallback; transcript visible and editable.
- WCAG 2.2 AA: contrast, focus, ≥44 px targets, 200% zoom reflow, reduced-motion, screen-reader parity for recording and state changes.
- Low-bandwidth tolerant: text-first defaults; recordings kept short.
- Low-literacy tolerant: avoid dense legal language, use plain Hindi/English, one decision per screen.
