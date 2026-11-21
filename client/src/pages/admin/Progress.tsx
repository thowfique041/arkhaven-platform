import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Project } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState, ErrorState, ProgressBar, ProjectStatusBadge, Skeleton } from "@/components/ui/data";
import { formatDate, imgSrc, relativeTime } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface Row {
  project: Pick<Project, "_id" | "name" | "slug" | "status" | "coverImage">;
  percent: number;
  currentStage: number;
  currentStageName: string;
  expectedHandover: string | null;
  updatedAt: string | null;
}

export default function Progress() {
  useDocumentTitle("Construction");
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["progress-list"], queryFn: () => api.get<Row[]>("/progress") });
  return (
    <>
      <PageHeader title="Construction progress" description="Stage, percentage and site updates. Customers see these in their portal." />
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading && <Skeleton className="h-60" />}
      {data?.length === 0 && <EmptyState title="No projects yet" />}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((r) => (
          <li key={r.project._id}>
            <Link to={`/admin/progress/${r.project._id}`} className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-paper transition-colors hover:border-ink/30">
              <div className="aspect-[16/7] bg-mist">{r.project.coverImage?.url && <img src={imgSrc(r.project.coverImage.url, 700)} alt="" className="size-full object-cover" />}</div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{r.project.name}</p>
                  <ProjectStatusBadge s={r.project.status} />
                </div>
                <p className="mt-1 text-sm text-slate">{r.currentStageName}</p>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={r.percent} tone="brass" />
                  <span className="text-sm font-bold tabular-nums">{Math.round(r.percent)}%</span>
                </div>
                <p className="mt-3 text-xs text-slate">
                  Handover {formatDate(r.expectedHandover)}
                  {r.updatedAt && `, updated ${relativeTime(r.updatedAt)}`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
