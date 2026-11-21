import { Router } from "express";
import { ah } from "../utils/http";
import { authenticate, optionalAuthenticate, requireCustomer, requireStaff, requireSuperAdmin } from "../middlewares/auth";
import { loginLimiter, publicFormLimiter, upload, validId, validate } from "../middlewares/common";
import * as V from "../validators";
import * as auth from "../controllers/auth.controller";
import * as users from "../controllers/users.controller";
import * as projects from "../controllers/projects.controller";
import * as flats from "../controllers/flats.controller";
import * as leads from "../controllers/leads.controller";
import * as customers from "../controllers/customers.controller";
import * as payments from "../controllers/payments.controller";
import * as progress from "../controllers/progress.controller";
import * as content from "../controllers/content.controller";
import * as dashboard from "../controllers/dashboard.controller";

const staff = [authenticate, requireStaff];
const customer = [authenticate, requireCustomer];
const id = validId("id");

/* ---------- /api/auth ---------- */
const authR = Router();
authR.post("/login", loginLimiter, validate(V.loginSchema), ah(auth.login));
authR.post("/logout", ah(auth.logout));
authR.get("/me", authenticate, ah(auth.me));
authR.get("/session", optionalAuthenticate, ah(auth.session));
authR.patch("/me", authenticate, validate(V.profileSchema), ah(auth.updateProfile));
authR.post("/change-password", authenticate, validate(V.changePasswordSchema), ah(auth.changePassword));
authR.post("/bootstrap", loginLimiter, validate(V.bootstrapSchema), ah(auth.bootstrap));
authR.get("/setup-status", ah(auth.setupStatus));
// Note: there is intentionally NO register endpoint.

/* ---------- /api/users (staff accounts, super admin only) ---------- */
const usersR = Router();
usersR.use(authenticate, requireSuperAdmin);
usersR.get("/", ah(users.listStaff));
usersR.post("/", validate(V.createAdminSchema), ah(users.createStaff));
usersR.patch("/:id", id, validate(V.updateAdminSchema), ah(users.updateStaff));
usersR.post("/:id/reset-password", id, ah(users.resetStaffPassword));
usersR.delete("/:id", id, ah(users.deleteStaff));

/* ---------- /api/projects ---------- */
const projectsR = Router();
projectsR.get("/", validate(V.projectQuerySchema, "query"), ah(projects.listPublic));
projectsR.get("/admin", ...staff, validate(V.projectQuerySchema, "query"), ah(projects.listAdmin));
projectsR.get("/admin/:id", ...staff, id, ah(projects.getAdmin));
projectsR.get("/slug/:slug", ah(projects.getPublicBySlug));
projectsR.post("/", ...staff, validate(V.createProjectSchema), ah(projects.createProject));
projectsR.patch("/:id", ...staff, id, validate(V.updateProjectSchema), ah(projects.updateProject));
projectsR.delete("/:id", ...staff, id, ah(projects.deleteProject));
projectsR.post("/:id/images", ...staff, id, upload.array("images", 12), ah(projects.uploadProjectImages));
projectsR.delete("/:id/images/:imageId", ...staff, validId("id", "imageId"), ah(projects.removeGalleryImage));

/* ---------- /api/flats ---------- */
const flatsR = Router();
flatsR.use(...staff);
flatsR.get("/", ah(flats.listFlats));
flatsR.post("/", validate(V.createFlatSchema), ah(flats.createFlat));
flatsR.post("/bulk", validate(V.bulkFlatsSchema), ah(flats.bulkCreateFlats));
flatsR.get("/:id", id, ah(flats.getFlat));
flatsR.patch("/:id", id, validate(V.updateFlatSchema), ah(flats.updateFlat));
flatsR.delete("/:id", id, ah(flats.deleteFlat));

/* ---------- /api/leads ---------- */
const leadsR = Router();
leadsR.use(...staff);
leadsR.get("/", ah(leads.listLeads));
leadsR.post("/", validate(V.createLeadSchema), ah(leads.createLead));
leadsR.get("/:id", id, ah(leads.getLead));
leadsR.patch("/:id", id, validate(V.updateLeadSchema), ah(leads.updateLead));
leadsR.patch("/:id/status", id, validate(V.leadStatusSchema), ah(leads.setLeadStatus));
leadsR.post("/:id/notes", id, validate(V.leadNoteSchema), ah(leads.addLeadNote));
leadsR.post("/:id/follow-up", id, validate(V.leadFollowUpSchema), ah(leads.scheduleFollowUp));
leadsR.post("/:id/convert", id, validate(V.assignFlatSchema.partial()), ah(leads.convertLead));
leadsR.delete("/:id", id, ah(leads.deleteLead));

/* ---------- /api/customers ---------- */
const customersR = Router();
customersR.get("/me", ...customer, ah(customers.getMyAccount));
customersR.use(...staff);
customersR.get("/", ah(customers.listCustomers));
customersR.post("/", validate(V.createCustomerSchema), ah(customers.createCustomer));
customersR.get("/:id", id, ah(customers.getCustomer));
customersR.patch("/:id", id, validate(V.updateCustomerSchema), ah(customers.updateCustomer));
customersR.get("/:id/assignable-flats", id, ah(customers.assignableFlats));
customersR.post("/:id/assign-flat", id, validate(V.assignFlatSchema), ah(customers.assignFlat));
customersR.post("/:id/unassign-flat", id, ah(customers.unassignFlat));
customersR.post("/:id/active", id, ah(customers.setActive));
customersR.post("/:id/reset-password", id, ah(customers.resetPassword));
customersR.delete("/:id", id, ah(customers.deleteCustomer));

/* ---------- /api/payments ---------- */
const paymentsR = Router();
paymentsR.get("/me", ...customer, ah(payments.myPayments));
// Receipt: staff for any payment, customers only for their own (checked in controller).
paymentsR.get("/:id/receipt", authenticate, id, ah(payments.receipt));
paymentsR.use(...staff);
paymentsR.get("/", ah(payments.listPayments));
paymentsR.get("/outstanding", ah(payments.outstanding));
paymentsR.post("/", validate(V.createPaymentSchema), ah(payments.createPayment));
paymentsR.get("/:id", id, ah(payments.getPayment));
paymentsR.patch("/:id", id, validate(V.updatePaymentSchema), ah(payments.updatePayment));
paymentsR.patch("/:id/status", id, validate(V.paymentDecisionSchema), ah(payments.decidePayment));
paymentsR.post("/:id/attachment", id, upload.single("file"), ah(payments.attachProof));
paymentsR.delete("/:id", id, ah(payments.deletePayment));

/* ---------- /api/progress ---------- */
const progressR = Router();
progressR.get("/me", ...customer, ah(progress.myProgress));
progressR.use(...staff);
progressR.get("/", ah(progress.listProgress));
progressR.get("/project/:projectId", validId("projectId"), ah(progress.getProjectProgress));
progressR.patch("/project/:projectId", validId("projectId"), validate(V.progressUpdateSchema), ah(progress.updateProjectProgress));
progressR.post("/project/:projectId/updates", validId("projectId"), validate(V.progressPostSchema), ah(progress.addProgressUpdate));
progressR.delete("/project/:projectId/updates/:updateId", validId("projectId", "updateId"), ah(progress.deleteProgressUpdate));

/* ---------- /api/announcements ---------- */
const annR = Router();
annR.get("/me", ...customer, ah(content.myAnnouncements));
annR.use(...staff);
annR.get("/", ah(content.listAnnouncements));
annR.post("/", validate(V.announcementSchema), ah(content.createAnnouncement));
annR.patch("/:id", id, validate(V.announcementSchema.partial()), ah(content.updateAnnouncement));
annR.delete("/:id", id, ah(content.deleteAnnouncement));

/* ---------- /api/testimonials ---------- */
const testR = Router();
testR.get("/", ah(content.publicTestimonials));
testR.get("/admin", ...staff, ah(content.listTestimonials));
testR.post("/", ...staff, validate(V.testimonialSchema), ah(content.createTestimonial));
testR.patch("/:id", ...staff, id, validate(V.testimonialSchema.partial()), ah(content.updateTestimonial));
testR.delete("/:id", ...staff, id, ah(content.deleteTestimonial));

/* ---------- /api/settings ---------- */
const settingsR = Router();
settingsR.get("/", ah(content.getSettings));
settingsR.put("/", ...staff, validate(V.settingsSchema), ah(content.updateSettings));
settingsR.post("/sample-content", authenticate, requireSuperAdmin, ah(content.loadSampleContent));

/* ---------- /api/inquiries ---------- */
const inqR = Router();
inqR.post("/", publicFormLimiter, validate(V.inquirySchema), ah(content.submitInquiry));
inqR.use(...staff);
inqR.get("/", ah(content.listInquiries));
inqR.patch("/:id", id, ah(content.updateInquiry));
inqR.post("/:id/convert", id, ah(content.convertInquiry));
inqR.delete("/:id", id, ah(content.deleteInquiry));

/* ---------- /api/dashboard, /api/uploads ---------- */
const dashR = Router();
dashR.use(...staff);
dashR.get("/stats", ah(dashboard.stats));
dashR.get("/activity", ah(dashboard.activity));

const uploadsR = Router();
uploadsR.post("/", ...staff, upload.array("files", 12), ah(content.uploadImages));

export const api = Router();
api.use("/auth", authR);
api.use("/users", usersR);
api.use("/projects", projectsR);
api.use("/flats", flatsR);
api.use("/leads", leadsR);
api.use("/customers", customersR);
api.use("/payments", paymentsR);
api.use("/progress", progressR);
api.use("/announcements", annR);
api.use("/testimonials", testR);
api.use("/settings", settingsR);
api.use("/inquiries", inqR);
api.use("/dashboard", dashR);
api.use("/uploads", uploadsR);
