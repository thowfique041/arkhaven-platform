import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, CalendarClock, Inbox } from "lucide-react";
import { api } from "@/services/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/primitives";
import { ErrorState, Skeleton, StatTile } from "@/components/ui/data";
import { formatBDT, formatBDTShort, formatDate, leadSourceLabel, leadStatusLabel, paymentMethodLabel } from "@/utils/format";
import type { LeadSource, LeadStatus, PaymentMethod } from "@/types";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface Stats {
  projects: { total: number; ongoing: number; completed: number; upcoming: number };
  customers: number;
  leads: { total: number; new: number; converted: number; byStatus: Record<LeadStatus, number>; bySource: Record<LeadSource, number> };
  flats: { total: number; available: number; reserved: number; booked: number; sold: number; bookedOrSold: number };
  revenue: { expectedMinor: number; receivedMinor: number; pendingMinor: number; outstandingMinor: number; inventoryValueMinor: number };
  newInquiries: number;
  charts: {
    collections: { label: string; amountMinor: number }[];
    leads: { label: string; count: number }[];
    inventoryByProject: { name: string; available: number; reserved: number; booked: number; sold: number }[];
  };
  dueFollowUps: { _id: string; fullName: string; phone: string; followUpDate: string; status: LeadStatus }[];
  pendingPayments: { _id: string; amountMinor: number; paidAt: string; method: PaymentMethod; customer: { code: string; fullName: string } }[];
}

// Validated categorical order (dataviz validator: CVD + normal-vision pass). Identity also carried by legend + table.
const INV = [
  { key: "available", label: "Available", color: "#1baf7a" },
  { key: "reserved", label: "Reserved", color: "#eda100" },
  { key: "booked", label: "Booked", color: "#2a78d6" },
  { key: "sold", label: "Sold", color: "#e87ba4" },
] as const;

const axis = { fontSize: 12, fill: "#5B6B66" };
const tooltipStyle = { borderRadius: 4, border: "1px solid #DCE2DE", fontSize: 13, boxShadow: "0 8px 24px -12px rgba(0,0,0,.25)" };

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { data: d, isLoading, isError, error, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<Stats>("/dashboard/stats") });

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !d)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );

  const collectedPct = d.revenue.expectedMinor ? Math.round((d.revenue.receivedMinor / d.revenue.expectedMinor) * 100) : 0;

  return (
    <>
      <PageHeader title="Dashboard" description={`Updated ${formatDate(new Date(), true)}`} />

      {(d.newInquiries > 0 || d.pendingPayments.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {d.newInquiries > 0 && (
            <Link to="/admin/inquiries" className="flex items-center gap-2 rounded-xs border border-info/30 bg-info/5 px-3 py-2 text-sm text-info hover:bg-info/10">
              <Inbox className="size-4" /> {d.newInquiries} new website inquir{d.newInquiries === 1 ? "y" : "ies"} to review
            </Link>
          )}
          {d.pendingPayments.length > 0 && (
            <Link to="/admin/payments?status=pending" className="flex items-center gap-2 rounded-xs border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning hover:bg-warning/10">
              <AlertCircle className="size-4" /> {d.pendingPayments.length} payment{d.pendingPayments.length === 1 ? "" : "s"} waiting for verification
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile tone="ink" label="Payments received" value={formatBDTShort(d.revenue.receivedMinor)} sub={`${collectedPct}% of ${formatBDTShort(d.revenue.expectedMinor)} expected`} />
        <StatTile label="Outstanding" value={formatBDTShort(d.revenue.outstandingMinor)} sub={`${formatBDTShort(d.revenue.pendingMinor)} pending verification`} />
        <StatTile label="Unsold inventory" value={formatBDTShort(d.revenue.inventoryValueMinor)} sub={`${d.flats.available} of ${d.flats.total} units available`} />
        <StatTile label="Customers" value={d.customers} sub={`${d.flats.bookedOrSold} booked or sold, ${d.flats.reserved} reserved`} />
        <StatTile label="Projects" value={d.projects.total} sub={`${d.projects.ongoing} ongoing, ${d.projects.completed} completed, ${d.projects.upcoming} upcoming`} />
        <StatTile label="Total leads" value={d.leads.total} sub={`${d.leads.new} new, ${d.leads.converted} converted`} />
        <StatTile label="Lead conversion" value={`${d.leads.total ? Math.round((d.leads.converted / d.leads.total) * 100) : 0}%`} sub="Converted to customers" />
        <StatTile label="Total units" value={d.flats.total} sub={`${d.flats.booked} booked, ${d.flats.sold} sold`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Verified collections, last 12 months" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={d.charts.collections.map((c) => ({ ...c, taka: c.amountMinor / 100 }))} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#E8ECE9" />
                <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "#DCE2DE" }} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatBDTShort(v * 100).replace("৳ ", "")} />
                <Tooltip cursor={{ fill: "rgba(18,49,43,0.06)" }} contentStyle={tooltipStyle} formatter={(v) => [formatBDT(Number(v) * 100), "Collected"]} />
                <Bar dataKey="taka" fill="#12312B" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="New leads, last 6 months">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={d.charts.leads} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#E8ECE9" />
                <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: "#DCE2DE" }} />
                <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(18,49,43,0.06)" }} contentStyle={tooltipStyle} formatter={(v) => [String(v), "New leads"]} />
                <Bar dataKey="count" fill="#B08D57" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Inventory by project" className="xl:col-span-2">
          <ul className="mb-3 flex flex-wrap gap-4 text-[13px] text-slate" aria-label="Legend">
            {INV.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[2px]" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
          <div style={{ height: Math.max(160, d.charts.inventoryByProject.length * 44 + 40) }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={d.charts.inventoryByProject} margin={{ left: 8, right: 8 }} barCategoryGap={10}>
                <CartesianGrid horizontal={false} stroke="#E8ECE9" />
                <XAxis type="number" allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={140} />
                <Tooltip cursor={{ fill: "rgba(18,49,43,0.06)" }} contentStyle={tooltipStyle} />
                {INV.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} stackId="inv" fill={s.color} stroke="#fff" strokeWidth={2} radius={i === INV.length - 1 ? [0, 4, 4, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-slate hover:text-ink">Show as table</summary>
            <table className="table-base mt-2">
              <thead>
                <tr>
                  <th>Project</th>
                  {INV.map((s) => (
                    <th key={s.key} className="text-right">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.charts.inventoryByProject.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    {INV.map((s) => (
                      <td key={s.key} className="text-right tabular-nums">
                        {r[s.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>
        <Card title="Lead pipeline">
          <ul className="space-y-2.5">
            {(Object.keys(leadStatusLabel) as LeadStatus[]).map((s) => {
              const n = d.leads.byStatus[s] ?? 0;
              const max = Math.max(1, ...Object.values(d.leads.byStatus));
              return (
                <li key={s}>
                  <Link to={`/admin/leads?status=${s}`} className="group block">
                    <div className="flex justify-between text-sm">
                      <span className="group-hover:text-ink">{leadStatusLabel[s]}</span>
                      <span className="font-semibold tabular-nums">{n}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-mist-dark">
                      <div className="h-full bg-ink" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 text-[13px] text-slate">
            Top source:{" "}
            {(() => {
              const top = Object.entries(d.leads.bySource).sort((a, b) => b[1] - a[1])[0];
              return top && top[1] > 0 ? `${leadSourceLabel[top[0] as LeadSource]} (${top[1]})` : "none yet";
            })()}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Follow-ups due" actions={<Link to="/admin/leads?followUp=due" className="text-sm font-semibold text-ink hover:underline">View all</Link>}>
          {d.dueFollowUps.length === 0 ? (
            <p className="text-sm text-slate">No follow-ups due today.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {d.dueFollowUps.map((l) => (
                <li key={l._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link to={`/admin/leads?open=${l._id}`} className="font-semibold hover:underline">
                      {l.fullName}
                    </Link>
                    <p className="text-slate">{l.phone}</p>
                  </div>
                  <span className={new Date(l.followUpDate) < new Date(new Date().setHours(0, 0, 0, 0)) ? "flex items-center gap-1 text-danger" : "flex items-center gap-1 text-slate"}>
                    <CalendarClock className="size-3.5" />
                    {formatDate(l.followUpDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Payments to verify" actions={<Link to="/admin/payments?status=pending" className="text-sm font-semibold text-ink hover:underline">View all</Link>}>
          {d.pendingPayments.length === 0 ? (
            <p className="text-sm text-slate">Nothing waiting. All recorded payments are verified or rejected.</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {d.pendingPayments.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold">{p.customer?.fullName}</p>
                    <p className="text-slate">
                      {p.customer?.code}, {paymentMethodLabel[p.method]}, {formatDate(p.paidAt)}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatBDT(p.amountMinor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
