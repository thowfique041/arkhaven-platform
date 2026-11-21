import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Testimonial } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge, Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/data";
import { ImageField } from "@/components/ui/editors";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { useProjectOptions } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  role: z.string().max(120),
  quote: z.string().trim().min(5, "Write the testimonial").max(800),
  rating: z.coerce.number().int().min(1).max(5),
  project: z.string(),
  published: z.boolean(),
  sortOrder: z.coerce.number().int(),
  photo: z.object({ url: z.string(), publicId: z.string().nullable().optional() }).nullable(),
});
type V = z.infer<typeof schema>;

export default function Testimonials() {
  useDocumentTitle("Testimonials");
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const { data: projects } = useProjectOptions();
  const [editing, setEditing] = useState<Testimonial | null | undefined>(undefined);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["admin-testimonials"], queryFn: () => api.get<Testimonial[]>("/testimonials/admin") });
  const { register, control, handleSubmit, reset, formState } = useForm<V>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (editing !== undefined)
      reset(
        editing
          ? { name: editing.name, role: editing.role ?? "", quote: editing.quote, rating: editing.rating, project: editing.project?._id ?? "", published: editing.published, sortOrder: editing.sortOrder, photo: editing.photo ?? null }
          : { name: "", role: "", quote: "", rating: 5, project: "", published: true, sortOrder: 0, photo: null },
      );
  }, [editing, reset]);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
    qc.invalidateQueries({ queryKey: ["testimonials"] });
  };
  const save = useMutation({
    mutationFn: (v: V) => {
      const body = { ...v, project: v.project || null, role: v.role || null };
      return editing ? api.patch(`/testimonials/${editing._id}`, body) : api.post("/testimonials", body);
    },
    onSuccess: () => {
      toast("Testimonial saved");
      invalidate();
      setEditing(undefined);
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/testimonials/${id}`),
    onSuccess: () => {
      toast("Testimonial deleted");
      invalidate();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Only publish words a real owner agreed to share."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>
            Add testimonial
          </Button>
        }
      />
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading && <Skeleton className="h-40" />}
      {data?.length === 0 && <EmptyState title="No testimonials yet" />}
      <ul className="grid gap-4 md:grid-cols-2">
        {data?.map((t) => (
          <li key={t._id} className="flex flex-col rounded-md border border-line bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{t.name}</p>
                <p className="text-sm text-slate">{t.role}</p>
              </div>
              <div className="flex items-center gap-1">
                {!t.published && <Badge tone="warning">Hidden</Badge>}
                <button className="rounded-xs p-2 text-slate hover:bg-mist hover:text-ink" aria-label="Edit" onClick={() => setEditing(t)}>
                  <Pencil className="size-4" />
                </button>
                <button
                  className="rounded-xs p-2 text-slate hover:bg-danger/10 hover:text-danger"
                  aria-label="Delete"
                  onClick={async () => {
                    if (await confirm({ title: "Delete testimonial?", message: `From ${t.name}`, confirmLabel: "Delete", danger: true })) del.mutate(t._id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm text-charcoal/85">“{t.quote}”</p>
            <p className="mt-3 flex items-center gap-0.5" aria-label={`${t.rating} out of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={i < t.rating ? "size-3.5 fill-brass text-brass" : "size-3.5 text-line"} />
              ))}
              {t.project && <span className="ml-2 text-xs text-slate">{t.project.name}</span>}
            </p>
          </li>
        ))}
      </ul>
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Edit testimonial" : "Add testimonial"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
              Save
            </Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <Field label="Name" required error={formState.errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label="Role / relationship">
            <Input placeholder="Owner, Arkhaven Meridian" {...register("role")} />
          </Field>
          <Field label="Testimonial" required className="sm:col-span-2" error={formState.errors.quote?.message}>
            <Textarea rows={4} {...register("quote")} />
          </Field>
          <Field label="Rating">
            <Select {...register("rating")}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} star{r > 1 ? "s" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project">
            <Select {...register("project")}>
              <option value="">None</option>
              {projects?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort order">
            <Input inputMode="numeric" {...register("sortOrder")} />
          </Field>
          <div className="flex items-end pb-2">
            <Controller control={control} name="published" render={({ field }) => <Checkbox label="Show on website" checked={field.value} onChange={field.onChange} />} />
          </div>
          <Field label="Photo (optional)" className="sm:col-span-2">
            <Controller control={control} name="photo" render={({ field }) => <ImageField value={field.value} onChange={field.onChange} folder="testimonials" label="photo" />} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
