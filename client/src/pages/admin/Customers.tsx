import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Credentials, Customer } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProjectFlatPicker } from "@/components/admin/ProjectFlatPicker";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Pagination, ProgressBar, Skeleton, TableWrap } from "@/components/ui/data";
import { MoneyInput } from "@/components/ui/editors";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { CredentialsDialog } from "@/components/ui/CredentialsDialog";
import { formatBDTShort, formatDate, toDateInput } from "@/utils/format";
import { useProjectOptions } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter the customer's full name"),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{5,}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  address: z.string().max(300),
  project: z.string(),
  flat: z.string(),
  agreedPriceMinor: z.number().int().min(0).nullable(),
  bookingDate: z.string(),
  notes: z.string().max(4000),
});
type V = z.infer<typeof schema>;

function NewCustomer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: Customer, cred: Credentials) => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const { register, control, handleSubmit, watch, setValue, reset, formState } = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "", email: "", address: "", project: "", flat: "", agreedPriceMinor: null, bookingDate: toDateInput(new Date()), notes: "" },
  });
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);
  const { errors } = formState;
  const m = useMutation({
    mutationFn: (v: V) =>
      api.post<{ customer: Customer; credentials: Credentials }>("/customers", {
        ...v,
        email: v.email || null,
        address: v.address || null,
        project: v.project || null,
        flat: v.flat || null,
        bookingDate: v.bookingDate || null,
        notes: v.notes || null,
      }),
    onSuccess: (r) => {
      toast(`Customer ${r.customer.code} created`);
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["flats"] });
      onCreated(r.customer, r.credentials);
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="New customer account"
      description="For buyers who did not come through the leads pipeline. A login is generated automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={m.isPending} onClick={handleSubmit((v) => m.mutate(v))}>
            Create customer
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <Field label="Full name" required error={errors.fullName?.message}>
          <Input invalid={!!errors.fullName} {...register("fullName")} />
        </Field>
        <Field label="Phone" required error={errors.phone?.message}>
          <Input type="tel" invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field label="Address">
          <Input {...register("address")} />
        </Field>
        <ProjectFlatPicker
          project={watch("project")}
          flat={watch("flat")}
          onProject={(id) => setValue("project", id)}
          onFlat={(id, f) => {
            setValue("flat", id);
            if (f?.priceMinor) setValue("agreedPriceMinor", f.priceMinor);
          }}
        />
        <Field label="Agreed price" hint="Defaults to the unit's list price">
          <Controller control={control} name="agreedPriceMinor" render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />} />
        </Field>
        <Field label="Booking date">
          <Input type="date" {...register("bookingDate")} />
        </Field>
        <Field label="Internal notes" className="sm:col-span-2">
          <Textarea rows={2} {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

export default function Customers() {
  useDocumentTitle("Customers");
  const nav = useNavigate();
  const { data: projects } = useProjectOptions();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [project, setProject] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [creds, setCreds] = useState<{ c: Credentials; who: string } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(1);
  }, [debounced, project]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customers", debounced, project, page],
    queryFn: () => api.page<Customer[]>("/customers", { search: debounced, project, page, limit: 25 }),
    placeholderData: (p) => p,
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Buyers with portal access. Only admins can create accounts."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            New customer
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search customers</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
          <Input className="pl-9" placeholder="Name, phone, email or customer ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Select className="w-52" aria-label="Project" value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">All projects</option>
          {projects?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="rounded-md border border-line bg-paper px-5">
        {isError ? (
          <div className="py-5">
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          </div>
        ) : isLoading || !data ? (
          <div className="space-y-2 py-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <EmptyState title="No customers yet" body="Convert a lead or create a customer account to give a buyer portal access." action={<Link to="/admin/leads" className="font-semibold text-ink underline">Go to leads</Link>} />
        ) : (
          <>
            <TableWrap>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Property</th>
                    <th>Booked</th>
                    <th className="text-right">Agreed price</th>
                    <th className="w-44">Paid</th>
                    <th>Login</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((c) => (
                    <tr key={c._id} className="cursor-pointer" onClick={() => nav(`/admin/customers/${c._id}`)}>
                      <td>
                        <Link to={`/admin/customers/${c._id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                          {c.fullName}
                        </Link>
                        <span className="block text-xs text-slate">
                          {c.code}, {c.phone}
                        </span>
                      </td>
                      <td>{c.flat ? `${c.project?.name}, ${c.flat.unitNumber}` : <span className="text-slate">No unit assigned</span>}</td>
                      <td className="whitespace-nowrap">{formatDate(c.bookingDate)}</td>
                      <td className="text-right whitespace-nowrap tabular-nums">{formatBDTShort(c.agreedPriceMinor)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={c.summary?.paidPercent ?? 0} tone="success" />
                          <span className="w-12 text-right text-xs tabular-nums">{(c.summary?.paidPercent ?? 0).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        {c.user?.isActive === false ? <Badge tone="danger">Deactivated</Badge> : c.user?.mustChangePassword ? <Badge tone="warning">Not signed in yet</Badge> : <Badge tone="success">Active</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
          </>
        )}
      </div>
      <NewCustomer open={creating} onClose={() => setCreating(false)} onCreated={(c, cred) => setCreds({ c: cred, who: `${c.fullName} (${c.code})` })} />
      <CredentialsDialog credentials={creds?.c ?? null} who={creds?.who} onClose={() => setCreds(null)} />
    </>
  );
}
