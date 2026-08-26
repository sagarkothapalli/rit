# Landing asset manifest

Approved composition: `.impeccable/mocks/landing-option-a.png`
Surface brief: `.impeccable/landing-surface-brief.md`

## Decision

No additional raster assets are needed. Do not generate a hero image, background texture, lifecycle diagram, icon sheet, or emblem variant. The approved composition is deliberately flat and interface-led; extra bitmap artwork would weaken both its civic restraint and its responsive accessibility.

## Existing raster assets

| Asset | Dimensions | Role | Production guidance |
| --- | ---: | --- | --- |
| `public/india-emblem-white.png` | 371 x 537 PNG with alpha | Three-lion India emblem in the masthead and compact footer identity | Reuse the sourced file. On the navy masthead, invert the monochrome artwork and use `mix-blend-mode: screen` so dark linework reads white and light fill falls into the navy field. Preserve aspect ratio and use `object-fit: contain`; do not redraw, crop, trace, or AI-regenerate the emblem. On a light footer, render it without the masthead treatment. Provide an accessible text identity adjacent to it; decorative duplicate instances should have empty alt text. |
| `public/rti-lifecycle.jpg` | 571 x 543 JPEG | Official RTI Online lifecycle reference and provenance | Do not embed it as the primary lifecycle UI. Its small raster labels and fixed branching chart are not reliably legible or responsive. Adapt the same reply, transfer, no-reply, first-appeal, Section 18 complaint, and CIC/SIC branches as semantic HTML ordered/branching content with CSS connectors, and link to the official RTI portal/source. |

## Code-owned visuals

Keep the hero speech waveform, microphone, document, download, copy, service-path symbols, safeguard symbols, arrows, lifecycle connectors, and status markers as authored SVG, CSS, and semantic HTML. Keep all labels and numbers as selectable text. Motion belongs to the speech-to-records conversion and viewport reveals, with a reduced-motion fallback.

## Product-truth note

The approved comp and landing brief explicitly require the emblem, while `PRODUCT.md` still says official emblems must not be used. For this landing build, the approved brief is the newer surface-specific authority. Retain the adjacent “Independent Citizen Assistance” label and avoid any copy that claims affiliation, filing, acceptance, or government operation.
