import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, HardHat, KeyRound, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Credentials, Customer } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProjectFlatPicker } from "@/components/admin/ProjectFlatPicker";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { PaymentFormModal } from "@/components/admin/PaymentDialogs";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { EmptyState, ErrorState, ProgressBar, Skeleton } from "@/components/ui/data";
import { MoneyInput } from "@/components/ui/editors";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { CredentialsDialog } from "@/components/ui/CredentialsDialog";
import { formatBDT, formatDate, relativeTime, sqft, toDateInput } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const editSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{5,}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  address: z.string().max(300),
  bookingDate: z.string(),
  agreedPriceMinor: z.number({ invalid_type_error: "Enter the agreed price" }).int().min(0),
  notes: z.string().max(4000),
});
type EditV = z.infer<typeof editSchema>;

function EditModal({ c, open, onClose }: { c: Customer; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const { register, control, handleSubmit, reset, formState } = useForm<EditV>({ resolver: zodResolver(editSchema) });
  useEffect(() => {
    if (open) reset({ fullName: c.fullName, phone: c.phone, email: c.email ?? "", address: c.address ?? "", bookingDate: toDateInput(c.bookingDate), agreedPriceMinor: c.agreedPriceMinor, notes: c.notes ?? "" });
  }, [open, c, reset]);
  const m = useMutation({
    mutationFn: (v: EditV) => api.patch(`/customers/${c._id}`, { ...v, email: v.email || null, address: v.address || null, bookingDate: v.bookingDate || null, notes: v.notes || null }),
    onSuccess: () => {
      toast("Customer updated");
      qc.invalidateQueries({ queryKey: ["customer", c._id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const { errors } = formState;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit customer"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={m.isPending} onClick={handleSubmit((v) => m.mutate(v))}>
            Save customer
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <Field label="Full name" required error={errors.fullName?.message}>
          <Input {...register("fullName")} />
        </Field>
        <Field label="Phone" required error={errors.phone?.message}>
          <Input {...register("phone")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </Field>
        <Field label="Address">
          <Input {...register("address")} />
        </Field>
        <Field label="Agreed price" required error={errors.agreedPriceMinor?.message} hint="Cannot be lower than paid + pending">
          <Controller control={control} name="agreedPriceMinor" render={({ field }) => <MoneyInput value={field.value} onChange={(v) => field.onChange(v ?? undefined)} />} />
        </Field>
        <Field label="Booking date">
          <Input type="date" {...register("bookingDate")} />
        </Field>
        <Field label="Internal notes" className="sm:col-span-2" hint="Never shown to the customer">
          <Textarea rows={3} {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

function AssignModal({ c, open, onClose }: { c: Customer; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [project, setProject] = useState(c.project?._id ?? "");
  const [flat, setFlat] = useState(c.flat?._id ?? "");
  const [price, setPrice] = useState<number | null>(c.agreedPriceMinor || null);
  const [status, setStatus] = useState<"reserved" | "booked" | "sold">((c.flat?.status as "booked") ?? "booked");
  const m = useMutation({
    mutationFn: () => api.post(`/customers/${c._id}/assign-flat`, { project, flat, agreedPriceMinor: price ?? undefined, flatStatus: status }),
    onSuccess: () => {
      toast("Unit assigned");
      qc.invalidateQueries({ queryKey: ["customer", c._id] });
      qc.invalidateQueries({ queryKey: ["flats"] });
      qc.invalidateQueries({ queryKey: ["flat-options"] });
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={c.flat ? "Change assigned unit" : "Assign a unit"}
      description={c.flat ? "The previous unit is released back to available." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!project || !flat} loading={m.isPending} onClick={() => m.mutate()}>
            Assign unit
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ProjectFlatPicker
          project={project}
          flat={flat}
          includeFlatId={c.flat?._id}
          onProject={setProject}
          onFlat={(id, f) => {
            setFlat(id);
            if (f?.priceMinor && !c.agreedPriceMinor) setPrice(f.priceMinor);
          }}
        />
        <Field label="Agreed price">
          <MoneyInput value={price} onChange={setPrice} />
        </Field>
        <Field label="Unit status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "booked")}>
            <option value="reserved">Reserved</option>
            <option value="booked">Booked</option>
            <option value="sold">Sold</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [paying, setPaying] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const { data: c, isLoading, isError, error, refetch } = useQuery({ queryKey: ["customer", id], queryFn: () => api.get<Customer>(`/customers/${id}`) });
  useDocumentTitle(c ? `${c.fullName} (${c.code})` : "Customer");

  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer", id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !c) return <Skeleton className="h-96" />;
  const s = c.summary!;
  const active = c.user?.isActive !== false;

  return (
    <>
      <Link to="/admin/customers" className="mb-3 inline-flex items-center gap-1 text-sm text-slate hover:text-ink">
        <ChevronLeft className="size-4" /> Customers
      </Link>
      <PageHeader
        title={c.fullName}
        description={`${c.code}, customer since ${formatDate(c.createdAt)}`}
        actions={
          <>
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              variant="secondary"
              icon={<KeyRound className="size-4" />}
              onClick={async () => {
                if (await confirm({ title: "Reset password?", message: "A new temporary password will be generated and all current sessions signed out. The customer must set a new password at next login.", confirmLabel: "Reset password" }))
                  act.mutate(() => api.post<{ credentials: Credentials }>(`/customers/${c._id}/reset-password`).then((r) => setCreds(r.credentials)));
              }}
            >
              Reset password
            </Button>
            <Button
              variant={active ? "secondary" : "primary"}
              icon={<Power className="size-4" />}
              onClick={async () => {
                if (await confirm({ title: active ? "Deactivate portal access?" : "Reactivate portal access?", message: active ? "The customer will be signed out immediately and cannot sign in until reactivated. Their records are kept." : "The customer will be able to sign in again with their current password.", confirmLabel: active ? "Deactivate" : "Reactivate", danger: active }))
                  act.mutate(() => api.post(`/customers/${c._id}/active`, { isActive: !active }).then(() => toast(active ? "Access deactivated" : "Access reactivated")));
              }}
            >
              {active ? "Deactivate" : "Reactivate"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Payment summary" actions={<Button size="sm" icon={<Plus className="size-3.5" />} disabled={!c.flat} onClick={() => setPaying(true)}>Record payment</Button>}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-[13px] text-slate">Agreed price</dt>
                <dd className="text-lg font-bold tabular-nums">{formatBDT(s.totalPriceMinor)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-slate">Paid (verified)</dt>
                <dd className="text-lg font-bold text-success tabular-nums">{formatBDT(s.paidMinor)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-slate">Pending</dt>
                <dd className="text-lg font-bold text-warning tabular-nums">{formatBDT(s.pendingMinor)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-slate">Remaining</dt>
                <dd className="text-lg font-bold tabular-nums">{formatBDT(s.remainingMinor)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar value={s.paidPercent} tone="success" className="h-2" />
              <span className="text-sm font-semibold tabular-nums">{s.paidPercent.toFixed(2)}%</span>
            </div>
          </Card>

          <Card title={`Payments (${c.payments?.length ?? 0})`}>
            {c.payments && c.payments.length > 0 ? (
              <PaymentsTable payments={c.payments} showCustomer={false} />
            ) : (
              <EmptyState title="No payments recorded" body={c.flat ? "Record the booking money to start the ledger." : "Assign a unit before recording payments."} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Property" actions={<Button size="sm" variant="secondary" onClick={() => setAssigning(true)}>{c.flat ? "Change unit" : "Assign unit"}</Button>}>
            {c.flat && c.project ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Project</dt>
                  <dd className="text-right font-semibold">
                    <Link to={`/admin/projects/${c.project._id}`} className="hover:underline">
                      {c.project.name}
                    </Link>
                  </dd>
                </div>
                {[
                  ["Unit", c.flat.unitNumber],
                  ["Floor", c.flat.floor],
                  ["Size", sqft(c.flat.sizeSqft)],
                  ["Bedrooms", c.flat.bedrooms],
                  ["Facing", c.flat.facing ?? "–"],
                  ["Booking date", formatDate(c.bookingDate)],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-3">
                    <dt className="text-slate">{k}</dt>
                    <dd className="text-right">{String(v)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Unit status</dt>
                  <dd>
                    <Badge tone="info">{c.flat.status}</Badge>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate">No unit assigned yet.</p>
            )}
            {c.flat && (
              <button
                className="mt-4 text-xs text-slate underline hover:text-danger"
                onClick={async () => {
                  if (await confirm({ title: "Release this unit?", message: "The unit becomes available again. Not possible once payments are verified.", confirmLabel: "Release unit", danger: true }))
                    act.mutate(() => api.post(`/customers/${c._id}/unassign-flat`).then(() => toast("Unit released")));
                }}
              >
                Release unit
              </button>
            )}
          </Card>

          {c.progress && (
            <Card title="Construction" actions={<Link to={`/admin/progress/${c.project?._id}`} className="text-sm font-semibold text-ink hover:underline">Update</Link>}>
              <div className="flex items-center gap-3">
                <HardHat className="size-5 text-brass" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{c.progress.stages[c.progress.currentStage]?.name}</p>
                  <ProgressBar value={c.progress.percent} tone="brass" className="mt-1.5" />
                </div>
                <span className="text-sm font-bold tabular-nums">{Math.round(c.progress.percent)}%</span>
              </div>
              <p className="mt-3 text-xs text-slate">Expected handover {formatDate(c.progress.expectedHandover)}</p>
            </Card>
          )}

          <Card title="Contact and login">
            <dl className="space-y-2 text-sm">
              {[
                ["Phone", c.phone],
                ["Email", c.email ?? "–"],
                ["Address", c.address ?? "–"],
                ["Username", c.user?.username],
                ["Last sign-in", c.user?.lastLoginAt ? relativeTime(c.user.lastLoginAt) : "Never"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate">{k}</dt>
                  <dd className="text-right break-all">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3">
                <dt className="text-slate">Status</dt>
                <dd>{active ? c.user?.mustChangePassword ? <Badge tone="warning">Temporary password</Badge> : <Badge tone="success">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}</dd>
              </div>
            </dl>
            {c.notes && <p className="mt-4 rounded-xs bg-mist p-3 text-sm whitespace-pre-wrap">{c.notes}</p>}
            <button
              className="mt-4 inline-flex items-center gap-1 text-xs text-slate hover:text-danger"
              onClick={async () => {
                if (await confirm({ title: `Delete ${c.fullName}?`, message: "Only possible when no payments are recorded. Deactivate instead to keep the history.", confirmLabel: "Delete customer", danger: true }))
                  act.mutate(() =>
                    api.del(`/customers/${c._id}`).then(() => {
                      toast("Customer deleted");
                      nav("/admin/customers");
                    }),
                  );
              }}
            >
              <Trash2 className="size-3.5" /> Delete customer
            </button>
          </Card>
        </div>
      </div>
      <EditModal c={c} open={editing} onClose={() => setEditing(false)} />
      {assigning && <AssignModal c={c} open onClose={() => setAssigning(false)} />}
      <PaymentFormModal open={paying} onClose={() => setPaying(false)} customerId={c._id} />
      <CredentialsDialog credentials={creds} who={`${c.fullName} (${c.code})`} onClose={() => setCreds(null)} />
    </>
  );
}
