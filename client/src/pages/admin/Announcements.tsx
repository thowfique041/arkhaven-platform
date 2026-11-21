import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Announcement } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge, Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/data";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { formatDate } from "@/utils/format";
import { useProjectOptions } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(160),
  body: z.string().trim().min(2, "Write the message").max(5000),
  project: z.string(),
  published: z.boolean(),
  pinned: z.boolean(),
});
type V = z.infer<typeof schema>;

export default function Announcements() {
  useDocumentTitle("Announcements");
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const { data: projects } = useProjectOptions();
  const [editing, setEditing] = useState<Announcement | null | undefined>(undefined);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["announcements"], queryFn: () => api.get<Announcement[]>("/announcements") });
  const { register, control, handleSubmit, reset, formState } = useForm<V>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (editing !== undefined) reset(editing ? { title: editing.title, body: editing.body, project: editing.project?._id ?? "", published: editing.published, pinned: editing.pinned } : { title: "", body: "", project: "", published: true, pinned: false });
  }, [editing, reset]);

  const save = useMutation({
    mutationFn: (v: V) => {
      const body = { ...v, project: v.project || null };
      return editing ? api.patch(`/announcements/${editing._id}`, body) : api.post("/announcements", body);
    },
    onSuccess: () => {
      toast(editing ? "Announcement updated" : "Announcement published");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setEditing(undefined);
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/announcements/${id}`),
    onSuccess: () => {
      toast("Announcement deleted");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Notices shown in customers' portals: to everyone, or to one project's owners."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
            New announcement
          </Button>
        }
      />
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading && <Skeleton className="h-40" />}
      {data?.length === 0 && <EmptyState title="No announcements yet" body="Post office closures, payment reminders or construction milestones." />}
      <ul className="space-y-3">
        {data?.map((a) => (
          <li key={a._id} className="rounded-md border border-line bg-paper p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-bold">
                  {a.pinned && <Pin className="size-4 text-brass" aria-label="Pinned" />}
                  {a.title}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate">
                  <Badge tone={a.project ? "brass" : "neutral"}>{a.project ? a.project.name : "All customers"}</Badge>
                  {!a.published && <Badge tone="warning">Draft</Badge>}
                  {formatDate(a.createdAt)}
                  {a.createdBy?.name && `, by ${a.createdBy.name}`}
                </p>
              </div>
              <div className="flex gap-1">
                <button className="rounded-xs p-2 text-slate hover:bg-mist hover:text-ink" aria-label="Edit" onClick={() => setEditing(a)}>
                  <Pencil className="size-4" />
                </button>
                <button
                  className="rounded-xs p-2 text-slate hover:bg-danger/10 hover:text-danger"
                  aria-label="Delete"
                  onClick={async () => {
                    if (await confirm({ title: "Delete announcement?", message: a.title, confirmLabel: "Delete", danger: true })) del.mutate(a._id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm whitespace-pre-wrap text-charcoal/85">{a.body}</p>
          </li>
        ))}
      </ul>
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Edit announcement" : "New announcement"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
              {editing ? "Save" : "Publish"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Title" required error={formState.errors.title?.message}>
            <Input {...register("title")} />
          </Field>
          <Field label="Message" required error={formState.errors.body?.message}>
            <Textarea rows={5} {...register("body")} />
          </Field>
          <Field label="Audience">
            <Select {...register("project")}>
              <option value="">All customers</option>
              {projects?.map((p) => (
                <option key={p._id} value={p._id}>
                  Owners in {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Controller control={control} name="published" render={({ field }) => <Checkbox label="Published" description="Unpublished announcements are saved as drafts." checked={field.value} onChange={field.onChange} />} />
          <Controller control={control} name="pinned" render={({ field }) => <Checkbox label="Pin to top" checked={field.value} onChange={field.onChange} />} />
        </form>
      </Modal>
    </>
  );
}
