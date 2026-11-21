import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, History, MoreHorizontal, Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";
import { api, downloadFile, errorMessage } from "@/services/api";
import type { Payment } from "@/types";
import { PaymentStatusBadge, TableWrap } from "@/components/ui/data";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { formatBDT, formatDate, paymentMethodLabel, paymentTypeLabel, relativeTime } from "@/utils/format";
import { invalidatePayments, PaymentFormModal, RejectModal } from "./PaymentDialogs";

export function PaymentsTable({ payments, showCustomer = true }: { payments: Payment[]; showCustomer?: boolean }) {
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const [editing, setEditing] = useState<Payment | null>(null);
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [auditOf, setAuditOf] = useState<Payment | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "verified" | "pending" }) => api.patch(`/payments/${id}/status`, { status }),
    onSuccess: (_d, v) => {
      toast(v.status === "verified" ? "Payment verified and receipt issued" : "Payment moved back to pending");
      invalidatePayments(qc);
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/payments/${id}`),
    onSuccess: () => {
      toast("Payment deleted");
      invalidatePayments(qc);
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const action = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-mist disabled:opacity-40";

  return (
    <>
      <TableWrap>
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              {showCustomer && <th>Customer</th>}
              <th className="text-right">Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Receipt</th>
              <th className="text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const c = typeof p.customer === "object" ? p.customer : null;
              return (
                <tr key={p._id}>
                  <td className="whitespace-nowrap">
                    {formatDate(p.paidAt)}
                    <span className="block text-xs text-slate">{paymentTypeLabel[p.type]}</span>
                  </td>
                  {showCustomer && (
                    <td>
                      {c ? (
                        <Link to={`/admin/customers/${c._id}`} className="font-semibold hover:underline">
                          {c.fullName}
                          <span className="block text-xs font-normal text-slate">
                            {c.code}
                            {typeof p.flat === "object" && p.flat ? `, ${p.flat.unitNumber}` : ""}
                          </span>
                        </Link>
                      ) : (
                        "–"
                      )}
                    </td>
                  )}
                  <td className="text-right font-semibold whitespace-nowrap tabular-nums">{formatBDT(p.amountMinor)}</td>
                  <td className="whitespace-nowrap">{paymentMethodLabel[p.method]}</td>
                  <td className="max-w-[160px] truncate font-mono text-xs">{p.transactionRef ?? "–"}</td>
                  <td>
                    <PaymentStatusBadge s={p.status} />
                    {p.status === "rejected" && p.rejectionReason && <span className="mt-0.5 block max-w-[180px] truncate text-xs text-slate">{p.rejectionReason}</span>}
                  </td>
                  <td>
                    {p.receiptNumber ? (
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-ink hover:underline"
                        onClick={() => downloadFile(`/payments/${p._id}/receipt`, `${p.receiptNumber}.pdf`).catch((e) => toast(errorMessage(e), "error"))}
                      >
                        <Download className="size-3.5" />
                        {p.receiptNumber}
                      </button>
                    ) : (
                      <span className="text-slate">–</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="relative inline-flex items-center gap-1">
                      {p.status === "pending" && (
                        <button
                          className="inline-flex items-center gap-1 rounded-xs border border-success/40 px-2 py-1 text-xs font-semibold text-success hover:bg-success/10"
                          onClick={async () => {
                            if (await confirm({ title: "Verify this payment?", message: `Confirm that ${formatBDT(p.amountMinor)} has been received. A receipt will be issued and the customer's balance updated.`, confirmLabel: "Verify payment" }))
                              decide.mutate({ id: p._id, status: "verified" });
                          }}
                        >
                          <CheckCircle2 className="size-3.5" /> Verify
                        </button>
                      )}
                      <button className="rounded-xs p-1.5 text-slate hover:bg-mist hover:text-ink" aria-label="More actions" aria-expanded={menu === p._id} onClick={() => setMenu(menu === p._id ? null : p._id)}>
                        <MoreHorizontal className="size-4" />
                      </button>
                      {menu === p._id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                          <div className="absolute top-full right-0 z-20 mt-1 w-48 rounded-xs border border-line bg-paper py-1 text-left shadow-lg" onClick={() => setMenu(null)}>
                            <button className={action} disabled={p.status !== "pending"} onClick={() => setEditing(p)}>
                              <Pencil className="size-4" /> Edit
                            </button>
                            <button className={action} disabled={p.status === "rejected"} onClick={() => setRejecting(p)}>
                              <XCircle className="size-4" /> Reject
                            </button>
                            <button
                              className={action}
                              disabled={p.status === "pending"}
                              onClick={async () => {
                                if (await confirm({ title: "Move back to pending?", message: p.status === "verified" ? "The receipt will be withdrawn and the amount removed from the paid total until verified again." : "The payment will be reviewed again.", confirmLabel: "Move to pending" }))
                                  decide.mutate({ id: p._id, status: "pending" });
                              }}
                            >
                              <RotateCcw className="size-4" /> Move to pending
                            </button>
                            <button className={action} onClick={() => setAuditOf(p)}>
                              <History className="size-4" /> Audit trail
                            </button>
                            <button
                              className={`${action} text-danger`}
                              disabled={p.status === "verified"}
                              onClick={async () => {
                                if (await confirm({ title: "Delete payment record?", message: "Use this only for entries made by mistake. The deletion is recorded in the activity log.", confirmLabel: "Delete payment", danger: true }))
                                  del.mutate(p._id);
                              }}
                            >
                              <Trash2 className="size-4" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
      <PaymentFormModal open={!!editing} onClose={() => setEditing(null)} payment={editing} />
      <RejectModal payment={rejecting} onClose={() => setRejecting(null)} />
      <AuditModal payment={auditOf} onClose={() => setAuditOf(null)} />
    </>
  );
}

function AuditModal({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const id = payment?._id;
  const { data: full, isLoading } = useQuery({ queryKey: ["payment", id], queryFn: () => api.get<Payment>(`/payments/${id}`), enabled: !!id });
  return (
    <Modal open={!!payment} onClose={onClose} size="sm" title="Audit trail" description={payment ? `${formatBDT(payment.amountMinor)}, ${formatDate(payment.paidAt)}` : undefined}>
      {isLoading && <p className="text-sm text-slate">Loading…</p>}
      <ol className="space-y-3 text-sm">
        {full &&
          full?.audit?.map((a, i) => (
            <li key={i} className="border-l-2 border-line pl-3">
              <p className="font-semibold capitalize">{a.action}</p>
              {a.note && <p className="text-slate">{a.note}</p>}
              {a.changes && Object.keys(a.changes).length > 0 && (
                <ul className="mt-1 text-xs text-slate">
                  {Object.entries(a.changes).map(([k, v]) => (
                    <li key={k}>
                      {k}: {k === "amountMinor" ? `${formatBDT(Number(v.from))} → ${formatBDT(Number(v.to))}` : `${String(v.from ?? "–")} → ${String(v.to ?? "–")}`}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate">
                {a.byName ?? "System"}, {relativeTime(a.at)}
              </p>
            </li>
          ))}
      </ol>
    </Modal>
  );
}
