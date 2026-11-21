import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, type Tone } from "./primitives";
import type { FlatStatus, LeadStatus, PaymentStatus, ProjectStatus } from "@/types";
import { flatStatusLabel, leadStatusLabel, paymentStatusLabel, projectStatusLabel } from "@/utils/format";

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total?: number; onPage: (p: number) => void }) {
  if (pages <= 1) return total !== undefined ? <p className="px-1 py-3 text-[13px] text-slate">{total} record{total === 1 ? "" : "s"}</p> : null;
  return (
    <nav className="flex items-center justify-between gap-3 px-1 py-3 text-[13px] text-slate" aria-label="Pagination">
      <span>
        Page {page} of {pages}
        {total !== undefined && `, ${total} records`}
      </span>
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" icon={<ChevronLeft className="size-4" />} />
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" icon={<ChevronRight className="size-4" />} />
      </div>
    </nav>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 text-slate/60">{icon ?? <Inbox className="size-8" strokeWidth={1.5} />}</div>
      <p className="font-semibold text-charcoal">{title}</p>
      {body && <p className="max-w-sm text-sm text-slate">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-danger/25 bg-danger/5 px-6 py-10 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshCw className="size-3.5" />}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xs bg-mist-dark", className)} />;
}

export function ProgressBar({ value, className, tone = "ink", animate }: { value: number; className?: string; tone?: "ink" | "brass" | "success"; animate?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  const fill = { ink: "bg-ink", brass: "bg-brass", success: "bg-success" }[tone];
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-mist-dark", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={clsx("h-full rounded-full", fill, animate && "ledger-fill")} style={{ width: `${v}%` }} />
    </div>
  );
}

export function StatTile({ label, value, sub, icon, tone }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "default" | "ink" }) {
  return (
    <div className={clsx("rounded-md border p-4", tone === "ink" ? "border-ink bg-ink text-paper" : "border-line bg-paper")}>
      <div className={clsx("flex items-center justify-between text-[13px] font-semibold", tone === "ink" ? "text-paper/70" : "text-slate")}>
        {label}
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className={clsx("mt-1 text-[13px]", tone === "ink" ? "text-paper/70" : "text-slate")}>{sub}</div>}
    </div>
  );
}

const projectTone: Record<ProjectStatus, Tone> = { upcoming: "info", ongoing: "brass", completed: "success" };
const flatTone: Record<FlatStatus, Tone> = { available: "success", reserved: "warning", booked: "info", sold: "neutral" };
const leadTone: Record<LeadStatus, Tone> = {
  new: "info",
  contacted: "neutral",
  interested: "brass",
  site_visit_scheduled: "brass",
  negotiation: "warning",
  booked: "success",
  converted: "ink",
  lost: "danger",
};
const payTone: Record<PaymentStatus, Tone> = { pending: "warning", verified: "success", rejected: "danger" };

export const ProjectStatusBadge = ({ s }: { s: ProjectStatus }) => <Badge tone={projectTone[s]}>{projectStatusLabel[s]}</Badge>;
export const FlatStatusBadge = ({ s }: { s: FlatStatus }) => <Badge tone={flatTone[s]}>{flatStatusLabel[s]}</Badge>;
export const LeadStatusBadge = ({ s }: { s: LeadStatus }) => <Badge tone={leadTone[s]}>{leadStatusLabel[s]}</Badge>;
export const PaymentStatusBadge = ({ s }: { s: PaymentStatus }) => <Badge tone={payTone[s]}>{paymentStatusLabel[s]}</Badge>;

/** Responsive table wrapper: horizontal scroll on small screens with a sticky first column feel. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("-mx-5 overflow-x-auto sm:mx-0", className)}>{children}</div>;
}
