import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import { api } from "@/services/api";
import type { Announcement } from "@/types";
import { Badge } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/data";
import { formatDate } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function PortalAnnouncements() {
  useDocumentTitle("Notices");
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["my-announcements"], queryFn: () => api.get<Announcement[]>("/announcements/me") });
  return (
    <>
      <h1 className="text-4xl text-ink">Notices</h1>
      <p className="mt-2 text-slate">Messages from Arkhaven to you and the other owners in your project.</p>
      <div className="mt-8">
        {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
        {isLoading && <Skeleton className="h-40" />}
        {data?.length === 0 && <EmptyState title="No notices yet" />}
        <ul className="space-y-4">
          {data?.map((a) => (
            <li key={a._id} className="rounded-md border border-line bg-paper p-6">
              <p className="flex flex-wrap items-center gap-2 text-xs text-slate">
                {a.pinned && (
                  <Badge tone="brass">
                    <Pin className="size-3" /> Pinned
                  </Badge>
                )}
                <Badge>{a.project ? a.project.name : "All owners"}</Badge>
                {formatDate(a.createdAt)}
              </p>
              <h2 className="mt-2 font-sans text-lg font-bold tracking-normal">{a.title}</h2>
              <p className="mt-2 max-w-3xl whitespace-pre-wrap text-charcoal/85">{a.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
