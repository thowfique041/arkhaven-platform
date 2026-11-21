# Arkhaven API

Base URL: `/api` (same origin as the website in production; `http://localhost:4000/api` in development).

## Conventions

- **Auth:** an `httpOnly` cookie `akh_token` (JWT, 7 days) is set by `POST /auth/login`. A `Authorization: Bearer <token>` header is also accepted. Every request re-checks the user in the database, so deactivation and password resets take effect immediately.
- **Roles:** `superadmin`, `admin` (together "staff"), `customer`. Permissions are enforced on the server for every route; the frontend guards are only for navigation.
- **Money:** all amounts are **integers in poisha** (1 BDT = 100 poisha), in fields ending in `Minor` (`priceMinor`, `amountMinor`, `agreedPriceMinor`, `budgetMinor`). Totals are always computed on the server.
- **Success response:** `{ "success": true, "data": …, "meta"?: { page, limit, total, pages, … } }`
- **Error response:** `{ "success": false, "error": { "code", "message", "details"? } }`
- **Status codes:** 200 OK, 201 Created, 400 bad input, 401 not signed in, 403 not allowed, 404 not found (also used when a customer requests another customer's record), 409 conflict (duplicate, over balance, booked unit), 415 bad file type, 422 validation error, 429 rate limited, 503 uploads not configured.
- **Pagination:** `?page=1&limit=20` on list endpoints (max 100 unless noted).
- **Rate limits:** login and bootstrap 10 failed attempts / 15 min / IP; public forms 15 / hour / IP; all API 300 / minute / IP.

Legend: 🌐 public · 👤 any signed-in user · 🧑‍💼 staff (admin + super admin) · 👑 super admin · 🏠 customer

---

## /auth

| Method | Path | Access | Body / notes |
|---|---|---|---|
| POST | `/auth/login` | 🌐 | `{ identifier, password }`: identifier is email or username (customer usernames look like `akh-260001`). Returns `{ user, customer }` and sets the cookie. |
| POST | `/auth/logout` | 🌐 | Clears the cookie. |
| GET | `/auth/session` | 🌐 | Current `{ user, customer }` or `null`. |
| GET | `/auth/me` | 👤 | Current `{ user, customer }`; 401 if not signed in. |
| PATCH | `/auth/me` | 👤 | Staff: `{ name?, phone?, notificationPrefs? }`. Customers: `{ phone?, email?, address? }` only. |
| POST | `/auth/change-password` | 👤 | `{ currentPassword, newPassword }` (8+ chars, letter + number). Clears `mustChangePassword`, signs out other sessions. |
| POST | `/auth/bootstrap` | 🌐 | `{ token, name, email, password }`. Creates the first Super Admin. Works only when `BOOTSTRAP_TOKEN` is set **and** no Super Admin exists. |

There is **no registration endpoint**.

## /users (staff accounts)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/users?search=` | 👑 | Staff list |
| POST | `/users` | 👑 | `{ name, email, phone?, role: admin\|superadmin }` → `{ user, credentials: { username, temporaryPassword } }` (shown once) |
| PATCH | `/users/:id` | 👑 | `{ name?, phone?, role?, isActive? }`. Cannot demote/deactivate yourself or the last Super Admin. |
| POST | `/users/:id/reset-password` | 👑 | → new one-time credentials |
| DELETE | `/users/:id` | 👑 | |

## /projects

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/projects?status=&type=&area=&search=&featured=&page=&limit=` | 🌐 | Published projects with computed `units` counts and `progress`. `meta.areas` lists filterable areas. |
| GET | `/projects/slug/:slug` | 🌐 | Full public project incl. `flats` (no customer data; prices only for available units), `units`, `progress.stages`. |
| GET | `/projects/admin` | 🧑‍💼 | Same filters, includes unpublished. |
| GET | `/projects/admin/:id` | 🧑‍💼 | |
| POST | `/projects` | 🧑‍💼 | Project body (name required). Slug auto-generated and de-duplicated. Also creates its construction record. |
| PATCH | `/projects/:id` | 🧑‍💼 | Partial update |
| DELETE | `/projects/:id` | 🧑‍💼 | 409 if any customer belongs to the project. Removes its flats and progress. |
| POST | `/projects/:id/images` | 🧑‍💼 | multipart `images[]` (≤12, ≤8 MB, jpg/png/webp/avif), `target=gallery\|cover` |
| DELETE | `/projects/:id/images/:imageId` | 🧑‍💼 | |

Project body fields: `name, slug, tagline, description, type (residential|commercial|mixed-use), status (upcoming|ongoing|completed), featured, published, sortOrder, location{address, area, city, lat, lng, mapEmbedUrl}, coverImage{url}, gallery[{url, caption}], floorPlans[{title, sizeSqft, bedrooms, bathrooms, image}], amenities[], facilities[], specs{landArea, totalFloors, floorsLabel, unitsPerFloor, parking, frontRoad, structure, typicalSizeSqft, bedrooms, bathrooms}, construction{architect, engineer, contractor, startedAt, foundation, materials}, priceFromMinor, expectedCompletion, faqs[{q, a}]`.

## /flats

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/flats?project=&status=&search=` | 🧑‍💼 | `limit` up to 500 |
| GET | `/flats/:id` | 🧑‍💼 | |
| POST | `/flats` | 🧑‍💼 | `{ project, unitNumber, floor, sizeSqft, bedrooms, bathrooms, balconies, facing, parking, priceMinor }`. `(project, unitNumber)` is unique. |
| POST | `/flats/bulk` | 🧑‍💼 | `{ project, floors:{from,to}, units:[{ suffix, sizeSqft, bedrooms, bathrooms, balconies, facing, priceMinor }] }` creates `<floor><suffix>` units |
| PATCH | `/flats/:id` | 🧑‍💼 | Booked/sold require an assigned customer; assigned units cannot be set to available. |
| DELETE | `/flats/:id` | 🧑‍💼 | 409 if assigned |

## /leads (CRM)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/leads?status=&source=&project=&followUp=due\|upcoming&search=&sort=followUp` | 🧑‍💼 | `meta.counts` gives totals per status |
| POST | `/leads` | 🧑‍💼 | `{ fullName, phone, email?, address?, interestedProject?, interestedFlat?, budgetMinor?, source, status, notes?, followUpDate?, createAccount?, inquiry? }`. With `createAccount: true` returns one-time `credentials`. |
| GET | `/leads/:id` | 🧑‍💼 | Includes `history` (newest first) |
| PATCH | `/leads/:id` | 🧑‍💼 | Partial update, recorded in history |
| PATCH | `/leads/:id/status` | 🧑‍💼 | `{ status, note? }`: `new, contacted, interested, site_visit_scheduled, negotiation, booked, converted, lost` (converted only via convert) |
| POST | `/leads/:id/notes` | 🧑‍💼 | `{ note }` |
| POST | `/leads/:id/follow-up` | 🧑‍💼 | `{ followUpDate, note? }` |
| POST | `/leads/:id/convert` | 🧑‍💼 | `{ project?, flat?, agreedPriceMinor?, bookingDate?, flatStatus? }` → `{ lead, customer, credentials }`. Books the unit atomically. |
| DELETE | `/leads/:id` | 🧑‍💼 | 409 if it has a customer |

## /customers

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/customers/me` | 🏠 | Own profile, project, flat, `summary`, `progress`, `payments`, latest `announcements`. Internal notes are removed. |
| GET | `/customers?search=&project=` | 🧑‍💼 | Each row has a computed `summary` |
| POST | `/customers` | 🧑‍💼 | `{ fullName, phone, email?, address?, project?, flat?, bookingDate?, agreedPriceMinor?, notes?, lead?, flatStatus? }` → `{ customer, credentials }` |
| GET | `/customers/:id` | 🧑‍💼 | Full view incl. payments with audit |
| PATCH | `/customers/:id` | 🧑‍💼 | Agreed price cannot drop below paid + pending |
| GET | `/customers/:id/assignable-flats?project=` | 🧑‍💼 | |
| POST | `/customers/:id/assign-flat` | 🧑‍💼 | `{ project, flat, agreedPriceMinor?, bookingDate?, flatStatus }`; releases the previous unit |
| POST | `/customers/:id/unassign-flat` | 🧑‍💼 | 409 once payments are verified |
| POST | `/customers/:id/active` | 🧑‍💼 | `{ isActive }`; ends sessions |
| POST | `/customers/:id/reset-password` | 🧑‍💼 | → one-time credentials |
| DELETE | `/customers/:id` | 🧑‍💼 | 409 if payments exist |

## /payments

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/payments/me` | 🏠 | Own payments + `summary` only |
| GET | `/payments/:id/receipt` | 👤 | PDF. Staff: any verified payment. Customer: only their own (404 otherwise). |
| GET | `/payments?customer=&project=&status=&method=&from=&to=&search=` | 🧑‍💼 | `meta.totals` = verified/pending/rejected sums for the filter |
| GET | `/payments/outstanding?project=` | 🧑‍💼 | Balance per customer, largest first |
| POST | `/payments` | 🧑‍💼 | `{ customer, amountMinor, method, type, transactionRef?, paidAt, note?, status: pending\|verified }`. 409 if over remaining balance (`details.maxAllowedMinor`) or duplicate `method + transactionRef`. |
| GET | `/payments/:id` | 🧑‍💼 | Includes `audit` trail |
| PATCH | `/payments/:id` | 🧑‍💼 | Pending payments only |
| PATCH | `/payments/:id/status` | 🧑‍💼 | `{ status: verified\|rejected\|pending, reason? }`. Verify issues `RCPT-YYYY-NNNNN`; reject requires a reason. |
| POST | `/payments/:id/attachment` | 🧑‍💼 | multipart `file` (image or PDF proof) |
| DELETE | `/payments/:id` | 🧑‍💼 | Not allowed for verified payments |

Methods: `cash, bank_transfer, cheque, bkash, nagad, card, other`. Types: `booking, down_payment, installment, car_parking, utility, other`.

## /progress (construction)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/progress/me` | 🏠 | Progress of the customer's project |
| GET | `/progress` | 🧑‍💼 | One row per project |
| GET | `/progress/project/:projectId` | 🧑‍💼 | Stages + updates |
| PATCH | `/progress/project/:projectId` | 🧑‍💼 | `{ currentStage? (0–10), percent? (0–100), expectedHandover?, stageNote? }`. Changing stage completes earlier stages, logs an update and syncs project status. |
| POST | `/progress/project/:projectId/updates` | 🧑‍💼 | `{ title, description?, photos:[{url, caption?}] }` |
| DELETE | `/progress/project/:projectId/updates/:updateId` | 🧑‍💼 | |

Stages: Booking Confirmed, Land Preparation, Foundation Work, Structural Construction, Brickwork, Plumbing & Electrical, Plastering, Interior Work, Finishing, Completed, Handover.

## /announcements, /testimonials, /settings, /inquiries, /uploads, /dashboard

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/announcements/me` | 🏠 | Published, for all customers or the customer's project |
| GET/POST | `/announcements` | 🧑‍💼 | `{ title, body, project?, published, pinned }` |
| PATCH/DELETE | `/announcements/:id` | 🧑‍💼 | |
| GET | `/testimonials` | 🌐 | Published only |
| GET | `/testimonials/admin` | 🧑‍💼 | All |
| POST/PATCH/DELETE | `/testimonials[/:id]` | 🧑‍💼 | `{ name, role?, quote, rating, photo?, project?, published, sortOrder }` |
| GET | `/settings` | 🌐 | Website content (hero, about, values, whyUs, stats, team, milestones, featuredProjectIds, contact, social, seo, announcementBar) |
| PUT | `/settings` | 🧑‍💼 | Partial; nested objects are merged |
| POST | `/inquiries` | 🌐 | `{ kind: general\|project\|landowner, name, phone, email?, message?, project?, landDetails? }` (honeypot field `website` must be empty) |
| GET | `/inquiries?status=&kind=&search=` | 🧑‍💼 | `meta.newCount` |
| PATCH | `/inquiries/:id` | 🧑‍💼 | `{ status: new\|reviewed\|spam }` |
| POST | `/inquiries/:id/convert` | 🧑‍💼 | Creates a lead (source `website`) |
| DELETE | `/inquiries/:id` | 🧑‍💼 | |
| POST | `/uploads` | 🧑‍💼 | multipart `files[]`, `folder` → `[{ url, publicId }]` via Cloudinary (503 if not configured) |
| GET | `/dashboard/stats` | 🧑‍💼 | Counts, revenue (expected, received, pending, outstanding, inventory value), chart series, due follow-ups, pending payments |
| GET | `/dashboard/activity?entity=&entityId=` | 🧑‍💼 | Activity log |
| GET | `/health` | 🌐 | Liveness |

## Example

```bash
# Sign in (cookie saved to jar)
curl -c jar -X POST https://<host>/api/auth/login -H 'content-type: application/json' \
  -d '{"identifier":"admin@company.com","password":"…"}'

# Record a verified BDT 15,00,000 payment
curl -b jar -X POST https://<host>/api/payments -H 'content-type: application/json' \
  -d '{"customer":"<id>","amountMinor":150000000,"method":"bank_transfer","transactionRef":"DBBL-552901","paidAt":"2026-10-04","status":"verified"}'
```
