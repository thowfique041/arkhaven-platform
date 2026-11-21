import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Project } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { ButtonLink, Input, Select } from "@/components/ui/primitives";
import { EmptyState, ErrorState, ProgressBar, ProjectStatusBadge, Skeleton, TableWrap } from "@/components/ui/data";
import { useFeedback } from "@/components/ui/overlay";
import { formatDate, imgSrc, projectStatusLabel, projectTypeLabel } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function AdminProjects() {
  useDocumentTitle("Projects");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const qc = useQueryClient();
  const nav = useNavigate();
  const { toast, confirm } = useFeedback();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-projects", search, status],
    queryFn: () => api.page<Project[]>("/projects/admin", { search, status, limit: 60 }),
    placeholderData: (p) => p,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/projects/${id}`),
    onSuccess: () => {
      toast("Project deleted");
      qc.invalidateQueries({ queryKey: ["admin-projects"] });
      qc.invalidateQueries({ queryKey: ["project-options"] });
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <>
      <PageHeader
        title="Projects"
        description="Everything shown on the public website comes from here."
        actions={
          <ButtonLink to="/admin/projects/new" icon={<Plus className="size-4" />}>
            New project
          </ButtonLink>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
          <Input className="pl-9" placeholder="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Select className="w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(projectStatusLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <div className="rounded-md border border-line bg-paper">
        {isError ? (
          <div className="p-5">
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <EmptyState title="No projects yet" body="Create your first project to publish it on the website and start adding units." action={<ButtonLink to="/admin/projects/new">New project</ButtonLink>} />
        ) : (
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Units</th>
                  <th className="w-44">Construction</th>
                  <th>Handover</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((p) => (
                  <tr key={p._id} className="cursor-pointer" onClick={() => nav(`/admin/projects/${p._id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-xs bg-mist">{p.coverImage?.url && <img src={imgSrc(p.coverImage.url, 120)} alt="" className="size-full object-cover" />}</div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-semibold">
                            {p.name}
                            {p.featured && <Star className="size-3.5 fill-brass text-brass" aria-label="Featured" />}
                            {!p.published && <EyeOff className="size-3.5 text-slate" aria-label="Hidden from website" />}
                          </p>
                          <p className="text-xs text-slate">
                            {projectTypeLabel[p.type]}, {p.location.area}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <ProjectStatusBadge s={p.status} />
                    </td>
                    <td className="whitespace-nowrap tabular-nums">
                      <span className="font-semibold text-success">{p.units?.available ?? 0}</span>
                      <span className="text-slate"> / {p.units?.total ?? 0} available</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={p.progress?.percent ?? 0} tone="brass" />
                        <span className="w-9 text-right text-xs tabular-nums">{Math.round(p.progress?.percent ?? 0)}%</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(p.progress?.expectedHandover ?? p.expectedCompletion)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <a href={`/projects/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-xs p-2 text-slate hover:bg-mist hover:text-ink" aria-label={`View ${p.name} on website`}>
                          <Eye className="size-4" />
                        </a>
                        <Link to={`/admin/projects/${p._id}`} className="rounded-xs p-2 text-slate hover:bg-mist hover:text-ink" aria-label={`Edit ${p.name}`}>
                          <Pencil className="size-4" />
                        </Link>
                        <button
                          className="rounded-xs p-2 text-slate hover:bg-danger/10 hover:text-danger"
                          aria-label={`Delete ${p.name}`}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: `Delete ${p.name}?`,
                                message: "This removes the project, all its units and its construction record. Projects with customers cannot be deleted.",
                                confirmLabel: "Delete project",
                                danger: true,
                              })
                            )
                              del.mutate(p._id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </>
  );
}
