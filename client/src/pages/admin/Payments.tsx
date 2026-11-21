import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import clsx from "clsx";
import { api } from "@/services/api";
import type { Customer, FinancialSummary, Payment } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { PaymentFormModal } from "@/components/admin/PaymentDialogs";
import { Button, Input, Select } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Pagination, ProgressBar, Skeleton, TableWrap } from "@/components/ui/data";
import { formatBDT, paymentMethodLabel, paymentStatusLabel } from "@/utils/format";
import { useProjectOptions } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link } from "react-router-dom";

function Outstanding({ project }: { project: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["outstanding", project],
    queryFn: () => api.get<{ customer: Customer; summary: FinancialSummary }[]>("/payments/outstanding", { project }),
  });
  if (isLoading) return <Skeleton className="m-5 h-40" />;
  if (!data?.length) return <EmptyState title="No customers with units yet" />;
  const total = data.reduce((s, r) => s + r.summary.remainingMinor, 0);
  return (
    <>
      <p className="py-3 text-sm text-slate">
        Total outstanding across {data.length} customers: <b className="text-charcoal">{formatBDT(total)}</b>
      </p>
      <TableWrap>
        <table className="table-base">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Unit</th>
              <th className="text-right">Agreed price</th>
              <th className="text-right">Paid</th>
              <th className="text-right">Pending</th>
              <th className="text-right">Outstanding</th>
              <th className="w-40">Progress</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ customer: c, summary: s }) => (
              <tr key={c._id}>
                <td>
                  <Link to={`/admin/customers/${c._id}`} className="font-semibold hover:underline">
                    {c.fullName}
                  </Link>
                  <span className="block text-xs text-slate">{c.code}</span>
                </td>
                <td className="whitespace-nowrap">
                  {(c.project as unknown as { name: string })?.name}, {(c.flat as unknown as { unitNumber: string })?.unitNumber}
                </td>
                <td className="text-right whitespace-nowrap tabular-nums">{formatBDT(s.totalPriceMinor)}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{formatBDT(s.paidMinor)}</td>
                <td className="text-right whitespace-nowrap text-warning tabular-nums">{s.pendingMinor ? formatBDT(s.pendingMinor) : "–"}</td>
                <td className="text-right font-semibold whitespace-nowrap tabular-nums">{formatBDT(s.remainingMinor)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={s.paidPercent} tone="success" />
                    <span className="w-12 text-right text-xs tabular-nums">{s.paidPercent.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}

export default function Payments() {
  useDocumentTitle("Payments");
  const [params, setParams] = useSearchParams();
  const { data: projects } = useProjectOptions();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const view = params.get("view") === "outstanding" ? "outstanding" : "ledger";
  const status = params.get("status") ?? "";
  const method = params.get("method") ?? "";
  const project = params.get("project") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(1);
  }, [status, method, project, from, to, debounced]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["payments", status, method, project, from, to, debounced, page],
    queryFn: () => api.page<Payment[]>("/payments", { status, method, project, from, to, search: debounced, page, limit: 25 }),
    placeholderData: (p) => p,
    enabled: view === "ledger",
  });
  const totals = data?.meta.totals as { verifiedMinor: number; pendingMinor: number; rejectedMinor: number } | undefined;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Record, verify and track every installment."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            Record payment
          </Button>
        }
      />
      <div className="mb-4 flex gap-1 border-b border-line" role="tablist">
        {[
          ["ledger", "Payment ledger"],
          ["outstanding", "Outstanding balances"],
        ].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => set("view", k === "ledger" ? "" : k)} className={clsx("-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold", view === k ? "border-ink text-ink" : "border-transparent text-slate hover:text-ink")}>
            {l}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {view === "ledger" && (
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
            <Input className="pl-9" placeholder="Customer, reference or receipt no." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        )}
        <Select className="w-48" aria-label="Project" value={project} onChange={(e) => set("project", e.target.value)}>
          <option value="">All projects</option>
          {projects?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        {view === "ledger" && (
          <>
            <Select className="w-36" aria-label="Status" value={status} onChange={(e) => set("status", e.target.value)}>
              <option value="">Any status</option>
              {Object.entries(paymentStatusLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select className="w-40" aria-label="Method" value={method} onChange={(e) => set("method", e.target.value)}>
              <option value="">Any method</option>
              {Object.entries(paymentMethodLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-2 text-sm text-slate">
              <Input type="date" aria-label="From date" className="w-40" value={from} onChange={(e) => set("from", e.target.value)} />
              to
              <Input type="date" aria-label="To date" className="w-40" value={to} onChange={(e) => set("to", e.target.value)} />
            </div>
          </>
        )}
      </div>

      {view === "ledger" && totals && (
        <dl className="mb-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Verified", totals.verifiedMinor, "text-success"],
            ["Pending verification", totals.pendingMinor, "text-warning"],
            ["Rejected", totals.rejectedMinor, "text-danger"],
          ].map(([l, v, c]) => (
            <div key={l as string} className="rounded-md border border-line bg-paper px-4 py-3">
              <dt className="text-[13px] text-slate">{l as string} (filtered)</dt>
              <dd className={clsx("text-lg font-bold tabular-nums", c as string)}>{formatBDT(v as number)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="rounded-md border border-line bg-paper px-5">
        {view === "outstanding" ? (
          <Outstanding project={project} />
        ) : isError ? (
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
          <EmptyState title="No payments match" body="Change the filters, or record a payment received from a customer." />
        ) : (
          <>
            <PaymentsTable payments={data.data} />
            <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
          </>
        )}
      </div>
      <PaymentFormModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
