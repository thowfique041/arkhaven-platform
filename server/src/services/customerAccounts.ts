import type { Request } from "express";
import { Customer, Flat, Project, User, nextSeq } from "../models";
import { ApiError } from "../utils/http";
import { generatePassword, hashPassword } from "./credentials";
import { logActivity } from "./activity";

export interface NewCustomerInput {
  fullName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  project?: string | null;
  flat?: string | null;
  bookingDate?: Date | null;
  agreedPriceMinor?: number | null;
  notes?: string | null;
  lead?: string | null;
  flatStatus?: "reserved" | "booked" | "sold";
}

export interface IssuedCredentials {
  username: string;
  temporaryPassword: string;
}

/**
 * Atomically claims a flat for a customer. Uses a conditional update so two admins
 * cannot book the same unit at the same time.
 */
export async function claimFlat(projectId: string, flatId: string, customerId: string, status: string, allowCustomerId?: string) {
  const flat = await Flat.findById(flatId).lean();
  if (!flat) throw ApiError.badRequest("Selected flat does not exist");
  if (String(flat.project) !== String(projectId)) throw ApiError.badRequest("Selected flat does not belong to the selected project");
  const claimable: Record<string, unknown>[] = [{ customer: null, status: { $in: ["available", "reserved"] } }];
  if (allowCustomerId) claimable.push({ customer: allowCustomerId });
  const claimed = await Flat.findOneAndUpdate({ _id: flatId, $or: claimable }, { $set: { customer: customerId, status } }, { new: true });
  if (!claimed) throw ApiError.conflict(`Unit ${flat.unitNumber} is already booked by another customer`);
  return claimed;
}

export async function releaseFlat(flatId: unknown) {
  if (!flatId) return;
  await Flat.updateOne({ _id: flatId }, { $set: { customer: null, status: "available" } });
}

export async function createCustomerAccount(req: Request, input: NewCustomerInput) {
  if (input.flat && !input.project) throw ApiError.badRequest("Select a project for the flat");
  if (input.project && !(await Project.exists({ _id: input.project }))) throw ApiError.badRequest("Project does not exist");
  if (input.email && (await User.exists({ email: input.email }))) {
    throw ApiError.conflict("A login with this email already exists");
  }
  if (input.lead && (await Customer.exists({ lead: input.lead }))) {
    throw ApiError.conflict("This lead already has a customer account");
  }

  const seq = await nextSeq("customer");
  const yy = String(new Date().getFullYear()).slice(-2);
  const code = `AKH-${yy}${String(seq).padStart(4, "0")}`;
  const username = code.toLowerCase();
  const temporaryPassword = generatePassword();

  const user = await User.create({
    name: input.fullName,
    username,
    email: input.email || undefined,
    phone: input.phone,
    role: "customer",
    passwordHash: await hashPassword(temporaryPassword),
    mustChangePassword: true,
  });

  let customer;
  try {
    customer = await Customer.create({
      code,
      user: user._id,
      lead: input.lead || undefined,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email || undefined,
      address: input.address || undefined,
      project: input.project || undefined,
      bookingDate: input.bookingDate || (input.flat ? new Date() : undefined),
      agreedPriceMinor: input.agreedPriceMinor ?? 0,
      notes: input.notes || undefined,
    });
    if (input.flat && input.project) {
      const flat = await claimFlat(input.project, input.flat, String(customer._id), input.flatStatus ?? "booked");
      customer.flat = flat._id;
      if (!input.agreedPriceMinor) customer.agreedPriceMinor = flat.priceMinor;
      await customer.save();
    }
    user.customer = customer._id;
    await user.save();
  } catch (e) {
    // Manual rollback (no multi-document transaction dependency).
    if (customer) await Customer.deleteOne({ _id: customer._id });
    await User.deleteOne({ _id: user._id });
    throw e;
  }

  await logActivity(req, "customer.create", "Customer", customer._id, `Created customer account ${code} for ${input.fullName}`);
  const credentials: IssuedCredentials = { username, temporaryPassword };
  return { customer, credentials };
}
