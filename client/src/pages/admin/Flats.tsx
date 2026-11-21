import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Flat, FlatStatus } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { EmptyState, ErrorState, FlatStatusBadge, Pagination, Skeleton, TableWrap } from "@/components/ui/data";
import { MoneyInput } from "@/components/ui/editors";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { flatStatusLabel, formatBDT, sqft } from "@/utils/format";
import { useProjectOptions } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const n = (min = 0) => z.coerce.number({ invalid_type_error: "Enter a number" }).min(min);
const flatSchema = z.object({
  unitNumber: z.string().trim().min(1, "Unit number is required").max(20),
  floor: n(0).int(),
  sizeSqft: n(1),
  bedrooms: n(0).int(),
  bathrooms: n(0).int(),
  balconies: n(0).int(),
  facing: z.string().optional(),
  parking: z.boolean(),
  priceMinor: z.number({ invalid_type_error: "Enter a price" }).int().min(0),
  status: z.enum(["available", "reserved", "booked", "sold"]),
  notes: z.string().max(1000).optional(),
});
type FlatV = z.infer<typeof flatSchema>;

function FlatModal({ open, onClose, projectId, flat }: { open: boolean; onClose: () => void; projectId: string; flat?: Flat | null }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const { register, handleSubmit, control, reset, formState } = useForm<FlatV>({ resolver: zodResolver(flatSchema) });
  useEffect(() => {
    if (open)
      reset(
        flat
          ? { ...flat, facing: flat.facing ?? "", notes: flat.notes ?? "", priceMinor: flat.priceMinor ?? 0 }
          : { unitNumber: "", floor: 1, sizeSqft: 1200, bedrooms: 3, bathrooms: 2, balconies: 2, facing: "", parking: true, priceMinor: undefined as unknown as number, status: "available", notes: "" },
      );
  }, [open, flat, reset]);
  const save = useMutation({
    mutationFn: (v: FlatV) => (flat ? api.patch(`/flats/${flat._id}`, v) : api.post("/flats", { ...v, project: projectId })),
    onSuccess: () => {
      toast(flat ? `Unit ${flat.unitNumber} updated` : "Unit added");
      qc.invalidateQueries({ queryKey: ["flats"] });
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const { errors } = formState;
  const hasCustomer = !!flat?.customer;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={flat ? `Edit unit ${flat.unitNumber}` : "Add a unit"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
            {flat ? "Save unit" : "Add unit"}
          </Button>
        </>
      }
    >
      <form className="grid grid-cols-2 gap-4 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        <Field label="Unit number" required error={errors.unitNumber?.message}>
          <Input placeholder="5A" invalid={!!errors.unitNumber} {...register("unitNumber")} />
        </Field>
        <Field label="Floor" required error={errors.floor?.message}>
          <Input inputMode="numeric" invalid={!!errors.floor} {...register("floor")} />
        </Field>
        <Field label="Size (sft)" required error={errors.sizeSqft?.message}>
          <Input inputMode="numeric" invalid={!!errors.sizeSqft} {...register("sizeSqft")} />
        </Field>
        <Field label="Bedrooms">
          <Input inputMode="numeric" {...register("bedrooms")} />
        </Field>
        <Field label="Bathrooms">
          <Input inputMode="numeric" {...register("bathrooms")} />
        </Field>
        <Field label="Balconies">
          <Input inputMode="numeric" {...register("balconies")} />
        </Field>
        <Field label="Facing">
          <Input placeholder="South" {...register("facing")} />
        </Field>
        <Field label="List price" required error={errors.priceMinor?.message} className="sm:col-span-2">
          <Controller control={control} name="priceMinor" render={({ field }) => <MoneyInput value={field.value} onChange={(v) => field.onChange(v ?? undefined)} invalid={!!errors.priceMinor} />} />
        </Field>
        <Field label="Status" hint={hasCustomer ? "Assigned units change status from the customer page" : "Booked and sold require a customer"} className="col-span-2 sm:col-span-1">
          <Select {...register("status")} disabled={!flat}>
            {(Object.keys(flatStatusLabel) as FlatStatus[]).map((s) => (
              <option key={s} value={s} disabled={hasCustomer ? s === "available" : s === "booked" || s === "sold"}>
                {flatStatusLabel[s]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="col-span-2 flex items-end pb-2">
          <Controller control={control} name="parking" render={({ field }) => <Checkbox label="Includes car parking" checked={field.value} onChange={field.onChange} />} />
        </div>
        <Field label="Internal notes" className="col-span-2 sm:col-span-3">
          <Textarea rows={2} {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

const bulkSchema = z.object({
  from: n(0).int(),
  to: n(0).int(),
  units: z
    .array(
      z.object({
        suffix: z.string().trim().min(1, "Required").max(4),
        sizeSqft: n(1),
        bedrooms: n(0).int(),
        bathrooms: n(0).int(),
        facing: z.string().optional(),
        priceMinor: z.number({ invalid_type_error: "Enter a price" }).int().min(0),
      }),
    )
    .min(1),
});
type BulkV = z.infer<typeof bulkSchema>;

function BulkModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const { register, control, handleSubmit, watch, formState } = useForm<BulkV>({
    resolver: zodResolver(bulkSchema),
    defaultValues: { from: 1, to: 9, units: [{ suffix: "A", sizeSqft: 1300, bedrooms: 3, bathrooms: 2, facing: "", priceMinor: undefined as unknown as number }] },
  });
  const units = useFieldArray({ control, name: "units" });
  const v = watch();
  const total = Math.max(0, (Number(v.to) - Number(v.from) + 1) * (v.units?.length ?? 0));
  const save = useMutation({
    mutationFn: (b: BulkV) =>
      api.post<{ count: number }>("/flats/bulk", { project: projectId, floors: { from: b.from, to: b.to }, units: b.units.map((u) => ({ ...u, balconies: 2 })) }),
    onSuccess: (r) => {
      toast(`${r.count} units created`);
      qc.invalidateQueries({ queryKey: ["flats"] });
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Generate units floor by floor"
      description="Creates one unit per type on every floor in the range, named floor + suffix (e.g. 5A, 5B)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={handleSubmit((b) => save.mutate(b))}>
            Create {total} units
          </Button>
        </>
      }
    >
      <div className="grid max-w-xs grid-cols-2 gap-3">
        <Field label="From floor">
          <Input inputMode="numeric" {...register("from")} />
        </Field>
        <Field label="To floor">
          <Input inputMode="numeric" {...register("to")} />
        </Field>
      </div>
      <h3 className="mt-6 mb-2 font-sans text-sm font-bold tracking-normal">Unit types on each floor</h3>
      <div className="space-y-3">
        {units.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-2 items-end gap-2 rounded-xs border border-line p-3 sm:grid-cols-[70px_100px_70px_70px_1fr_1.4fr_auto]">
            <Field label="Suffix" error={formState.errors.units?.[i]?.suffix?.message}>
              <Input {...register(`units.${i}.suffix`)} />
            </Field>
            <Field label="Size sft">
              <Input inputMode="numeric" {...register(`units.${i}.sizeSqft`)} />
            </Field>
            <Field label="Beds">
              <Input inputMode="numeric" {...register(`units.${i}.bedrooms`)} />
            </Field>
            <Field label="Baths">
              <Input inputMode="numeric" {...register(`units.${i}.bathrooms`)} />
            </Field>
            <Field label="Facing">
              <Input {...register(`units.${i}.facing`)} />
            </Field>
            <Field label="Price" error={formState.errors.units?.[i]?.priceMinor?.message}>
              <Controller control={control} name={`units.${i}.priceMinor`} render={({ field }) => <MoneyInput value={field.value} onChange={(x) => field.onChange(x ?? undefined)} />} />
            </Field>
            <Button variant="ghost" aria-label="Remove type" disabled={units.fields.length === 1} onClick={() => units.remove(i)} icon={<Trash2 className="size-4" />} />
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="mt-3"
        icon={<Plus className="size-3.5" />}
        onClick={() => units.append({ suffix: String.fromCharCode(65 + units.fields.length), sizeSqft: 1300, bedrooms: 3, bathrooms: 2, facing: "", priceMinor: undefined as unknown as number })}
      >
        Add unit type
      </Button>
    </Modal>
  );
}

export default function Flats() {
  useDocumentTitle("Flats & units");
  const [params, setParams] = useSearchParams();
  const { data: projects } = useProjectOptions();
  const projectId = params.get("project") ?? "";
  const status = params.get("status") ?? "";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Flat | null | undefined>(undefined);
  const [bulk, setBulk] = useState(false);
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();

  useEffect(() => {
    if (!projectId && projects?.length) setParams({ project: projects[0]._id }, { replace: true });
  }, [projectId, projects, setParams]);
  useEffect(() => {
    setPage(1);
  }, [projectId, status, search]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["flats", projectId, status, search, page],
    queryFn: () => api.page<Flat[]>("/flats", { project: projectId, status, search, page, limit: 100 }),
    enabled: !!projectId,
    placeholderData: (p) => p,
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/flats/${id}`),
    onSuccess: () => {
      toast("Unit deleted");
      qc.invalidateQueries({ queryKey: ["flats"] });
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const project = projects?.find((p) => p._id === projectId);

  return (
    <>
      <PageHeader
        title="Flats & units"
        description={project ? `${project.units?.total ?? 0} units in ${project.name}` : "Select a project"}
        actions={
          projectId && (
            <>
              <Button variant="secondary" icon={<Layers className="size-4" />} onClick={() => setBulk(true)}>
                Generate floors
              </Button>
              <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
                Add unit
              </Button>
            </>
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select className="w-64" aria-label="Project" value={projectId} onChange={(e) => setParams({ project: e.target.value }, { replace: true })}>
          {projects?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-44"
          aria-label="Status"
          value={status}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set("status", e.target.value);
            else next.delete("status");
            setParams(next, { replace: true });
          }}
        >
          <option value="">All statuses</option>
          {Object.entries(flatStatusLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <label className="relative w-56">
          <span className="sr-only">Search unit</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
          <Input className="pl-9" placeholder="Unit number" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <div className="rounded-md border border-line bg-paper px-5">
        {projects && projects.length === 0 ? (
          <EmptyState title="No projects yet" body="Create a project first, then add its units here." action={<Link to="/admin/projects/new" className="font-semibold text-ink underline">Create a project</Link>} />
        ) : isError ? (
          <div className="py-5">
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          </div>
        ) : isLoading || !data ? (
          <div className="space-y-2 py-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <EmptyState title="No units match" body="Add units one by one or generate them for a range of floors." action={<Button onClick={() => setBulk(true)}>Generate floors</Button>} />
        ) : (
          <>
            <TableWrap>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Floor</th>
                    <th>Size</th>
                    <th>Beds / baths</th>
                    <th>Facing</th>
                    <th className="text-right">List price</th>
                    <th>Status</th>
                    <th>Customer</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((f) => {
                    const c = typeof f.customer === "object" ? f.customer : null;
                    return (
                      <tr key={f._id}>
                        <td className="font-bold">{f.unitNumber}</td>
                        <td className="tabular-nums">{f.floor}</td>
                        <td className="whitespace-nowrap tabular-nums">{sqft(f.sizeSqft)}</td>
                        <td>
                          {f.bedrooms} / {f.bathrooms}
                        </td>
                        <td>{f.facing ?? "–"}</td>
                        <td className="text-right whitespace-nowrap tabular-nums">{formatBDT(f.priceMinor)}</td>
                        <td>
                          <FlatStatusBadge s={f.status} />
                        </td>
                        <td>
                          {c ? (
                            <Link to={`/admin/customers/${c._id}`} className="font-semibold hover:underline">
                              {c.fullName}
                              <span className="block text-xs font-normal text-slate">{c.code}</span>
                            </Link>
                          ) : (
                            <span className="text-slate">–</span>
                          )}
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button className="rounded-xs p-2 text-slate hover:bg-mist hover:text-ink" aria-label={`Edit unit ${f.unitNumber}`} onClick={() => setEditing(f)}>
                              <Pencil className="size-4" />
                            </button>
                            <button
                              className="rounded-xs p-2 text-slate hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                              disabled={!!c}
                              title={c ? "Assigned units cannot be deleted" : undefined}
                              aria-label={`Delete unit ${f.unitNumber}`}
                              onClick={async () => {
                                if (await confirm({ title: `Delete unit ${f.unitNumber}?`, message: "This removes the unit from the project and the website.", confirmLabel: "Delete unit", danger: true })) del.mutate(f._id);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
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
      {projectId && <FlatModal open={editing !== undefined} onClose={() => setEditing(undefined)} projectId={projectId} flat={editing} />}
      {projectId && <BulkModal open={bulk} onClose={() => setBulk(false)} projectId={projectId} />}
    </>
  );
}
