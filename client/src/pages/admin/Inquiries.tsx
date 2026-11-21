import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Ban, CheckCheck, Trash2 } from "lucide-react";
import clsx from "clsx";
import { api, errorMessage } from "@/services/api";
import type { Inquiry, Lead } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge, Button, Select } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Pagination, Skeleton } from "@/components/ui/data";
import { useFeedback } from "@/components/ui/overlay";
import { relativeTime } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const kindLabel = { general: "General", project: "Project", landowner: "Landowner" } as const;
const statusTone = { new: "info", reviewed: "neutral", converted: "success", spam: "danger" } as const;

export default function Inquiries() {
  useDocumentTitle("Inquiries");
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const [status, setStatus] = useState("new");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["inquiries", status, kind, page],
    queryFn: () => api.page<Inquiry[]>("/inquiries", { status, kind, page, limit: 20 }),
    placeholderData: (p) => p,
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inquiries"] });
    qc.invalidateQueries({ queryKey: ["inquiries-count"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <>
      <PageHeader title="Website inquiries" description="Messages from the contact, project and landowner forms. Convert the genuine ones into leads." />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-xs border border-line bg-paper p-1" role="tablist">
          {["new", "reviewed", "converted", "spam", ""].map((s) => (
            <button
              key={s || "all"}
              role="tab"
              aria-selected={status === s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={clsx("rounded-xs px-3 py-1.5 text-sm font-semibold capitalize", status === s ? "bg-ink text-paper" : "text-slate hover:text-ink")}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <Select className="w-44" aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(kindLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading && <Skeleton className="h-40" />}
      {data?.data.length === 0 && <EmptyState title={status === "new" ? "No new inquiries" : "Nothing here"} body="New messages from the website appear here as they arrive." />}
      <ul className="space-y-3">
        {data?.data.map((i) => (
          <li key={i._id} className="rounded-md border border-line bg-paper p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-bold">
                  {i.name}
                  <Badge tone={statusTone[i.status]}>{i.status}</Badge>
                  <Badge tone={i.kind === "landowner" ? "brass" : "neutral"}>{kindLabel[i.kind]}</Badge>
                </p>
                <p className="mt-1 text-sm text-slate">
                  <a href={`tel:${i.phone}`} className="hover:underline">
                    {i.phone}
                  </a>
                  {i.email && <>, {i.email}</>}, {relativeTime(i.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {i.status !== "converted" && (
                  <Button
                    size="sm"
                    icon={<ArrowRightLeft className="size-3.5" />}
                    onClick={() =>
                      act.mutate(() =>
                        api.post<Lead>(`/inquiries/${i._id}/convert`).then(() => toast(`${i.name} added to leads`)),
                      )
                    }
                  >
                    Convert to lead
                  </Button>
                )}
                {i.status === "new" && (
                  <Button size="sm" variant="secondary" icon={<CheckCheck className="size-3.5" />} onClick={() => act.mutate(() => api.patch(`/inquiries/${i._id}`, { status: "reviewed" }))}>
                    Mark reviewed
                  </Button>
                )}
                {i.status !== "spam" && i.status !== "converted" && (
                  <Button size="sm" variant="ghost" icon={<Ban className="size-3.5" />} onClick={() => act.mutate(() => api.patch(`/inquiries/${i._id}`, { status: "spam" }))}>
                    Spam
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete inquiry"
                  icon={<Trash2 className="size-3.5" />}
                  onClick={async () => {
                    if (await confirm({ title: "Delete inquiry?", message: `From ${i.name}`, confirmLabel: "Delete", danger: true })) act.mutate(() => api.del(`/inquiries/${i._id}`));
                  }}
                />
              </div>
            </div>
            {i.project && <p className="mt-3 text-sm">Interested in <b>{i.project.name}</b></p>}
            {i.kind === "landowner" && i.landDetails && (
              <p className="mt-3 text-sm">
                Land: <b>{i.landDetails.location}</b>
                {i.landDetails.sizeKatha ? `, ${i.landDetails.sizeKatha} katha` : ""}
                {i.landDetails.roadWidth ? `, road ${i.landDetails.roadWidth}` : ""}
              </p>
            )}
            {i.message && <p className="mt-2 max-w-3xl text-sm whitespace-pre-wrap text-charcoal/85">{i.message}</p>}
            {i.lead && (
              <Link to={`/admin/leads?open=${i.lead}`} className="mt-3 inline-block text-sm font-semibold text-ink hover:underline">
                Open lead
              </Link>
            )}
          </li>
        ))}
      </ul>
      {data && <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />}
    </>
  );
}
