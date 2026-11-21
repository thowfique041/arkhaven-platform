import type { Request, Response } from "express";
import type { z } from "zod";
import { ConstructionProgress, Customer, Flat, Project, defaultStages } from "../models";
import { logActivity } from "../services/activity";
import { deleteStored, uploadBuffer } from "../services/storage";
import { ApiError, created, escapeRegex, ok, pageMeta, paginate, slugify } from "../utils/http";
import type { createProjectSchema, projectQuerySchema, updateProjectSchema } from "../validators";

type Q = z.infer<typeof projectQuerySchema>;

/** Unit counts per project, computed from the Flat collection (never stored/denormalized). */
async function unitStats(projectIds: unknown[]) {
  const flats = await Flat.find({ project: { $in: projectIds } }).select("project status").lean();
  const map = new Map<string, { total: number; available: number; reserved: number; booked: number; sold: number }>();
  for (const f of flats) {
    const k = String(f.project);
    const s = map.get(k) ?? { total: 0, available: 0, reserved: 0, booked: 0, sold: 0 };
    s.total++;
    s[f.status as "available"]++;
    map.set(k, s);
  }
  return map;
}

async function progressMap(projectIds: unknown[]) {
  const list = await ConstructionProgress.find({ project: { $in: projectIds } })
    .select("project percent currentStage stages expectedHandover updatedAt")
    .lean();
  return new Map(
    list.map((p) => [
      String(p.project),
      {
        percent: p.percent,
        currentStage: p.currentStage,
        currentStageName: p.stages?.[p.currentStage]?.name,
        expectedHandover: p.expectedHandover,
        updatedAt: p.updatedAt,
      },
    ]),
  );
}

function buildFilter(q: Q, publicOnly: boolean) {
  const filter: Record<string, unknown> = {};
  if (publicOnly) filter.published = true;
  if (q.status) filter.status = q.status;
  if (q.type) filter.type = q.type;
  if (q.area) filter["location.area"] = new RegExp(`^${escapeRegex(q.area)}$`, "i");
  if (q.featured) filter.featured = q.featured === "true";
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [{ name: rx }, { "location.address": rx }, { "location.area": rx }, { tagline: rx }];
  }
  return filter;
}

async function listWith(req: Request, res: Response, publicOnly: boolean) {
  const q = ((req as Request & { q?: Q }).q ?? {}) as Q;
  const p = paginate(q as Record<string, unknown>, 60);
  const filter = buildFilter(q, publicOnly);
  const [items, total, areas] = await Promise.all([
    Project.find(filter)
      .select(publicOnly ? "-faqs -floorPlans -construction" : "")
      .sort({ featured: -1, sortOrder: 1, createdAt: -1 })
      .skip(p.skip)
      .limit(p.limit)
      .lean(),
    Project.countDocuments(filter),
    Project.distinct("location.area", publicOnly ? { published: true } : {}),
  ]);
  const ids = items.map((i) => i._id);
  const [stats, prog] = await Promise.all([unitStats(ids), progressMap(ids)]);
  const data = items.map((i) => ({
    ...i,
    units: stats.get(String(i._id)) ?? { total: 0, available: 0, reserved: 0, booked: 0, sold: 0 },
    progress: prog.get(String(i._id)) ?? null,
  }));
  return ok(res, data, { ...pageMeta(p, total), areas: (areas as string[]).filter(Boolean).sort() });
}

export const listPublic = (req: Request, res: Response) => listWith(req, res, true);
export const listAdmin = (req: Request, res: Response) => listWith(req, res, false);

export async function getPublicBySlug(req: Request, res: Response) {
  const project = await Project.findOne({ slug: req.params.slug, published: true }).lean();
  if (!project) throw ApiError.notFound("Project");
  const [flats, prog] = await Promise.all([
    // Public flat view: no customer info, no internal notes.
    Flat.find({ project: project._id })
      .select("unitNumber floor sizeSqft bedrooms bathrooms balconies facing parking status priceMinor")
      .sort({ floor: 1, unitNumber: 1 })
      .lean(),
    ConstructionProgress.findOne({ project: project._id }).select("percent currentStage stages expectedHandover updatedAt").lean(),
  ]);
  const units = { total: flats.length, available: 0, reserved: 0, booked: 0, sold: 0 };
  for (const f of flats) units[f.status as "available"]++;
  // Prices of units that are no longer available are not published.
  const publicFlats = flats.map((f) => ({ ...f, priceMinor: f.status === "available" ? f.priceMinor : null }));
  return ok(res, {
    ...project,
    units,
    flats: publicFlats,
    progress: prog
      ? {
          percent: prog.percent,
          currentStage: prog.currentStage,
          stages: prog.stages?.map((s) => ({ key: s.key, name: s.name, status: s.status })),
          expectedHandover: prog.expectedHandover,
          updatedAt: prog.updatedAt,
        }
      : null,
  });
}

export async function getAdmin(req: Request, res: Response) {
  const project = await Project.findById(req.params.id).lean();
  if (!project) throw ApiError.notFound("Project");
  const [stats, prog] = await Promise.all([unitStats([project._id]), progressMap([project._id])]);
  return ok(res, { ...project, units: stats.get(String(project._id)), progress: prog.get(String(project._id)) ?? null });
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "project";
  let i = 1;
  while (await Project.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${slugify(base)}-${++i}`;
  return slug;
}

export async function createProject(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createProjectSchema>;
  const slug = await uniqueSlug(body.slug || body.name);
  const project = await Project.create({ ...body, slug });
  await ConstructionProgress.create({ project: project._id, stages: defaultStages(), currentStage: 0, percent: 0, updatedBy: req.user!.id });
  await logActivity(req, "project.create", "Project", project._id, `Created project ${project.name}`);
  return created(res, project);
}

export async function updateProject(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateProjectSchema>;
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound("Project");
  if (body.slug && body.slug !== project.slug) body.slug = await uniqueSlug(body.slug, String(project._id));
  project.set(body);
  await project.save();
  await logActivity(req, "project.update", "Project", project._id, `Updated project ${project.name}`, { fields: Object.keys(body) });
  return ok(res, project);
}

export async function deleteProject(req: Request, res: Response) {
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound("Project");
  const customers = await Customer.countDocuments({ project: project._id });
  if (customers > 0) {
    throw ApiError.conflict(`This project has ${customers} customer(s). Reassign or remove them before deleting the project.`);
  }
  const images = [project.coverImage, ...(project.gallery ?? [])].filter(Boolean);
  await Flat.deleteMany({ project: project._id });
  await ConstructionProgress.deleteMany({ project: project._id });
  await project.deleteOne();
  await Promise.all(images.map((i) => deleteStored(i?.publicId)));
  await logActivity(req, "project.delete", "Project", project._id, `Deleted project ${project.name}`);
  return ok(res, { deleted: true });
}

/** multipart: field "images" (1..12 files), body.target = gallery | cover */
export async function uploadProjectImages(req: Request, res: Response) {
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound("Project");
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw ApiError.badRequest("Attach at least one image");
  const target = req.body.target === "cover" ? "cover" : "gallery";
  const stored = await Promise.all(files.map((f) => uploadBuffer(f, `projects/${project.slug}`)));
  if (target === "cover") {
    await deleteStored(project.coverImage?.publicId);
    project.coverImage = stored[0] as typeof project.coverImage;
  } else {
    project.gallery.push(...stored);
  }
  await project.save();
  await logActivity(req, "project.upload_images", "Project", project._id, `Uploaded ${stored.length} image(s)`);
  return ok(res, project);
}

export async function removeGalleryImage(req: Request, res: Response) {
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound("Project");
  const img = project.gallery.id(req.params.imageId);
  if (!img) throw ApiError.notFound("Image");
  const publicId = img.publicId;
  img.deleteOne();
  await project.save();
  await deleteStored(publicId);
  return ok(res, project);
}
