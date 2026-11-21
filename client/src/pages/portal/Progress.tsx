import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CircleDot, X } from "lucide-react";
import clsx from "clsx";
import { api } from "@/services/api";
import type { ConstructionProgress } from "@/types";
import { EmptyState, ErrorState, ProgressBar, Skeleton } from "@/components/ui/data";
import { formatDate, imgSrc } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function PortalProgress() {
  useDocumentTitle("Construction progress");
  const [photo, setPhoto] = useState<{ url: string; caption?: string | null } | null>(null);
  const { data: p, isLoading, isError, error, refetch } = useQuery({ queryKey: ["my-progress"], queryFn: () => api.get<ConstructionProgress | null>("/progress/me") });
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading) return <Skeleton className="h-80" />;
  if (!p) return <EmptyState title="No construction record yet" body="Progress will appear here once your unit is assigned and work begins." />;
  const project = typeof p.project === "object" ? p.project : null;

  return (
    <>
      <h1 className="text-4xl text-ink">Construction progress</h1>
      <p className="mt-2 text-slate">
        {project?.name}, last updated {formatDate(p.updatedAt)}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="rounded-md border border-line bg-paper p-6 lg:col-span-2" aria-labelledby="stage-heading">
          <p className="font-display text-6xl text-ink tabular-nums">
            {Math.round(p.percent)}
            <span className="text-2xl text-slate">%</span>
          </p>
          <ProgressBar value={p.percent} tone="brass" className="mt-4 h-2.5" />
          <p className="mt-4 text-sm">
            Expected handover <b>{formatDate(p.expectedHandover)}</b>
          </p>
          <h2 id="stage-heading" className="mt-8 font-sans text-base font-bold tracking-normal">
            Stages
          </h2>
          <ol className="mt-3">
            {p.stages.map((s, i) => (
              <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
                {i < p.stages.length - 1 && <span className={clsx("absolute top-6 left-[9px] h-[calc(100%-20px)] w-0.5", s.status === "completed" ? "bg-success" : "bg-line")} aria-hidden />}
                {s.status === "completed" ? (
                  <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-paper">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : s.status === "in_progress" ? (
                  <CircleDot className="relative size-5 shrink-0 bg-paper text-brass" />
                ) : (
                  <span className="relative size-5 shrink-0 rounded-full border-2 border-line bg-paper" />
                )}
                <div className="-mt-0.5">
                  <p className={clsx("text-sm", s.status === "pending" ? "text-slate" : "text-charcoal", s.status === "in_progress" && "font-bold")}>{s.name}</p>
                  {s.status === "completed" && s.completedAt && <p className="text-xs text-slate">Completed {formatDate(s.completedAt)}</p>}
                  {s.status === "in_progress" && <p className="text-xs font-semibold text-brass-dark">In progress{s.startedAt ? ` since ${formatDate(s.startedAt)}` : ""}</p>}
                  {s.note && s.status !== "pending" && <p className="mt-0.5 text-xs text-slate">{s.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="lg:col-span-3" aria-labelledby="updates-heading">
          <h2 id="updates-heading" className="font-sans text-lg font-bold tracking-normal">
            Site updates
          </h2>
          {p.updates.length === 0 && <p className="mt-3 text-sm text-slate">No updates posted yet.</p>}
          <ol className="mt-4 space-y-4">
            {p.updates.map((u) => (
              <li key={u._id} className="rounded-md border border-line bg-paper p-5">
                <p className="text-xs text-slate">{formatDate(u.createdAt)}</p>
                <h3 className="mt-1 font-sans text-base font-bold tracking-normal">{u.title}</h3>
                {u.description && <p className="mt-2 text-sm whitespace-pre-wrap text-charcoal/85">{u.description}</p>}
                {u.photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {u.photos.map((ph) => (
                      <button key={ph.url} onClick={() => setPhoto(ph)} className="overflow-hidden rounded-xs bg-mist" aria-label={`Open photo${ph.caption ? `: ${ph.caption}` : ""}`}>
                        <img src={imgSrc(ph.url, 500)} alt={ph.caption ?? u.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform hover:scale-105" />
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {photo && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/95 p-4" onClick={() => setPhoto(null)}>
          <button className="absolute top-4 right-4 p-2 text-paper" aria-label="Close" onClick={() => setPhoto(null)}>
            <X className="size-7" />
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={imgSrc(photo.url, 1800)} alt={photo.caption ?? ""} className="max-h-[85vh] w-auto" />
            {photo.caption && <figcaption className="mt-2 text-center text-sm text-paper/70">{photo.caption}</figcaption>}
          </figure>
        </div>
      )}
    </>
  );
}
