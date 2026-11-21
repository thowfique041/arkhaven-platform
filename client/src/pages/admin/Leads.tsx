import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarClock, MessageSquarePlus, Pencil, Phone, Plus, Search, Trash2, UserCheck } from "lucide-react";
import clsx from "clsx";
import { api, errorMessage } from "@/services/api";
import type { Credentials, Customer, Lead, LeadSource, LeadStatus } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProjectFlatPicker } from "@/components/admin/ProjectFlatPicker";
import { Badge, Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LeadStatusBadge, Pagination, Skeleton, TableWrap } from "@/components/ui/data";
import { MoneyInput } from "@/components/ui/editors";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { CredentialsDialog } from "@/components/ui/CredentialsDialog";
import { formatBDT, formatBDTShort, formatDate, leadSourceLabel, leadStatusLabel, relativeTime, toDateInput } from "@/utils/format";
import { useProjectOptions } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const statuses = Object.keys(leadStatusLabel) as LeadStatus[];
const sources = Object.keys(leadSourceLabel) as LeadSource[];

const leadSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the customer's full name"),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{5,}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  address: z.string().max(300),
  interestedProject: z.string(),
  interestedFlat: z.string(),
  budgetMinor: z.number().int().min(0).nullable(),
  source: z.enum(sources as [LeadSource, ...LeadSource[]]),
  status: z.enum(statuses as [LeadStatus, ...LeadStatus[]]),
  notes: z.string().max(4000),
  followUpDate: z.string(),
  createAccount: z.boolean(),
});
type LeadV = z.infer<typeof leadSchema>;

const blank: LeadV = { fullName: "", phone: "", email: "", address: "", interestedProject: "", interestedFlat: "", budgetMinor: null, source: "walk_in", status: "new", notes: "", followUpDate: "", createAccount: false };

function payload(v: LeadV) {
  const { createAccount, ...rest } = v;
  return {
    ...rest,
    email: v.email || null,
    address: v.address || null,
    interestedProject: v.interestedProject || null,
    interestedFlat: v.interestedFlat || null,
    followUpDate: v.followUpDate || null,
    notes: v.notes || null,
    ...(createAccount !== undefined ? { createAccount } : {}),
  };
}

function LeadForm({ lead, onDone, onCredentials }: { lead?: Lead; onDone: (l?: Lead) => void; onCredentials: (c: Credentials, who: string) => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const { register, control, handleSubmit, watch, setValue, formState } = useForm<LeadV>({
    resolver: zodResolver(leadSchema),
    defaultValues: lead
      ? {
          fullName: lead.fullName,
          phone: lead.phone,
          email: lead.email ?? "",
          address: lead.address ?? "",
          interestedProject: lead.interestedProject?._id ?? "",
          interestedFlat: lead.interestedFlat?._id ?? "",
          budgetMinor: lead.budgetMinor ?? null,
          source: lead.source,
          status: lead.status,
          notes: lead.notes ?? "",
          followUpDate: toDateInput(lead.followUpDate),
          createAccount: false,
        }
      : blank,
  });
  const { errors } = formState;
  const save = useMutation({
    mutationFn: (v: LeadV) => {
      if (lead) {
        const { createAccount: _c, ...rest } = payload(v) as ReturnType<typeof payload> & { createAccount?: boolean };
        return api.patch<Lead>(`/leads/${lead._id}`, rest).then((l) => ({ lead: l, credentials: null as Credentials | null }));
      }
      return api.post<{ lead: Lead; credentials: Credentials | null }>("/leads", payload(v));
    },
    onSuccess: (r) => {
      toast(lead ? "Lead updated" : "Lead created");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead"] });
      if (r.credentials) onCredentials(r.credentials, r.lead.fullName);
      onDone(r.lead);
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <form id="lead-form" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" required error={errors.fullName?.message}>
        <Input autoFocus invalid={!!errors.fullName} {...register("fullName")} />
      </Field>
      <Field label="Phone" required error={errors.phone?.message}>
        <Input type="tel" invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <Field label="Email" error={errors.email?.message} hint="Optional. Also used as an alternative login.">
        <Input type="email" invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Address">
        <Input {...register("address")} />
      </Field>
      <ProjectFlatPicker
        project={watch("interestedProject")}
        flat={watch("interestedFlat")}
        onProject={(id) => setValue("interestedProject", id, { shouldDirty: true })}
        onFlat={(id) => setValue("interestedFlat", id, { shouldDirty: true })}
        projectLabel="Interested project"
        flatLabel="Interested unit"
        onlyOpen={false}
      />
      <Field label="Estimated budget">
        <Controller control={control} name="budgetMinor" render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />} />
      </Field>
      <Field label="Lead source">
        <Select {...register("source")}>
          {sources.map((s) => (
            <option key={s} value={s}>
              {leadSourceLabel[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select {...register("status")}>
          {statuses
            .filter((s) => s !== "converted" || lead?.status === "converted")
            .map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel[s]}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Follow-up date">
        <Input type="date" {...register("followUpDate")} />
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <Textarea rows={3} {...register("notes")} />
      </Field>
      {!lead && (
        <div className="rounded-xs border border-line bg-mist/60 p-4 sm:col-span-2">
          <Controller
            control={control}
            name="createAccount"
            render={({ field }) => (
              <Checkbox
                label="Create a customer portal login now"
                description="Generates a username and one-time password. If a unit is selected it is marked reserved for this customer."
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {lead ? "Save lead" : "Create lead"}
        </Button>
      </div>
    </form>
  );
}

const convertSchema = z.object({
  project: z.string().min(1, "Select a project"),
  flat: z.string().min(1, "Select a unit"),
  agreedPriceMinor: z.number({ invalid_type_error: "Enter the agreed price" }).int().min(1, "Enter the agreed price"),
  bookingDate: z.string().min(1, "Enter the booking date"),
  flatStatus: z.enum(["reserved", "booked", "sold"]),
});
type ConvertV = z.infer<typeof convertSchema>;

function ConvertModal({ lead, onClose, onCredentials }: { lead: Lead; onClose: () => void; onCredentials: (c: Credentials, who: string) => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const { control, handleSubmit, watch, setValue, register, formState } = useForm<ConvertV>({
    resolver: zodResolver(convertSchema),
    defaultValues: {
      project: lead.interestedProject?._id ?? "",
      flat: lead.interestedFlat && (lead.interestedFlat.status === "available" || lead.interestedFlat.status === "reserved") ? lead.interestedFlat._id : "",
      agreedPriceMinor: lead.interestedFlat?.priceMinor ?? (undefined as unknown as number),
      bookingDate: toDateInput(new Date()),
      flatStatus: "booked",
    },
  });
  const { errors } = formState;
  const convert = useMutation({
    mutationFn: (v: ConvertV) => api.post<{ customer: Customer; credentials: Credentials }>(`/leads/${lead._id}/convert`, v),
    onSuccess: (r) => {
      toast(`${lead.fullName} is now customer ${r.customer.code}`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", lead._id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["flats"] });
      onCredentials(r.credentials, lead.fullName);
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={`Convert ${lead.fullName} to customer`}
      description="Creates the portal account, books the unit and records the agreed price."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={convert.isPending} onClick={handleSubmit((v) => convert.mutate(v))} icon={<UserCheck className="size-4" />}>
            Create customer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ProjectFlatPicker
          required
          project={watch("project")}
          flat={watch("flat")}
          onProject={(id) => setValue("project", id, { shouldValidate: formState.isSubmitted })}
          onFlat={(id, f) => {
            setValue("flat", id, { shouldValidate: formState.isSubmitted });
            if (f?.priceMinor) setValue("agreedPriceMinor", f.priceMinor);
          }}
          errors={{ project: errors.project?.message, flat: errors.flat?.message }}
        />
        <Field label="Agreed price" required error={errors.agreedPriceMinor?.message} hint="Defaults to the unit's list price">
          <Controller control={control} name="agreedPriceMinor" render={({ field }) => <MoneyInput value={field.value} onChange={(v) => field.onChange(v ?? undefined)} invalid={!!errors.agreedPriceMinor} />} />
        </Field>
        <Field label="Booking date" required error={errors.bookingDate?.message}>
          <Input type="date" {...register("bookingDate")} />
        </Field>
        <Field label="Mark unit as">
          <Select {...register("flatStatus")}>
            <option value="reserved">Reserved</option>
            <option value="booked">Booked</option>
            <option value="sold">Sold</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function LeadPanel({ id, onClose, onCredentials }: { id: string; onClose: () => void; onCredentials: (c: Credentials, who: string) => void }) {
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [note, setNote] = useState("");
  const [follow, setFollow] = useState("");
  const { data: lead, isLoading, isError, error } = useQuery({ queryKey: ["lead", id], queryFn: () => api.get<Lead>(`/leads/${id}`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lead", id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  };
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const customer = lead && typeof lead.customer === "object" ? lead.customer : null;
  return (
    <Modal open onClose={onClose} size="lg" title={lead?.fullName ?? "Lead"} description={lead ? `Added ${formatDate(lead.createdAt)}, source: ${leadSourceLabel[lead.source]}` : undefined}>
      {isError && <ErrorState message={(error as Error).message} />}
      {isLoading && <Skeleton className="h-60" />}
      {lead && editing && (
        <LeadForm
          lead={lead}
          onCredentials={onCredentials}
          onDone={(l) => {
            setEditing(false);
            if (l) refresh();
          }}
        />
      )}
      {lead && !editing && (
        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Lead status"
                className="h-9 w-56 py-1.5"
                value={lead.status}
                disabled={lead.status === "converted"}
                onChange={(e) => {
                  const next = e.target.value as LeadStatus;
                  act.mutate(() => api.patch(`/leads/${id}/status`, { status: next }).then(() => toast(`Status changed to ${leadStatusLabel[next]}`)));
                }}
              >
                {statuses.map((s) => (
                  <option key={s} value={s} disabled={s === "converted"}>
                    {leadStatusLabel[s]}
                  </option>
                ))}
              </Select>
              {customer ? (
                <Link to={`/admin/customers/${customer._id}`} className="inline-flex">
                  <Badge tone="ink">Customer {customer.code}</Badge>
                </Link>
              ) : (
                <Button size="sm" icon={<UserCheck className="size-4" />} onClick={() => setConverting(true)}>
                  Convert to customer
                </Button>
              )}
            </div>

            <div className="mt-5">
              <label htmlFor="lead-note" className="text-[13px] font-semibold">
                Add a note
              </label>
              <div className="mt-1.5 flex gap-2">
                <Textarea id="lead-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Call summary, objections, next step…" />
                <Button
                  variant="secondary"
                  disabled={!note.trim()}
                  loading={act.isPending}
                  icon={<MessageSquarePlus className="size-4" />}
                  onClick={() =>
                    act.mutate(() =>
                      api.post(`/leads/${id}/notes`, { note: note.trim() }).then(() => {
                        setNote("");
                        toast("Note added");
                      }),
                    )
                  }
                >
                  Add
                </Button>
              </div>
            </div>

            <h3 className="mt-6 mb-2 font-sans text-sm font-bold tracking-normal">History</h3>
            <ol className="relative border-l border-line">
              {lead.history?.map((h) => (
                <li key={h._id} className="relative pb-4 pl-5">
                  <span className={clsx("absolute top-1.5 -left-[5px] size-2.5 rounded-full", h.type === "note" ? "bg-brass" : h.type === "converted" ? "bg-ink" : "bg-line")} />
                  <p className="text-sm">
                    {h.type === "status" && (
                      <>
                        Status <b>{leadStatusLabel[h.from as LeadStatus] ?? h.from}</b> → <b>{leadStatusLabel[h.to as LeadStatus] ?? h.to}</b>
                      </>
                    )}
                    {h.type === "created" && "Lead created"}
                    {h.type === "follow_up" && <>Follow-up set for {formatDate(h.to)}</>}
                    {h.type === "converted" && <b>Converted to customer</b>}
                    {h.type === "account" && "Portal account created"}
                    {h.type === "updated" && "Details updated"}
                    {h.type === "note" && <span className="whitespace-pre-wrap">{h.note}</span>}
                  </p>
                  {h.type !== "note" && h.note && <p className="text-sm whitespace-pre-wrap text-slate">{h.note}</p>}
                  <p className="text-xs text-slate">
                    {h.byName ?? "System"}, {relativeTime(h.at)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <aside className="space-y-4 text-sm">
            <dl className="space-y-3 rounded-xs border border-line p-4">
              <div>
                <dt className="text-xs text-slate">Phone</dt>
                <dd>
                  <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 font-semibold hover:underline">
                    <Phone className="size-3.5" />
                    {lead.phone}
                  </a>
                </dd>
              </div>
              {lead.email && (
                <div>
                  <dt className="text-xs text-slate">Email</dt>
                  <dd className="break-all">{lead.email}</dd>
                </div>
              )}
              {lead.address && (
                <div>
                  <dt className="text-xs text-slate">Address</dt>
                  <dd>{lead.address}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate">Interested in</dt>
                <dd>
                  {lead.interestedProject?.name ?? "Not specified"}
                  {lead.interestedFlat && `, unit ${lead.interestedFlat.unitNumber}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate">Budget</dt>
                <dd>{lead.budgetMinor ? formatBDT(lead.budgetMinor) : "–"}</dd>
              </div>
              {lead.notes && (
                <div>
                  <dt className="text-xs text-slate">Notes</dt>
                  <dd className="whitespace-pre-wrap">{lead.notes}</dd>
                </div>
              )}
            </dl>
            <div className="rounded-xs border border-line p-4">
              <p className="flex items-center gap-1.5 text-xs text-slate">
                <CalendarClock className="size-3.5" /> Next follow-up
              </p>
              <p className="mt-1 font-semibold">{lead.followUpDate ? formatDate(lead.followUpDate) : "Not scheduled"}</p>
              <div className="mt-3 flex gap-2">
                <Input type="date" aria-label="New follow-up date" className="h-9 py-1.5" value={follow} onChange={(e) => setFollow(e.target.value)} />
                <Button
                  size="md"
                  variant="secondary"
                  disabled={!follow}
                  onClick={() =>
                    act.mutate(() =>
                      api.post(`/leads/${id}/follow-up`, { followUpDate: follow }).then(() => {
                        setFollow("");
                        toast("Follow-up scheduled");
                      }),
                    )
                  }
                >
                  Set
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger/10"
                disabled={!!customer}
                icon={<Trash2 className="size-4" />}
                onClick={async () => {
                  if (await confirm({ title: `Delete ${lead.fullName}?`, message: "The lead and its history will be removed permanently.", confirmLabel: "Delete lead", danger: true })) {
                    act.mutate(() =>
                      api.del(`/leads/${id}`).then(() => {
                        toast("Lead deleted");
                        onClose();
                      }),
                    );
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </aside>
        </div>
      )}
      {lead && converting && <ConvertModal lead={lead} onClose={() => setConverting(false)} onCredentials={onCredentials} />}
    </Modal>
  );
}

export default function Leads() {
  useDocumentTitle("Leads");
  const [params, setParams] = useSearchParams();
  const { data: projects } = useProjectOptions();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [creds, setCreds] = useState<{ c: Credentials; who: string } | null>(null);
  const status = params.get("status") ?? "";
  const source = params.get("source") ?? "";
  const project = params.get("project") ?? "";
  const followUp = params.get("followUp") ?? "";
  const open = params.get("open");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(1);
  }, [status, source, project, followUp, debounced]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leads", status, source, project, followUp, debounced, page],
    queryFn: () => api.page<Lead[]>("/leads", { status, source, project, followUp, search: debounced, page, limit: 25, sort: followUp ? "followUp" : undefined }),
    placeholderData: (p) => p,
  });
  const counts = (data?.meta.counts as Record<LeadStatus, number> | undefined) ?? undefined;
  const allCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every prospective buyer, from first contact to booking."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            New lead
          </Button>
        }
      />

      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Lead status">
        {[["", "All", allCount] as const, ...statuses.map((s) => [s, leadStatusLabel[s], counts?.[s]] as const)].map(([k, l, c]) => (
          <button key={k || "all"} role="tab" aria-selected={status === k} onClick={() => setParam("status", k)} className={clsx("-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap", status === k ? "border-ink text-ink" : "border-transparent text-slate hover:text-ink")}>
            {l}
            {c !== undefined && <span className="ml-1.5 text-xs font-normal text-slate tabular-nums">{c}</span>}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search leads</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
          <Input className="pl-9" placeholder="Name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Select className="w-44" aria-label="Source" value={source} onChange={(e) => setParam("source", e.target.value)}>
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {leadSourceLabel[s]}
            </option>
          ))}
        </Select>
        <Select className="w-52" aria-label="Project" value={project} onChange={(e) => setParam("project", e.target.value)}>
          <option value="">All projects</option>
          {projects?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select className="w-48" aria-label="Follow-up" value={followUp} onChange={(e) => setParam("followUp", e.target.value)}>
          <option value="">Any follow-up</option>
          <option value="due">Due today or overdue</option>
          <option value="upcoming">Upcoming</option>
        </Select>
      </div>

      <div className="rounded-md border border-line bg-paper px-5">
        {isError ? (
          <div className="py-5">
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          </div>
        ) : isLoading || !data ? (
          <div className="space-y-2 py-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <EmptyState title="No leads here" body="Add leads from calls, walk-ins and events, or convert website inquiries." action={<Button onClick={() => setCreating(true)}>New lead</Button>} />
        ) : (
          <>
            <TableWrap>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Interest</th>
                    <th>Budget</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Follow-up</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((l) => {
                    const overdue = l.followUpDate && new Date(l.followUpDate) < today && !["converted", "lost"].includes(l.status);
                    return (
                      <tr key={l._id} className="cursor-pointer" onClick={() => setParam("open", l._id)}>
                        <td>
                          <button className="text-left font-semibold hover:underline">{l.fullName}</button>
                          <p className="text-xs text-slate">{l.phone}</p>
                        </td>
                        <td>
                          {l.interestedProject?.name ?? <span className="text-slate">–</span>}
                          {l.interestedFlat && <span className="text-slate">, {l.interestedFlat.unitNumber}</span>}
                        </td>
                        <td className="whitespace-nowrap tabular-nums">{formatBDTShort(l.budgetMinor)}</td>
                        <td className="whitespace-nowrap">{leadSourceLabel[l.source]}</td>
                        <td>
                          <LeadStatusBadge s={l.status} />
                        </td>
                        <td className={clsx("whitespace-nowrap", overdue && "font-semibold text-danger")}>{l.followUpDate ? formatDate(l.followUpDate) : "–"}</td>
                        <td className="whitespace-nowrap text-slate">{formatDate(l.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
          </>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} size="lg" title="New lead">
        {creating && <LeadForm onDone={() => setCreating(false)} onCredentials={(c, who) => setCreds({ c, who })} />}
      </Modal>
      {open && <LeadPanel id={open} onClose={() => setParam("open", "")} onCredentials={(c, who) => setCreds({ c, who })} />}
      <CredentialsDialog credentials={creds?.c ?? null} who={creds?.who} onClose={() => setCreds(null)} />
    </>
  );
}
