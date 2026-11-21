/**
 * End-to-end API tests. Runs the real Express app against a real MongoDB-compatible server.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/arkhaven_test npm test
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "http";
import type { AddressInfo } from "net";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/arkhaven_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234567890";
process.env.BCRYPT_ROUNDS = "4";
process.env.BOOTSTRAP_TOKEN = "bootstrap-token-for-tests-only";
process.env.CLIENT_ORIGINS = "http://localhost:5173";

let server: Server;
let base = "";

class Client {
  cookie = "";
  async req(method: string, path: string, body?: unknown) {
    const res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    const type = res.headers.get("content-type") ?? "";
    const json = type.includes("json") ? await res.json() : null;
    return { status: res.status, body: json as any, headers: res.headers, raw: json ? null : Buffer.from(await res.arrayBuffer()) };
  }
  get = (p: string) => this.req("GET", p);
  post = (p: string, b?: unknown) => this.req("POST", p, b ?? {});
  patch = (p: string, b: unknown) => this.req("PATCH", p, b);
  put = (p: string, b: unknown) => this.req("PUT", p, b);
  del = (p: string) => this.req("DELETE", p);
}

const anon = new Client();
const superA = new Client();
const admin = new Client();
const cust1 = new Client();
const cust2 = new Client();
const ctx: Record<string, any> = {};

before(async () => {
  const mongoose = (await import("mongoose")).default;
  const { connectDB } = await import("../src/config/db");
  await connectDB();
  await mongoose.connection.db!.dropDatabase();
  const { createApp } = await import("../src/app");
  server = createApp().listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server?.close();
  const { disconnectDB } = await import("../src/config/db");
  await disconnectDB();
});

test("health + no public registration endpoint", async () => {
  assert.equal((await anon.get("/api/health")).status, 200);
  const r = await anon.post("/api/auth/register", { email: "x@y.z", password: "Password123" });
  assert.equal(r.status, 404);
});

test("anonymous session check returns null without an error", async () => {
  const r = await anon.get("/api/auth/session");
  assert.equal(r.status, 200);
  assert.equal(r.body.data, null);
  assert.equal((await anon.get("/api/auth/me")).status, 401);
});

test("bootstrap creates first super admin once, then closes", async () => {
  const bad = await anon.post("/api/auth/bootstrap", { token: "wrong-token-wrong-token", name: "S A", email: "sa@test.io", password: "SuperPass123" });
  assert.equal(bad.status, 403);
  const ok = await anon.post("/api/auth/bootstrap", { token: process.env.BOOTSTRAP_TOKEN, name: "Super Admin", email: "sa@test.io", password: "SuperPass123" });
  assert.equal(ok.status, 201);
  const again = await anon.post("/api/auth/bootstrap", { token: process.env.BOOTSTRAP_TOKEN, name: "Other", email: "sa2@test.io", password: "SuperPass123" });
  assert.equal(again.status, 409);
});

test("login: wrong password rejected, correct sets httpOnly cookie", async () => {
  const bad = await superA.post("/api/auth/login", { identifier: "sa@test.io", password: "nope" });
  assert.equal(bad.status, 401);
  const r = await superA.post("/api/auth/login", { identifier: "SA@test.io", password: "SuperPass123" });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie") ?? "", /HttpOnly/i);
  assert.equal(r.body.data.user.role, "superadmin");
  assert.equal(r.body.data.user.passwordHash, undefined);
});

test("super admin creates an admin; admin cannot manage staff", async () => {
  const r = await superA.post("/api/users", { name: "Ops Admin", email: "ops@test.io", role: "admin" });
  assert.equal(r.status, 201);
  const pw = r.body.data.credentials.temporaryPassword;
  assert.ok(pw.length >= 12);
  const login = await admin.post("/api/auth/login", { identifier: "ops@test.io", password: pw });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.user.mustChangePassword, true);
  const chg = await admin.post("/api/auth/change-password", { currentPassword: pw, newPassword: "AdminPass456" });
  assert.equal(chg.status, 200);
  assert.equal((await admin.get("/api/auth/me")).body.data.user.mustChangePassword, false);
  assert.equal((await admin.get("/api/users")).status, 403);
  assert.equal((await anon.get("/api/users")).status, 401);
});

test("project CRUD + slug + validation", async () => {
  const invalid = await admin.post("/api/projects", { name: "" });
  assert.equal(invalid.status, 422);
  const p = await admin.post("/api/projects", {
    name: "Test Tower",
    status: "ongoing",
    type: "residential",
    location: { area: "Gulshan", address: "Road 1" },
    amenities: ["Lift"],
  });
  assert.equal(p.status, 201);
  assert.equal(p.body.data.slug, "test-tower");
  ctx.project = p.body.data._id;
  const p2 = await admin.post("/api/projects", { name: "Test Tower", status: "upcoming" });
  assert.equal(p2.body.data.slug, "test-tower-2");
  ctx.project2 = p2.body.data._id;
  const upd = await admin.patch(`/api/projects/${ctx.project}`, { tagline: "Updated" });
  assert.equal(upd.body.data.tagline, "Updated");
  const pub = await anon.get("/api/projects/slug/test-tower");
  assert.equal(pub.status, 200);
  assert.equal(pub.body.data.progress.currentStage, 0);
  const filtered = await anon.get("/api/projects?status=upcoming");
  assert.equal(filtered.body.data.length, 1);
  assert.equal((await anon.post("/api/projects", { name: "Hack" })).status, 401);
  const del = await admin.del(`/api/projects/${ctx.project2}`);
  assert.equal(del.status, 200);
});

test("flat CRUD, bulk generation and uniqueness", async () => {
  const f = await admin.post("/api/flats", { project: ctx.project, unitNumber: "1a", floor: 1, sizeSqft: 1500, priceMinor: 1_500_000_000 });
  assert.equal(f.status, 201);
  assert.equal(f.body.data.unitNumber, "1A");
  ctx.flatA = f.body.data._id;
  const dup = await admin.post("/api/flats", { project: ctx.project, unitNumber: "1A", floor: 1, sizeSqft: 1500, priceMinor: 1 });
  assert.equal(dup.status, 409);
  const bulk = await admin.post("/api/flats/bulk", {
    project: ctx.project,
    floors: { from: 2, to: 3 },
    units: [{ suffix: "A", sizeSqft: 1500, priceMinor: 1_200_000_000 }, { suffix: "B", sizeSqft: 1200, priceMinor: 1_000_000_000 }],
  });
  assert.equal(bulk.body.data.count, 4);
  const list = await admin.get(`/api/flats?project=${ctx.project}`);
  assert.equal(list.body.data.length, 5);
  ctx.flat2A = list.body.data.find((x: any) => x.unitNumber === "2A")._id;
  ctx.flat3B = list.body.data.find((x: any) => x.unitNumber === "3B")._id;
  const badStatus = await admin.patch(`/api/flats/${ctx.flat3B}`, { status: "sold" });
  assert.equal(badStatus.status, 409, "cannot mark sold without customer");
  const price = await admin.patch(`/api/flats/${ctx.flat3B}`, { priceMinor: 990_000_000 });
  assert.equal(price.body.data.priceMinor, 990_000_000);
  const floatMoney = await admin.patch(`/api/flats/${ctx.flat3B}`, { priceMinor: 10.5 });
  assert.equal(floatMoney.status, 422);
});

test("lead lifecycle: create, status, note, follow-up, search, history", async () => {
  const l = await admin.post("/api/leads", {
    fullName: "Rahim Uddin",
    phone: "+8801711111111",
    email: "rahim@example.com",
    interestedProject: ctx.project,
    interestedFlat: ctx.flatA,
    budgetMinor: 1_500_000_000,
    source: "facebook",
    notes: "Wants south facing",
  });
  assert.equal(l.status, 201);
  ctx.lead = l.body.data.lead._id;
  assert.equal((await admin.patch(`/api/leads/${ctx.lead}/status`, { status: "contacted" })).status, 200);
  assert.equal((await admin.patch(`/api/leads/${ctx.lead}/status`, { status: "bogus" })).status, 422);
  await admin.post(`/api/leads/${ctx.lead}/notes`, { note: "Called, interested in 1A" });
  await admin.post(`/api/leads/${ctx.lead}/follow-up`, { followUpDate: new Date(Date.now() - 1000).toISOString() });
  const detail = await admin.get(`/api/leads/${ctx.lead}`);
  const types = detail.body.data.history.map((h: any) => h.type);
  for (const t of ["created", "status", "note", "follow_up"]) assert.ok(types.includes(t), `history has ${t}`);
  const search = await admin.get("/api/leads?search=rahim");
  assert.equal(search.body.data.length, 1);
  const due = await admin.get("/api/leads?followUp=due");
  assert.equal(due.body.data.length, 1);
  assert.equal(search.body.meta.counts.contacted, 1);
  // A second lead to delete
  const l2 = await admin.post("/api/leads", { fullName: "Temp Lead", phone: "01700000000" });
  assert.equal((await admin.del(`/api/leads/${l2.body.data.lead._id}`)).status, 200);
});

test("convert lead → customer account with one-time credentials; flat booked", async () => {
  const conv = await admin.post(`/api/leads/${ctx.lead}/convert`, { agreedPriceMinor: 1_400_000_000 });
  assert.equal(conv.status, 201);
  const cred = conv.body.data.credentials;
  assert.match(cred.username, /^akh-\d{6}$/);
  ctx.cust1 = conv.body.data.customer._id;
  ctx.cust1Cred = cred;
  const again = await admin.post(`/api/leads/${ctx.lead}/convert`, {});
  assert.equal(again.status, 409);
  const flat = await admin.get(`/api/flats/${ctx.flatA}`);
  assert.equal(flat.body.data.status, "booked");
  assert.equal(flat.body.data.customer._id, ctx.cust1);
  const lead = await admin.get(`/api/leads/${ctx.lead}`);
  assert.equal(lead.body.data.status, "converted");
  // Credentials are never retrievable again
  const c = await admin.get(`/api/customers/${ctx.cust1}`);
  assert.equal(JSON.stringify(c.body).includes(cred.temporaryPassword), false);
});

test("second customer created directly; double-booking the same flat is blocked", async () => {
  const clash = await admin.post("/api/customers", { fullName: "Karim", phone: "01800000000", project: ctx.project, flat: ctx.flatA });
  assert.equal(clash.status, 409);
  const ok = await admin.post("/api/customers", { fullName: "Karim Ahmed", phone: "01800000000", email: "karim@example.com", project: ctx.project, flat: ctx.flat2A });
  assert.equal(ok.status, 201);
  ctx.cust2 = ok.body.data.customer._id;
  ctx.cust2Cred = ok.body.data.credentials;
  assert.equal(ok.body.data.customer.agreedPriceMinor, 1_200_000_000, "defaults to flat price");
});

test("customers log in and must change temporary password", async () => {
  const r1 = await cust1.post("/api/auth/login", { identifier: ctx.cust1Cred.username, password: ctx.cust1Cred.temporaryPassword });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.data.user.mustChangePassword, true);
  assert.equal((await cust1.post("/api/auth/change-password", { currentPassword: ctx.cust1Cred.temporaryPassword, newPassword: "Customer1Pass" })).status, 200);
  const r2 = await cust2.post("/api/auth/login", { identifier: "karim@example.com", password: ctx.cust2Cred.temporaryPassword });
  assert.equal(r2.status, 200);
});

test("customers are blocked from every staff endpoint", async () => {
  for (const [m, p] of [
    ["GET", "/api/leads"],
    ["GET", "/api/customers"],
    ["GET", `/api/customers/${ctx.cust2}`],
    ["GET", "/api/payments"],
    ["POST", "/api/payments"],
    ["GET", "/api/dashboard/stats"],
    ["POST", "/api/projects"],
    ["PATCH", `/api/flats/${ctx.flatA}`],
    ["PUT", "/api/settings"],
    ["GET", "/api/progress"],
  ] as const) {
    const r = await cust1.req(m, p, m === "GET" ? undefined : {});
    assert.equal(r.status, 403, `${m} ${p} should be 403, got ${r.status}`);
  }
});

test("payments: validation, balance cap, duplicate ref, verification math", async () => {
  // price 1_400_000_000 poisha = BDT 14,000,000
  const neg = await admin.post("/api/payments", { customer: ctx.cust1, amountMinor: -5, method: "cash", paidAt: new Date().toISOString() });
  assert.equal(neg.status, 422);
  const frac = await admin.post("/api/payments", { customer: ctx.cust1, amountMinor: 100.5, method: "cash", paidAt: new Date().toISOString() });
  assert.equal(frac.status, 422);
  const future = await admin.post("/api/payments", { customer: ctx.cust1, amountMinor: 100, method: "cash", paidAt: new Date(Date.now() + 7 * 864e5).toISOString() });
  assert.equal(future.status, 422);

  const p1 = await admin.post("/api/payments", { customer: ctx.cust1, amountMinor: 200_000_000, method: "bank_transfer", transactionRef: "TRX-001", type: "booking", paidAt: "2026-01-10" });
  assert.equal(p1.status, 201);
  assert.equal(p1.body.data.payment.status, "pending");
  ctx.pay1 = p1.body.data.payment._id;

  const dup = await admin.post("/api/payments", { customer: ctx.cust1, amountMinor: 1000, method: "bank_transfer", transactionRef: " trx-001 ", paidAt: "2026-01-11" });
  assert.equal(dup.status, 409, "duplicate transaction ref (case/space-insensitive) blocked");

  const p2 = await admin.post("/api/payments", { customer: ctx.cust1, amountMinor: 300_000_000, method: "bkash", transactionRef: "BK123", paidAt: "2026-02-10", status: "verified" });
  assert.equal(p2.body.data.payment.status, "verified");
  assert.match(p2.body.data.payment.receiptNumber, /^RCPT-\d{4}-\d{5}$/);
  ctx.pay2 = p2.body.data.payment._id;

  // committed = 500_000_000, remaining capacity 900_000_000
  const over = await admin.post("/api/payments", { customer: ctx.cust1, amountMinor: 900_000_001, method: "cash", paidAt: "2026-03-01" });
  assert.equal(over.status, 409);
  assert.equal(over.body.error.details.maxAllowedMinor, 900_000_000);

  const v = await admin.patch(`/api/payments/${ctx.pay1}/status`, { status: "verified" });
  assert.equal(v.status, 200);
  const s = v.body.data.summary;
  assert.equal(s.totalPriceMinor, 1_400_000_000);
  assert.equal(s.paidMinor, 500_000_000);
  assert.equal(s.remainingMinor, 900_000_000);
  assert.equal(s.paidPercent, 35.71);

  const editVerified = await admin.patch(`/api/payments/${ctx.pay1}`, { amountMinor: 1 });
  assert.equal(editVerified.status, 409, "verified payments are locked");
  assert.equal((await admin.del(`/api/payments/${ctx.pay1}`)).status, 409);

  const p3 = await admin.post("/api/payments", { customer: ctx.cust1, amountMinor: 50_000_000, method: "cash", paidAt: "2026-03-01" });
  ctx.pay3 = p3.body.data.payment._id;
  const noReason = await admin.patch(`/api/payments/${ctx.pay3}/status`, { status: "rejected" });
  assert.equal(noReason.status, 400);
  const rej = await admin.patch(`/api/payments/${ctx.pay3}/status`, { status: "rejected", reason: "Cheque bounced" });
  assert.equal(rej.body.data.summary.paidMinor, 500_000_000, "rejected payments do not count");
  assert.equal(rej.body.data.summary.pendingMinor, 0);

  const pay2Cust = await admin.post("/api/payments", { customer: ctx.cust2, amountMinor: 100_000_000, method: "cash", paidAt: "2026-03-05", status: "verified" });
  ctx.payC2 = pay2Cust.body.data.payment._id;

  const lower = await admin.patch(`/api/customers/${ctx.cust1}`, { agreedPriceMinor: 400_000_000 });
  assert.equal(lower.status, 409, "agreed price cannot go below paid");

  const list = await admin.get(`/api/payments?customer=${ctx.cust1}`);
  assert.equal(list.body.meta.totals.verifiedMinor, 500_000_000);
  assert.equal(list.body.meta.totals.rejectedMinor, 50_000_000);
  const audit = await admin.get(`/api/payments/${ctx.pay1}`);
  assert.deepEqual(audit.body.data.audit.map((a: any) => a.action), ["created", "verified"]);
});

test("customer data isolation", async () => {
  const mine = await cust1.get("/api/payments/me");
  assert.equal(mine.status, 200);
  assert.equal(mine.body.data.payments.length, 3);
  assert.equal(mine.body.data.summary.paidMinor, 500_000_000);
  assert.ok(mine.body.data.payments.every((p: any) => p.audit === undefined && p.dedupeKey === undefined));

  const theirs = await cust2.get("/api/payments/me");
  assert.equal(theirs.body.data.payments.length, 1);
  assert.equal(theirs.body.data.summary.paidMinor, 100_000_000);

  // Customer 2 cannot download customer 1's receipt; gets 404 (no existence leak)
  const steal = await cust2.get(`/api/payments/${ctx.pay2}/receipt`);
  assert.equal(steal.status, 404);
  const own = await cust1.get(`/api/payments/${ctx.pay2}/receipt`);
  assert.equal(own.status, 200);
  assert.equal(own.headers.get("content-type"), "application/pdf");
  assert.equal(own.raw!.subarray(0, 4).toString(), "%PDF");

  const me1 = await cust1.get("/api/customers/me");
  assert.equal(me1.body.data._id, ctx.cust1);
  assert.equal(me1.body.data.notes, undefined, "internal notes hidden from customer");
  const me2 = await cust2.get("/api/customers/me");
  assert.equal(me2.body.data._id, ctx.cust2);

  // Customer can update only contact details
  const prof = await cust1.patch("/api/auth/me", { phone: "+8801999999999", name: "Hacker Name" });
  assert.equal(prof.status, 200);
  const after = await admin.get(`/api/customers/${ctx.cust1}`);
  assert.equal(after.body.data.phone, "+8801999999999");
  assert.equal(after.body.data.fullName, "Rahim Uddin");
});

test("construction progress: admin updates stage, customer sees it", async () => {
  const bad = await admin.patch(`/api/progress/project/${ctx.project}`, { currentStage: 99 });
  assert.equal(bad.status, 422);
  const r = await admin.patch(`/api/progress/project/${ctx.project}`, { currentStage: 3, expectedHandover: "2028-06-30", stageNote: "Slab 4 cast" });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.percent, 30);
  assert.equal(r.body.data.stages[2].status, "completed");
  assert.equal(r.body.data.stages[3].status, "in_progress");
  assert.equal(r.body.data.stages[4].status, "pending");
  const pct = await admin.patch(`/api/progress/project/${ctx.project}`, { percent: 33 });
  assert.equal(pct.body.data.percent, 33);
  const post = await admin.post(`/api/progress/project/${ctx.project}/updates`, {
    title: "Roof works",
    description: "Formwork started",
    photos: [{ url: "https://example.com/p.jpg" }],
  });
  assert.equal(post.status, 201);
  const mine = await cust1.get("/api/progress/me");
  assert.equal(mine.body.data.currentStage, 3);
  assert.equal(mine.body.data.percent, 33);
  assert.equal(mine.body.data.updates[0].title, "Roof works");
  assert.equal(new Date(mine.body.data.expectedHandover).getUTCFullYear(), 2028);
});

test("announcements scoped to customer's project", async () => {
  await admin.post("/api/announcements", { title: "Everyone", body: "Office closed on Friday" });
  await admin.post("/api/announcements", { title: "Tower only", body: "Lift installation", project: ctx.project });
  const other = await admin.post("/api/projects", { name: "Elsewhere" });
  await admin.post("/api/announcements", { title: "Other project", body: "Not for you", project: other.body.data._id });
  await admin.post("/api/announcements", { title: "Draft", body: "hidden", published: false });
  const mine = await cust1.get("/api/announcements/me");
  const titles = mine.body.data.map((a: any) => a.title).sort();
  assert.deepEqual(titles, ["Everyone", "Tower only"]);
});

test("deactivation and password reset revoke sessions immediately", async () => {
  await admin.post(`/api/customers/${ctx.cust2}/active`, { isActive: false });
  assert.equal((await cust2.get("/api/payments/me")).status, 401);
  const login = await cust2.post("/api/auth/login", { identifier: ctx.cust2Cred.username, password: ctx.cust2Cred.temporaryPassword });
  assert.equal(login.status, 403);
  await admin.post(`/api/customers/${ctx.cust2}/active`, { isActive: true });
  const reset = await admin.post(`/api/customers/${ctx.cust2}/reset-password`);
  const newPw = reset.body.data.credentials.temporaryPassword;
  assert.equal((await cust2.post("/api/auth/login", { identifier: ctx.cust2Cred.username, password: ctx.cust2Cred.temporaryPassword })).status, 401);
  assert.equal((await cust2.post("/api/auth/login", { identifier: ctx.cust2Cred.username, password: newPw })).status, 200);
});

test("public inquiry (rate-limited, honeypot) → lead conversion", async () => {
  const bad = await anon.post("/api/inquiries", { name: "A", phone: "x" });
  assert.equal(bad.status, 422);
  const bot = await anon.post("/api/inquiries", { name: "Bot Bot", phone: "01711111111", website: "spam.com" });
  assert.equal(bot.status, 422);
  const r = await anon.post("/api/inquiries", { kind: "landowner", name: "Land Owner", phone: "01711222333", landDetails: { location: "Mirpur 10", sizeKatha: 5, roadWidth: "20 ft" } });
  assert.equal(r.status, 201);
  const list = await admin.get("/api/inquiries");
  assert.equal(list.body.meta.newCount, 1);
  const conv = await admin.post(`/api/inquiries/${list.body.data[0]._id}/convert`);
  assert.equal(conv.status, 201);
  assert.equal(conv.body.data.source, "website");
  assert.match(conv.body.data.notes, /Mirpur 10/);
});

test("website content management", async () => {
  const r = await admin.put("/api/settings", { hero: { title: "Hello" }, contact: { phone: "123456" }, stats: [{ label: "Years", value: "10" }] });
  assert.equal(r.status, 200);
  await admin.put("/api/settings", { hero: { subtitle: "Sub" } });
  const pub = await anon.get("/api/settings");
  assert.equal(pub.body.data.hero.title, "Hello", "partial update merges nested fields");
  assert.equal(pub.body.data.hero.subtitle, "Sub");
  const t = await admin.post("/api/testimonials", { name: "Happy Buyer", quote: "Great experience overall", published: true });
  assert.equal(t.status, 201);
  assert.equal((await anon.get("/api/testimonials")).body.data.length, 1);
});

test("dashboard stats are computed on the server", async () => {
  const r = await admin.get("/api/dashboard/stats");
  const d = r.body.data;
  assert.equal(d.customers, 2);
  assert.equal(d.revenue.expectedMinor, 1_400_000_000 + 1_200_000_000);
  assert.equal(d.revenue.receivedMinor, 600_000_000);
  assert.equal(d.revenue.outstandingMinor, 2_000_000_000);
  assert.equal(d.flats.booked, 2);
  assert.equal(d.flats.available, 3);
  const act = await admin.get("/api/dashboard/activity");
  assert.ok(act.body.meta.total > 10);
  const out = await admin.get("/api/payments/outstanding");
  assert.equal(out.body.data[0].summary.remainingMinor, 1_100_000_000);
});

test("uploads without Cloudinary configured return a clear 503, not a fake success", async () => {
  const fd = new FormData();
  fd.append("files", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }), "x.png");
  const res = await fetch(`${base}/api/uploads`, { method: "POST", body: fd, headers: { cookie: admin.cookie } });
  assert.equal(res.status, 503);
  const fd2 = new FormData();
  fd2.append("files", new Blob(["hello"], { type: "text/plain" }), "x.txt");
  const res2 = await fetch(`${base}/api/uploads`, { method: "POST", body: fd2, headers: { cookie: admin.cookie } });
  assert.equal(res2.status, 415);
});

test("invalid ids and unknown routes are handled cleanly", async () => {
  assert.equal((await admin.get("/api/leads/not-an-id")).status, 400);
  assert.equal((await admin.get("/api/leads/507f1f77bcf86cd799439011")).status, 404);
  assert.equal((await anon.get("/api/nope")).status, 404);
});

test("protected deletes: project with customers, customer with payments", async () => {
  assert.equal((await admin.del(`/api/projects/${ctx.project}`)).status, 409);
  assert.equal((await admin.del(`/api/customers/${ctx.cust1}`)).status, 409);
  assert.equal((await admin.del(`/api/flats/${ctx.flatA}`)).status, 409);
});

test("login rate limiting kicks in after repeated failures", async () => {
  const c = new Client();
  let last = 0;
  for (let i = 0; i < 12; i++) last = (await c.post("/api/auth/login", { identifier: "ops@test.io", password: "wrong" })).status;
  assert.equal(last, 429);
});
