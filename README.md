<p align="center"><img src="client/public/assets/brand/arkhaven-logo-primary.svg" alt="Arkhaven Properties" width="320"></p>

# Arkhaven Properties Platform

Website, CRM, admin dashboard and customer portal for **Arkhaven Properties Ltd.**, a residential and commercial developer in Dhaka and Sylhet.

- **Public website:** projects with live availability and construction status, project pages with galleries, floor plans, unit table, map and FAQs, about, contact and landowner (joint-venture) inquiry forms.
- **Admin dashboard:** leads CRM with history and follow-ups, customer accounts, flats/units, payments with verification and PDF receipts, construction progress with site photos, announcements, website content editor, testimonials, staff accounts and an activity log.
- **Customer portal:** a buyer's unit, payment ledger and receipts, construction stages and photos, notices and profile. Accounts are created only by staff; there is no public sign-up.

Brand: see [BRAND_GUIDELINES.md](BRAND_GUIDELINES.md). Reference study: [REFERENCE_ANALYSIS.md](REFERENCE_ANALYSIS.md). API: [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, TanStack Query 5, Axios, React Hook Form, Zod, Lucide, Framer Motion, Recharts |
| Backend | Node.js 20+, Express 4, TypeScript, MongoDB + Mongoose 8, JWT (httpOnly cookie), bcrypt, Zod, Helmet, express-rate-limit, Multer, PDFKit |
| Services | MongoDB Atlas, Cloudinary (image storage), Vercel (static site + serverless API) |

## Repository layout

```text
arkhaven-platform/
├── api/index.ts              # Vercel serverless entry → server/src/app.ts
├── client/                   # React app
│   ├── public/assets/brand/  # Logos (SVG + PNG proofs), favicon in public/
│   └── src/{components,pages,layouts,hooks,services,contexts,types,utils,routes}
├── server/                   # Express API
│   ├── src/{config,controllers,models,routes,middlewares,services,validators,utils,types,scripts}
│   └── tests/api.test.ts     # End-to-end API tests (26)
├── vercel.json
├── README.md, BRAND_GUIDELINES.md, REFERENCE_ANALYSIS.md, API_DOCUMENTATION.md
```

## Local development

Requirements: Node.js 20+ and a MongoDB database (Atlas free tier works, or local `mongod`).

```bash
npm install                              # installs client + server (npm workspaces)
cp server/.env.example server/.env       # then fill in the values (see below)
npm run seed                             # website content + 4 sample projects with units (no users)
npm run create-super-admin               # prompts for email, name and password
npm run dev                              # API on :4000, website on :5173 (proxied /api)
```

Open http://localhost:5173 (website), http://localhost:5173/admin/login (staff) and http://localhost:5173/login (customers).

| Command | What it does |
|---|---|
| `npm run dev` | API (tsx watch) + Vite dev server |
| `npm run build` | Compile server to `server/dist` and build client to `client/dist` |
| `npm run typecheck` | TypeScript check for both apps |
| `npm test` | API integration tests against `TEST_MONGODB_URI` (default `mongodb://127.0.0.1:27017/arkhaven_test`, dropped at start) |
| `npm run seed` | Insert missing content; `npm run seed -- --force` overwrites seeded content |
| `npm run create-super-admin` | Create or promote a Super Admin (interactive) |

## Environment variables

Server (`server/.env` locally, Vercel project settings in production):

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/arkhaven` |
| `JWT_SECRET` | yes | ≥ 32 random characters (`openssl rand -hex 48`) |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `BCRYPT_ROUNDS` | no | Default `12` |
| `CLIENT_ORIGINS` | no | Comma-separated browser origins allowed by CORS. Not needed when site and API share a domain (Vercel). |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for uploads | Without them, uploads return a clear 503 and admins can paste image URLs instead |
| `CLOUDINARY_FOLDER` | no | Default `arkhaven` |
| `BOOTSTRAP_TOKEN` | no | Enables the one-time HTTP Super Admin bootstrap (see below). Remove after use. |
| `NODE_ENV` | no | `production` on Vercel (enables `Secure` cookies) |

Client: `VITE_API_URL` only if the API is on a different origin (leave empty on Vercel).

**Never commit `.env` files.** They are in `.gitignore`.

## Creating the first Super Admin (safe procedure)

No default credentials exist anywhere in the code. Use one of:

1. **CLI (recommended):** with `MONGODB_URI` pointing at the production database, run `npm run create-super-admin` on your own machine. The password is typed with hidden input and only its bcrypt hash is stored.
2. **Web setup page:** set `BOOTSTRAP_TOKEN` to a long random value in Vercel, redeploy, and open `https://<your-domain>/setup?token=<BOOTSTRAP_TOKEN>`. Enter your name, email and a password of your choice (12+ characters); optionally tick "Load sample content". The page closes itself once a Super Admin exists. **Delete `BOOTSTRAP_TOKEN` from Vercel afterwards.**
3. **One-time HTTP bootstrap (scripted alternative):**
   ```bash
   curl -X POST https://<your-domain>/api/auth/bootstrap -H 'content-type: application/json' \
     -d '{"token":"<BOOTSTRAP_TOKEN>","name":"Your Name","email":"you@company.com","password":"<strong password>"}'
   ```
   It works only while no Super Admin exists. **Delete `BOOTSTRAP_TOKEN` from Vercel afterwards.**

Then sign in at `/admin/login`, open **Staff accounts** to add admins (each gets a one-time temporary password and must change it at first sign-in).

## Creating customer accounts

Customers never register themselves. Staff create accounts in one of three ways:

- **Leads → Convert to customer** (normal path): pick project, unit, agreed price and booking date. The unit is booked atomically (two admins cannot book the same unit).
- **Leads → New lead** with "Create a customer portal login now" ticked (unit is reserved).
- **Customers → New customer** for buyers outside the pipeline.

Each creates a username like `akh-260001` and a random temporary password that is **shown once** in a dialog (copy button, acknowledgement required). Only the bcrypt hash is stored. Share it privately; the customer must set a new password at first sign-in. Lost passwords: **Customer → Reset password** issues a new one-time password and signs out existing sessions.

## Security model

- JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie; user re-loaded on every request, so deactivation/reset revoke access instantly (token version).
- Role checks on every route on the server; customer endpoints derive the customer from the session, never from request parameters. Requests for another customer's receipt return 404.
- bcrypt hashing; constant-time login (a dummy hash is checked when the user doesn't exist).
- Zod validation on every write; Mongo ObjectIds validated; regex search input escaped.
- Rate limits on login, bootstrap, public forms and the API; Helmet headers; CORS allow-list; honeypot on public forms.
- Money stored as integer poisha; totals computed server-side; payments capped at the remaining balance; duplicate `method + transaction reference` blocked by a unique index; verified payments are locked; every change is written to the payment's audit trail and the activity log.

## Deployment (Vercel + MongoDB Atlas + Cloudinary)

The whole app is one Vercel project: the React build is served statically and `/api/*` is rewritten to the Express app running as a serverless function (`api/index.ts`).

1. **MongoDB Atlas:** create a cluster and database user; in *Network Access* allow `0.0.0.0/0` (Vercel has no fixed IPs). Copy the `mongodb+srv://` URI.
2. **Cloudinary:** copy cloud name, API key and secret from the dashboard.
3. **Vercel:** *Add New → Project →* import this GitHub repo. Framework preset "Other"; the build settings come from `vercel.json`. Add the environment variables above (Production + Preview) and deploy.
4. **Super Admin and content:** open `/setup?token=<BOOTSTRAP_TOKEN>` (see above) and tick "Load sample content", or run `npm run create-super-admin` and `npm run seed` locally against the Atlas URI. Super Admins can also load sample content later via `POST /api/settings/sample-content`.
5. Verify: `/api/health`, the homepage ledger and project pages, staff sign-in, create a test lead → convert → payment → verify → sign in as that customer.

Optional: set `CLIENT_ORIGINS` if you host the frontend elsewhere and point `VITE_API_URL` at the API.

## Testing

- `npm test`: 26 API integration tests covering bootstrap, login, roles, project/flat CRUD, the lead lifecycle and conversion, double-booking, payment validation, balance caps, duplicate references, verification math, customer data isolation, receipts, progress, scoped announcements, session revocation, inquiries, CMS merging, dashboard totals, uploads without Cloudinary, error handling and rate limiting.
- A Playwright end-to-end run (used during development) exercises the UI journey: staff sign-in → create lead → note and status → convert (one-time credentials) → over-balance payment rejected → record and verify payment → customer forced password change → portal shows the payment → receipt PDF download → customer blocked from admin UI and staff API.

## Known limitations

- Notification preferences are stored, but no email/SMS provider is wired up yet; alerts appear in the dashboard.
- Rate-limit counters are kept in memory per serverless instance. For strict global limits, plug a Redis store into `express-rate-limit`.
- Sample project images in the seed are hot-linked from Unsplash; replace them with your own photography through the admin (uploads go to Cloudinary).
