import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, errorMessage, toFailure } from "@/services/api";
import type { Customer, FinancialSummary, Payment, PaymentMethod, PaymentType } from "@/types";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { MoneyInput } from "@/components/ui/editors";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { formatBDT, formatDate, paymentMethodLabel, paymentTypeLabel, toDateInput } from "@/utils/format";

const methods = Object.keys(paymentMethodLabel) as PaymentMethod[];
const types = Object.keys(paymentTypeLabel) as PaymentType[];

const schema = z.object({
  customer: z.string().min(1, "Select a customer"),
  amountMinor: z.number({ invalid_type_error: "Enter an amount" }).int().min(1, "Amount must be more than zero"),
  method: z.enum(methods as [PaymentMethod, ...PaymentMethod[]]),
  type: z.enum(types as [PaymentType, ...PaymentType[]]),
  transactionRef: z.string().max(80),
  paidAt: z
    .string()
    .min(1, "Enter the payment date")
    .refine((d) => new Date(d).getTime() <= Date.now() + 864e5, "Payment date cannot be in the future"),
  note: z.string().max(1000),
  verifyNow: z.boolean(),
});
type V = z.infer<typeof schema>;

export function invalidatePayments(qc: ReturnType<typeof useQueryClient>) {
  for (const k of ["payments", "customer", "customers", "dashboard", "outstanding"]) qc.invalidateQueries({ queryKey: [k] });
}

/** Record a new payment, or edit a pending one. Totals always come back from the server. */
export function PaymentFormModal({ open, onClose, customerId, payment }: { open: boolean; onClose: () => void; customerId?: string; payment?: Payment | null }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const editing = !!payment;
  const { register, control, handleSubmit, reset, watch, formState } = useForm<V>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (!open) return;
    setServerErr(null);
    reset(
      payment
        ? {
            customer: typeof payment.customer === "string" ? payment.customer : payment.customer._id,
            amountMinor: payment.amountMinor,
            method: payment.method,
            type: payment.type,
            transactionRef: payment.transactionRef ?? "",
            paidAt: toDateInput(payment.paidAt),
            note: payment.note ?? "",
            verifyNow: false,
          }
        : { customer: customerId ?? "", amountMinor: undefined as unknown as number, method: "bank_transfer", type: "installment", transactionRef: "", paidAt: toDateInput(new Date()), note: "", verifyNow: false },
    );
  }, [open, payment, customerId, reset]);

  const selected = watch("customer");
  const { data: customers } = useQuery({
    queryKey: ["customer-picker", custSearch],
    queryFn: () => api.get<Customer[]>("/customers", { search: custSearch, limit: 20 }),
    enabled: open && !customerId && !editing,
  });
  const { data: summary } = useQuery({
    queryKey: ["customer", selected, "summary"],
    queryFn: () => api.get<Customer>(`/customers/${selected}`).then((c) => c.summary as FinancialSummary),
    enabled: open && !!selected,
  });
  const maxAllowed = summary ? Math.max(0, summary.totalPriceMinor - summary.paidMinor - summary.pendingMinor + (editing ? payment!.amountMinor : 0)) : undefined;

  const save = useMutation({
    mutationFn: (v: V) => {
      const body = { amountMinor: v.amountMinor, method: v.method, type: v.type, transactionRef: v.transactionRef || null, paidAt: v.paidAt, note: v.note || null };
      return editing ? api.patch(`/payments/${payment!._id}`, body) : api.post("/payments", { ...body, customer: v.customer, status: v.verifyNow ? "verified" : "pending" });
    },
    onSuccess: () => {
      toast(editing ? "Payment updated" : "Payment recorded");
      invalidatePayments(qc);
      onClose();
    },
    onError: (e) => {
      const f = toFailure(e);
      const max = (f.details as { maxAllowedMinor?: number } | undefined)?.maxAllowedMinor;
      setServerErr(max !== undefined ? `${f.message}. The most that can be recorded is ${formatBDT(max)}.` : f.message);
    },
  });
  const { errors } = formState;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit pending payment" : "Record a payment"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
            {editing ? "Save payment" : "Record payment"}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        {!customerId && !editing && (
          <div className="grid gap-2 sm:col-span-2">
            <Field label="Customer" required error={errors.customer?.message}>
              <Input placeholder="Search name, phone or customer ID" value={custSearch} onChange={(e) => setCustSearch(e.target.value)} />
              <Select {...register("customer")} invalid={!!errors.customer} size={Math.min(5, Math.max(2, customers?.length ?? 2))} className="h-auto">
                {customers?.map((c) => (
                  <option key={c._id} value={c._id} disabled={!c.flat}>
                    {c.code}, {c.fullName} {c.flat ? `(${c.project?.name}, ${c.flat.unitNumber})` : "(no unit assigned)"}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        {summary && (
          <dl className="grid grid-cols-3 gap-2 rounded-xs bg-mist p-3 text-[13px] sm:col-span-2">
            <div>
              <dt className="text-slate">Agreed price</dt>
              <dd className="font-semibold tabular-nums">{formatBDT(summary.totalPriceMinor)}</dd>
            </div>
            <div>
              <dt className="text-slate">Verified paid</dt>
              <dd className="font-semibold tabular-nums">{formatBDT(summary.paidMinor)}</dd>
            </div>
            <div>
              <dt className="text-slate">Can still record</dt>
              <dd className="font-semibold tabular-nums">{formatBDT(maxAllowed)}</dd>
            </div>
          </dl>
        )}
        <Field label="Amount" required error={errors.amountMinor?.message}>
          <Controller control={control} name="amountMinor" render={({ field }) => <MoneyInput value={field.value} onChange={(v) => field.onChange(v ?? undefined)} invalid={!!errors.amountMinor} />} />
        </Field>
        <Field label="Payment date" required error={errors.paidAt?.message}>
          <Input type="date" max={toDateInput(new Date())} invalid={!!errors.paidAt} {...register("paidAt")} />
        </Field>
        <Field label="Method">
          <Select {...register("method")}>
            {methods.map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment for">
          <Select {...register("type")}>
            {types.map((t) => (
              <option key={t} value={t}>
                {paymentTypeLabel[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Transaction / reference ID" className="sm:col-span-2" hint="Bank, bKash/Nagad TrxID or cheque number. The same reference cannot be recorded twice.">
          <Input {...register("transactionRef")} />
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <Textarea rows={2} {...register("note")} />
        </Field>
        {!editing && (
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="verifyNow"
              render={({ field }) => <Checkbox label="Verified already" description="Tick only if the money has been confirmed in the bank or MFS statement. Issues a receipt immediately." checked={field.value} onChange={field.onChange} />}
            />
          </div>
        )}
        {serverErr && (
          <p role="alert" className="rounded-xs border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger sm:col-span-2">
            {serverErr}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function RejectModal({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [reason, setReason] = useState("");
  useEffect(() => {
    setReason("");
  }, [payment]);
  const m = useMutation({
    mutationFn: () => api.patch(`/payments/${payment!._id}/status`, { status: "rejected", reason }),
    onSuccess: () => {
      toast("Payment rejected");
      invalidatePayments(qc);
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      size="sm"
      title="Reject payment"
      description={payment ? `${formatBDT(payment.amountMinor)} on ${formatDate(payment.paidAt)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate()}>
            Reject payment
          </Button>
        </>
      }
    >
      <Field label="Reason" hint="The customer sees this reason in their portal.">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Cheque returned by bank" />
      </Field>
    </Modal>
  );
}
