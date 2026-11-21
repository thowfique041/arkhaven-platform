# Arkhaven Properties: Brand Guidelines

## 1. Name selection

Ten candidates were generated and scored 1 to 5 on uniqueness, professionalism, memorability and fit for a property developer.

| # | Name | Unique | Professional | Memorable | Fit | Total | Note |
|---|---|---|---|---|---|---|---|
| 1 | **Arkhaven Properties** | 5 | 5 | 5 | 5 | **20** | "Ark" (arch, shelter) + "haven" (safe home). Short, ownable, easy to say in Bangla and English |
| 2 | Lintel & Stone | 4 | 4 | 4 | 4 | 16 | Architectural, but sounds like a materials supplier |
| 3 | Plinth Developments | 4 | 4 | 3 | 4 | 15 | Strong meaning, harder to pronounce for many buyers |
| 4 | Meridian Keystone | 3 | 5 | 3 | 4 | 15 | Long; "Meridian" is crowded |
| 5 | Corbel Living | 4 | 4 | 3 | 3 | 14 | Obscure term |
| 6 | Northgable Homes | 4 | 4 | 4 | 3 | 15 | Feels Western-suburban |
| 7 | Bastion Row | 4 | 3 | 4 | 3 | 14 | Militaristic connotation |
| 8 | Tessera Estates | 3 | 4 | 3 | 3 | 13 | Common in tech branding |
| 9 | Verandah Developers | 3 | 3 | 4 | 4 | 14 | Generic |
| 10 | Shaleford Properties | 4 | 4 | 2 | 3 | 13 | Low recall |

**Selected:** Arkhaven Properties Ltd. Tagline: *"Built with care. Handed over with trust."*

## 2. Logo

Concept: a **gable** (the roof line, which also reads as the letter A) sheltering an **arched doorway** (the haven). The crown of the arch sits where an A's crossbar would be, so the mark is both a monogram and a house.

Files (in `client/public/assets/brand/`):

| File | Use |
|---|---|
| `arkhaven-logo-primary.svg` | Default lockup on light backgrounds |
| `arkhaven-logo-light.svg` | Light backgrounds, softer secondary line (documents, receipts) |
| `arkhaven-logo-dark.svg` | Dark / photo backgrounds |
| `arkhaven-mark.svg`, `arkhaven-mark-light.svg` | Symbol only (avatars, small headers) |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png` | Browser and app icons (in `client/public/`) |
| `*.png` lockups | Raster proofs at 6x for slides and print previews |

All lettering is converted to vector outlines, so the SVGs render identically everywhere and scale to any print size.

Rules: keep clear space equal to the door width on all sides; minimum width 120px for the lockup, 16px for the mark; never recolor the door anything other than Brass; never stretch, outline or add shadows.

## 3. Color

| Token | Hex | Role |
|---|---|---|
| Ink | `#12312B` | Primary brand color, headers, dark sections, primary buttons |
| Ink 900 | `#0B201C` | Deepest backgrounds, admin sidebar |
| Brass | `#B08D57` | Accent: eyebrows, highlights, focus, the doorway |
| Brass light | `#D9C29A` | Accent on dark backgrounds |
| Mist | `#EEF1EE` | Cool limestone background for alternating sections (deliberately not cream) |
| Paper | `#FFFFFF` | Cards and main background |
| Charcoal | `#1B1F1E` | Body text |
| Slate | `#5B6B66` | Secondary text |
| Line | `#DCE2DE` | Borders and dividers |
| Status | Success `#2F7D5B`, Warning `#B7791F`, Danger `#B4443A`, Info `#2F5F8A` | Badges only |

Ratio guide: 60% Paper/Mist, 30% Ink, 10% Brass. No gradients except the dark photo overlay.

## 4. Typography

- **Display / headings:** Fraunces (variable, optical size on), weight 500 to 600. Tight leading (1.05 to 1.15).
- **Body / UI:** Manrope (variable), weight 400 to 700.
- **Section labels:** Manrope 600, 13px, sentence case, Brass. Used only when the label adds information (e.g. a project's status or area), never as decoration above every heading.
- Fonts are self-hosted via `@fontsource-variable` (no Google Fonts call, no layout shift from a third party).

Scale (desktop): H1 64 / H2 44 / H3 28 / H4 20 / body 16 / small 14 / micro 12.

## 5. Shape, layout and motion

- Corners: 2px on buttons and inputs, 4px on cards. Deliberately crisp and architectural; avoid big rounded cards.
- Borders over shadows. Shadows only on hover lift and floating menus.
- 12-column grid, 1280px max content width, 96 to 128px section spacing on desktop.
- The signature element is the live construction ledger in the homepage hero: real progress per project, straight from the database. Other sections stay quiet.
- Motion: one orchestrated hero reveal on load; elsewhere motion only responds to user actions (opening, expanding, confirming).
- All motion respects `prefers-reduced-motion`.

## 6. Voice

Calm, precise, accountable. Use concrete facts (floors, units, handover dates) over adjectives. Never promise returns or prices that are not in the database.

## 7. Admin and portal

Same tokens, different structure: the admin uses a dark Ink 900 sidebar, dense tables and Manrope-only headings for scanability; the customer portal uses the Mist background with Fraunces headings, closer to the public site.
