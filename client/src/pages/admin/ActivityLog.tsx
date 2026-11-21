import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { ActivityItem } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge, Select } from "@/components/ui/primitives";
import { ErrorState, Pagination, Skeleton, TableWrap } from "@/components/ui/data";
import { formatDate } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const entities = ["Payment", "Customer", "Lead", "Project", "Flat", "ConstructionProgress", "Announcement", "Testimonial", "WebsiteSettings", "User"];

export default function ActivityLog() {
  useDocumentTitle("Activity log");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activity", entity, page],
    queryFn: () => api.page<ActivityItem[]>("/dashboard/activity", { entity, page, limit: 50 }),
    placeholderData: (p) => p,
  });
  return (
    <>
      <PageHeader title="Activity log" description="Every change made by staff, newest first. Entries cannot be edited or deleted." />
      <Select
        className="mb-4 w-56"
        aria-label="Record type"
        value={entity}
        onChange={(e) => {
          setEntity(e.target.value);
          setPage(1);
        }}
      >
        <option value="">All record types</option>
        {entities.map((e) => (
          <option key={e} value={e}>
            {e === "ConstructionProgress" ? "Construction" : e === "WebsiteSettings" ? "Site content" : e}
          </option>
        ))}
      </Select>
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading && <Skeleton className="h-60" />}
      {data && (
        <div className="rounded-md border border-line bg-paper px-5">
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((a) => (
                  <tr key={a._id}>
                    <td className="whitespace-nowrap text-slate">{formatDate(a.createdAt, true)}</td>
                    <td className="whitespace-nowrap">
                      {a.actorName ?? "System"}
                      {a.actorRole && <span className="block text-xs text-slate">{a.actorRole === "superadmin" ? "Super Admin" : a.actorRole === "admin" ? "Admin" : "Customer"}</span>}
                    </td>
                    <td>
                      <Badge tone={a.action.includes("delete") || a.action.includes("reject") ? "danger" : a.action.includes("verif") ? "success" : "neutral"}>{a.action}</Badge>
                    </td>
                    <td className="text-sm">{a.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} />
        </div>
      )}
    </>
  );
}
