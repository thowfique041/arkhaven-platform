# Reference Analysis

Reference: https://www.ibnawwamproperties.com (explored 21 Nov 2026 in a live browser at ~800px and mobile widths).

This document records what was observed so the new platform could match the *quality and structure* of the reference without copying its brand, copy, images or code.

## 1. Site map (all reachable routes)

| Route | Purpose |
|---|---|
| `/` | Homepage |
| `/projects` | Project listing with filters |
| `/projects/:slug` | Project detail (e.g. `siblings-tower`, `luminous-tower`, `divine-palace`) |
| `/about` | About section (short; reuses the homepage "About" block) |
| `/videos` | YouTube tours and construction progress videos |
| `/blogs`, `/blogs/:slug` | Buyer guides / insights |
| `/contact` | Contact details + inquiry form |
| `/customer/login` | Customer portal login (no self sign-up) |
| `/admin` | Admin entry (linked from footer) |
| `tel:`, `mailto:`, `wa.me` | Direct contact; WhatsApp is the primary CTA everywhere |

## 2. Header and navigation

- Thin announcement bar on top (dark navy): "Book a private consultation…" on the left, phone number on the right.
- Sticky white header: logo left; "Login" text link, WhatsApp pill button, and a hamburger menu on the right (menu used even at tablet width).
- Floating "Chat on WhatsApp" button bottom-right, plus a dismissible chat-bubble prompt ("Need help choosing a home?").

## 3. Homepage structure (top to bottom)

1. **Hero**: full-bleed architectural photo with a navy gradient overlay; small uppercase eyebrow ("PREMIUM REAL ESTATE IN BANGLADESH"); very large serif H1; one-line subtitle; three CTAs (primary filled, outlined, WhatsApp green). A translucent panel at the bottom of the hero lists three value points with icons.
2. **About**: eyebrow + serif headline + paragraph + three checklist bullets.
3. **Featured projects**: cards with status badge (Upcoming / Ongoing), location, name, one-line description, beds / baths / sft row, WhatsApp link and "View project details".
4. **Preferred communities**: neighborhood cards (area, title, one-liner).
5. **Why choose us**: four pillars (documentation, planning, progress transparency, advisors).
6. **Videos and reviews**: two video cards + three short testimonials (name + role).
7. **Insights**: three blog cards.
8. **Consultation CTA**: dark band with WhatsApp + "Talk to Sales".
9. **Footer**: brand blurb, company links, phone, WhatsApp, email, address, copyright, small "Admin" link.

## 4. Project listing

- Dark hero band with eyebrow "PROJECTS" and serif H1.
- Filter panel: free-text search, Status (upcoming / ongoing / ready / sold), Type, Area, Bedrooms, Reset. Result count shown ("3 projects found").
- Same card component as the homepage.

## 5. Project detail

- Full-width hero image with status badge, project name, address, WhatsApp CTA.
- Headline + long description.
- Key spec tiles: Size, Bedrooms, Bathrooms, Parking, Handover.
- Amenities list (bedrooms, balconies, lift, parking, community hall, generator, CCTV…).
- "Project facts": land area, floors (G+9), units (27 flats), price ("Contact for pricing").
- FAQ accordion, inquiry form (name, phone, email, message), gallery at the bottom.
- Content loads client-side after a skeleton state (noticeable delay on first paint).

## 6. Customer portal login

- Split layout: left brand panel with emotional copy ("A place to follow your next chapter"), right sign-in form (username + password).
- Explicitly states accounts are created by the team after purchase; password reset goes through the account manager. No registration.

## 7. Visual language

| Aspect | Observation |
|---|---|
| Palette | Deep navy `rgb(23,43,76)`, royal blue `rgb(3,72,139)`, slate text `rgb(52,64,84)` / `rgb(102,112,133)`, light blue accent `rgb(156,195,238)`, off-white `rgb(247,249,252)`, WhatsApp green `rgb(18,140,74)` |
| Typography | Headings: Georgia serif, bold, H1 ≈ 65px, H2 ≈ 34px. Body/UI: Inter. Small uppercase tracked eyebrows above every section headline |
| Shape | Cards mostly square or 8px radius; pill buttons for WhatsApp; thin 1px borders |
| Imagery | Large architectural photography, dark overlays on heroes |
| Spacing | Generous vertical rhythm (~96px between sections), narrow content column for text |
| Motion | Subtle: fade/slide on scroll, skeleton loaders, hover lift on cards |
| Responsive | Single-column stacks on mobile; hero CTAs wrap; filter panel stacks above results; hamburger menu |

## 8. UX flow

Visitor → hero CTA → projects → project detail → WhatsApp / inquiry form. Buyers later receive portal credentials from the company and log in to follow progress and payments.

## 9. What we keep, what we change

**Keep (pattern level):** eyebrow + serif headline section rhythm; status-badged project cards with key specs; filterable listing; spec tiles on the detail page; dark consultation CTA band; split-screen portal login; no public sign-up.

**Change / improve:**
- Entirely new brand (Arkhaven Properties), palette (ink green + brass + stone instead of navy/blue), typefaces (Fraunces + Manrope), logo, copy and imagery.
- Server-data-driven everything: project facts, flats, availability and progress all come from MongoDB and are editable in the admin panel.
- Richer detail page: unit availability table, floor plans, construction timeline with stage progress, map embed.
- Full customer portal (payments ledger, receipts as PDF, construction stages, photos, announcements).
- Full admin/CRM (leads pipeline, customers, flats, payments verification, progress, CMS, activity log).
- Added a **Landowners** page (joint-venture / land-share inquiries), which is how most Dhaka developers source land.
- Faster first paint: skeletons are short and the listing uses cached queries.
