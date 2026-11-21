import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api, downloadFile, errorMessage } from "@/services/api";
import type { FinancialSummary, Payment } from "@/types";
import { EmptyState, ErrorState, PaymentStatusBadge, ProgressBar, Skeleton } from "@/components/ui/data";
import { Button } from "@/components/ui/primitives";
import { useFeedback } from "@/components/ui/overlay";
import { formatBDT, formatDate, paymentMethodLabel, paymentTypeLabel } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function PortalPayments() {
  useDocumentTitle("My payments");
  const { toast } = useFeedback();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["my-payments"], queryFn: () => api.get<{ payments: Payment[]; summary: FinancialSummary }>("/payments/me") });
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-80" />;
  const { payments, summary: s } = data;
  const receipt = (p: Payment) => downloadFile(`/payments/${p._id}/receipt`, `${p.receiptNumber}.pdf`).catch((e) => toast(errorMessage(e), "error"));

  return (
    <>
      <h1 className="text-4xl text-ink">Payments</h1>
      <p className="mt-2 text-slate">Every payment recorded against your unit. Receipts are available once our accounts team verifies a payment.</p>

      <section className="mt-8 rounded-md border border-line bg-paper p-6" aria-label="Payment summary">
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <dt className="text-[13px] text-slate">Total property price</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{formatBDT(s.totalPriceMinor)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-slate">Total paid</dt>
            <dd className="mt-1 text-xl font-bold text-success tabular-nums">{formatBDT(s.paidMinor)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-slate">Remaining balance</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{formatBDT(s.remainingMinor)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-slate">Paid so far</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{s.paidPercent.toFixed(2)}%</dd>
          </div>
        </dl>
        <ProgressBar value={s.paidPercent} tone="success" className="mt-6 h-2.5" />
        {s.pendingMinor > 0 && <p className="mt-4 text-sm text-warning">{formatBDT(s.pendingMinor)} is waiting for verification and is not yet included in the paid total.</p>}
      </section>

      <section className="mt-6 rounded-md border border-line bg-paper" aria-label="Payment history">
        {payments.length === 0 ? (
          <EmptyState title="No payments recorded yet" body="Your booking money and installments will appear here once our team records them." />
        ) : (
          <>
            {/* Cards on mobile */}
            <ul className="divide-y divide-line md:hidden">
              {payments.map((p) => (
                <li key={p._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold tabular-nums">{formatBDT(p.amountMinor)}</p>
                      <p className="text-sm text-slate">
                        {formatDate(p.paidAt)}, {paymentTypeLabel[p.type]}
                      </p>
                    </div>
                    <PaymentStatusBadge s={p.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-slate">Method</dt>
                      <dd>{paymentMethodLabel[p.method]}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate">Reference</dt>
                      <dd className="font-mono text-xs break-all">{p.transactionRef ?? "–"}</dd>
                    </div>
                  </dl>
                  {p.status === "rejected" && p.rejectionReason && <p className="mt-2 text-sm text-danger">{p.rejectionReason}</p>}
                  {p.receiptNumber && (
                    <Button size="sm" variant="secondary" className="mt-3 w-full" icon={<Download className="size-4" />} onClick={() => receipt(p)}>
                      Receipt {p.receiptNumber}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {/* Table on larger screens */}
            <div className="hidden overflow-x-auto md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>For</th>
                    <th className="text-right">Amount</th>
                    <th>Method</th>
                    <th>Transaction / reference</th>
                    <th>Status</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td className="whitespace-nowrap">{formatDate(p.paidAt)}</td>
                      <td>{paymentTypeLabel[p.type]}</td>
                      <td className="text-right font-semibold whitespace-nowrap tabular-nums">{formatBDT(p.amountMinor)}</td>
                      <td>{paymentMethodLabel[p.method]}</td>
                      <td className="font-mono text-xs">{p.transactionRef ?? "–"}</td>
                      <td>
                        <PaymentStatusBadge s={p.status} />
                        {p.status === "rejected" && p.rejectionReason && <span className="mt-0.5 block text-xs text-danger">{p.rejectionReason}</span>}
                      </td>
                      <td>
                        {p.receiptNumber ? (
                          <button className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline" onClick={() => receipt(p)}>
                            <Download className="size-4" /> {p.receiptNumber}
                          </button>
                        ) : (
                          <span className="text-sm text-slate">{p.status === "pending" ? "After verification" : "–"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
