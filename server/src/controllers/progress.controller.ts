import type { Request, Response } from "express";
import type { z } from "zod";
import { ConstructionProgress, Customer, Project, defaultStages } from "../models";
import { logActivity } from "../services/activity";
import { deleteStored } from "../services/storage";
import { ApiError, created, ok } from "../utils/http";
import { CONSTRUCTION_STAGES } from "../types";
import type { progressPostSchema, progressUpdateSchema } from "../validators";

async function getOrCreate(projectId: string) {
  let doc = await ConstructionProgress.findOne({ project: projectId });
  if (!doc) {
    if (!(await Project.exists({ _id: projectId }))) throw ApiError.notFound("Project");
    doc = await ConstructionProgress.create({ project: projectId, stages: defaultStages() });
  }
  return doc;
}

/** Default % when the admin moves to a stage without typing a percentage. */
export function stageDefaultPercent(stage: number) {
  return Math.round((stage / (CONSTRUCTION_STAGES.length - 1)) * 100);
}

export async function listProgress(_req: Request, res: Response) {
  const projects = await Project.find().select("name slug status coverImage").sort({ sortOrder: 1, name: 1 }).lean();
  const progress = await ConstructionProgress.find({ project: { $in: projects.map((p) => p._id) } })
    .select("project percent currentStage stages expectedHandover updatedAt")
    .lean();
  const map = new Map(progress.map((p) => [String(p.project), p]));
  return ok(
    res,
    projects.map((p) => {
      const pr = map.get(String(p._id));
      return {
        project: p,
        percent: pr?.percent ?? 0,
        currentStage: pr?.currentStage ?? 0,
        currentStageName: pr?.stages?.[pr.currentStage]?.name ?? CONSTRUCTION_STAGES[0],
        expectedHandover: pr?.expectedHandover ?? null,
        updatedAt: pr?.updatedAt ?? null,
      };
    }),
  );
}

export async function getProjectProgress(req: Request, res: Response) {
  const doc = await getOrCreate(req.params.projectId);
  await doc.populate("project", "name slug status");
  const sorted = doc.toObject();
  sorted.updates.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  return ok(res, sorted);
}

export async function updateProjectProgress(req: Request, res: Response) {
  const body = req.body as z.infer<typeof progressUpdateSchema>;
  const doc = await getOrCreate(req.params.projectId);
  const now = new Date();
  const prevStage = doc.currentStage;

  if (body.currentStage !== undefined && body.currentStage !== prevStage) {
    doc.currentStage = body.currentStage;
    const last = CONSTRUCTION_STAGES.length - 1;
    doc.stages = CONSTRUCTION_STAGES.map((name, key) => {
      const old = doc.stages.find((s) => s.key === key);
      const status = key < body.currentStage! || (key === body.currentStage && key === last) ? "completed" : key === body.currentStage ? "in_progress" : "pending";
      return {
        key,
        name,
        status,
        startedAt: status !== "pending" ? old?.startedAt ?? now : undefined,
        completedAt: status === "completed" ? old?.completedAt ?? now : undefined,
        note: key === body.currentStage && body.stageNote ? body.stageNote : old?.note,
      };
    }) as typeof doc.stages;
    if (body.percent === undefined) doc.percent = Math.max(stageDefaultPercent(body.currentStage), body.currentStage < prevStage ? 0 : doc.percent);
    doc.updates.push({
      title: `Stage updated: ${CONSTRUCTION_STAGES[body.currentStage]}`,
      description: body.stageNote || `Construction moved from "${CONSTRUCTION_STAGES[prevStage]}" to "${CONSTRUCTION_STAGES[body.currentStage]}".`,
      stageKey: body.currentStage,
      percent: body.percent ?? doc.percent,
      createdBy: req.user!.id as unknown as undefined,
      createdAt: now,
    });
  }
  if (body.percent !== undefined) doc.percent = body.percent;
  if (body.expectedHandover !== undefined) doc.expectedHandover = body.expectedHandover ?? undefined;
  doc.updatedBy = req.user!.id as unknown as typeof doc.updatedBy;
  await doc.save();

  // Keep the public project status in step with construction.
  const projStatus = doc.currentStage >= CONSTRUCTION_STAGES.indexOf("Completed") ? "completed" : doc.currentStage >= 1 ? "ongoing" : undefined;
  if (projStatus) await Project.updateOne({ _id: doc.project }, { $set: { status: projStatus } });
  if (body.expectedHandover) await Project.updateOne({ _id: doc.project }, { $set: { expectedCompletion: body.expectedHandover } });

  await logActivity(req, "progress.update", "ConstructionProgress", doc._id, `Progress ${doc.percent}% · ${CONSTRUCTION_STAGES[doc.currentStage]}`, body);
  return ok(res, doc);
}

export async function addProgressUpdate(req: Request, res: Response) {
  const body = req.body as z.infer<typeof progressPostSchema>;
  const doc = await getOrCreate(req.params.projectId);
  doc.updates.push({ ...body, stageKey: doc.currentStage, percent: doc.percent, createdBy: req.user!.id as unknown as undefined, createdAt: new Date() });
  await doc.save();
  await logActivity(req, "progress.post", "ConstructionProgress", doc._id, `Posted update: ${body.title}`);
  return created(res, doc.updates[doc.updates.length - 1]);
}

export async function deleteProgressUpdate(req: Request, res: Response) {
  const doc = await getOrCreate(req.params.projectId);
  const upd = doc.updates.id(req.params.updateId);
  if (!upd) throw ApiError.notFound("Update");
  const photos = upd.photos ?? [];
  upd.deleteOne();
  await doc.save();
  await Promise.all(photos.map((p) => deleteStored(p.publicId)));
  return ok(res, { deleted: true });
}

/** Customer: progress of the project their flat belongs to. */
export async function myProgress(req: Request, res: Response) {
  const customer = await Customer.findById(req.user!.customerId).select("project").lean();
  if (!customer?.project) return ok(res, null);
  const doc = await ConstructionProgress.findOne({ project: customer.project }).populate("project", "name slug status expectedCompletion").lean();
  if (!doc) return ok(res, null);
  doc.updates.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  return ok(res, { ...doc, updatedBy: undefined, updates: doc.updates.map((u) => ({ ...u, createdBy: undefined })) });
}
