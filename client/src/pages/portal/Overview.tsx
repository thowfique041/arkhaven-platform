import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays, Check, CircleDot, Download, Pin } from "lucide-react";
import clsx from "clsx";
import { api, downloadFile, errorMessage } from "@/services/api";
import type { Customer } from "@/types";
import { ErrorState, PaymentStatusBadge, ProgressBar, Skeleton } from "@/components/ui/data";
import { useFeedback } from "@/components/ui/overlay";
import { formatBDT, formatDate, imgSrc, paymentMethodLabel, sqft } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function useMyAccount() {
  return useQuery({ queryKey: ["my-account"], queryFn: () => api.get<Customer>("/customers/me") });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Overview() {
  useDocumentTitle("My home");
  const { toast } = useFeedback();
  const { data: c, isLoading, isError, error, refetch } = useMyAccount();
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !c)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );

  const s = c.summary!;
  const p = c.progress;
  const firstName = c.fullName.split(" ")[0];
  const recent = (c.payments ?? []).slice(0, 4);

  return (
    <>
      <h1 className="text-4xl text-ink sm:text-5xl">
        {greeting()}, {firstName}.
      </h1>
      <p className="mt-2 text-slate">
        Customer ID {c.code}
        {c.bookingDate && <>, booked on {formatDate(c.bookingDate)}</>}
      </p>

      {!c.flat ? (
        <div className="mt-8 rounded-md border border-line bg-paper p-8">
          <h2 className="font-sans text-lg font-bold tracking-normal">Your unit is being finalised</h2>
          <p className="mt-2 text-slate">Your advisor will assign your apartment shortly. Payment and construction details will appear here once it is done.</p>
        </div>
      ) : (
        <>
          <section className="mt-8 grid overflow-hidden rounded-md border border-line bg-paper lg:grid-cols-5" aria-labelledby="home-heading">
            <div className="relative min-h-[220px] bg-ink lg:col-span-2">
              {c.project?.coverImage?.url && <img src={imgSrc(c.project.coverImage.url, 900)} alt={`${c.project.name}`} className="absolute inset-0 size-full object-cover opacity-80" />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-paper">
                <p className="text-sm text-brass-light">{c.project?.location?.area}</p>
                <h2 id="home-heading" className="text-3xl">
                  {c.project?.name}
                </h2>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:col-span-3">
              {[
                ["Unit", c.flat.unitNumber],
                ["Floor", c.flat.floor],
                ["Size", sqft(c.flat.sizeSqft)],
                ["Bedrooms", c.flat.bedrooms],
                ["Bathrooms", c.flat.bathrooms],
                ["Facing", c.flat.facing ?? "–"],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-paper p-5">
                  <dt className="text-[13px] text-slate">{k}</dt>
                  <dd className="mt-1 font-display text-2xl text-ink">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-md border border-line bg-paper p-6" aria-labelledby="pay-heading">
              <div className="flex items-baseline justify-between">
                <h2 id="pay-heading" className="font-sans text-lg font-bold tracking-normal">
                  Payments
                </h2>
                <Link to="/portal/payments" className="text-sm font-semibold text-ink hover:underline">
                  Full history
                </Link>
              </div>
              <p className="mt-5 font-display text-5xl text-ink tabular-nums">
                {s.paidPercent.toFixed(1)}
                <span className="text-2xl text-slate">% paid</span>
              </p>
              <ProgressBar value={s.paidPercent} tone="success" className="mt-4 h-2" />
              <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-slate">Total price</dt>
                  <dd className="font-semibold tabular-nums">{formatBDT(s.totalPriceMinor)}</dd>
                </div>
                <div>
                  <dt className="text-slate">Paid</dt>
                  <dd className="font-semibold text-success tabular-nums">{formatBDT(s.paidMinor)}</dd>
                </div>
                <div>
                  <dt className="text-slate">Remaining</dt>
                  <dd className="font-semibold tabular-nums">{formatBDT(s.remainingMinor)}</dd>
                </div>
              </dl>
              {s.pendingMinor > 0 && <p className="mt-3 rounded-xs bg-warning/10 px-3 py-2 text-[13px] text-warning">{formatBDT(s.pendingMinor)} received and waiting for verification by our accounts team.</p>}
              {recent.length > 0 && (
                <ul className="mt-5 divide-y divide-line border-t border-line">
                  {recent.map((pay) => (
                    <li key={pay._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <div>
                        <p className="font-semibold tabular-nums">{formatBDT(pay.amountMinor)}</p>
                        <p className="text-xs text-slate">
                          {formatDate(pay.paidAt)}, {paymentMethodLabel[pay.method]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PaymentStatusBadge s={pay.status} />
                        {pay.receiptNumber && (
                          <button className="rounded-xs p-1.5 text-slate hover:bg-mist hover:text-ink" aria-label={`Download receipt ${pay.receiptNumber}`} onClick={() => downloadFile(`/payments/${pay._id}/receipt`, `${pay.receiptNumber}.pdf`).catch((e) => toast(errorMessage(e), "error"))}>
                            <Download className="size-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-md border border-line bg-paper p-6" aria-labelledby="build-heading">
              <div className="flex items-baseline justify-between">
                <h2 id="build-heading" className="font-sans text-lg font-bold tracking-normal">
                  Construction
                </h2>
                <Link to="/portal/progress" className="text-sm font-semibold text-ink hover:underline">
                  Photos and updates
                </Link>
              </div>
              {p ? (
                <>
                  <p className="mt-5 font-display text-5xl text-ink tabular-nums">
                    {Math.round(p.percent)}
                    <span className="text-2xl text-slate">% complete</span>
                  </p>
                  <ProgressBar value={p.percent} tone="brass" className="mt-4 h-2" />
                  <p className="mt-4 flex items-center gap-2 text-sm">
                    <CalendarDays className="size-4 text-brass" />
                    Expected handover: <b>{formatDate(p.expectedHandover)}</b>
                  </p>
                  <ol className="mt-5 space-y-2 border-t border-line pt-4">
                    {p.stages
                      .filter((st) => Math.abs(st.key - p.currentStage) <= 2)
                      .map((st) => (
                        <li key={st.key} className="flex items-center gap-3 text-sm">
                          {st.status === "completed" ? (
                            <span className="flex size-5 items-center justify-center rounded-full bg-success text-paper">
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                          ) : st.status === "in_progress" ? (
                            <CircleDot className="size-5 text-brass" />
                          ) : (
                            <span className="size-5 rounded-full border-2 border-line" />
                          )}
                          <span className={clsx(st.status === "pending" && "text-slate", st.status === "in_progress" && "font-bold")}>{st.name}</span>
                        </li>
                      ))}
                  </ol>
                  <p className="mt-4 text-xs text-slate">Last updated {formatDate(p.updatedAt)}</p>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate">Construction tracking will start soon.</p>
              )}
            </section>
          </div>
        </>
      )}

      {c.announcements && c.announcements.length > 0 && (
        <section className="mt-6 rounded-md border border-line bg-paper p-6" aria-labelledby="notice-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="notice-heading" className="flex items-center gap-2 font-sans text-lg font-bold tracking-normal">
              <Bell className="size-4 text-brass" /> Latest notices
            </h2>
            <Link to="/portal/announcements" className="text-sm font-semibold text-ink hover:underline">
              All notices
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {c.announcements.slice(0, 3).map((a) => (
              <li key={a._id} className="py-3">
                <p className="flex items-center gap-1.5 font-semibold">
                  {a.pinned && <Pin className="size-3.5 text-brass" />}
                  {a.title}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-charcoal/80">{a.body}</p>
                <p className="mt-1 text-xs text-slate">{formatDate(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
