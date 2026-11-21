import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Project } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ErrorState, Skeleton } from "@/components/ui/data";
import { ImageField, ImageListEditor, MoneyInput, StringListEditor } from "@/components/ui/editors";
import { useFeedback } from "@/components/ui/overlay";
import { projectStatusLabel, projectTypeLabel, toDateInput } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const num = z.preprocess((v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? null : Number(v)), z.number().nullable());
const img = z.object({ url: z.string().url(), publicId: z.string().optional().nullable(), caption: z.string().optional().nullable() });

const schema = z.object({
  name: z.string().trim().min(2, "Project name is required"),
  slug: z.string().trim().regex(/^[a-z0-9-]*$/, "Lowercase letters, numbers and dashes only").optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(8000).optional(),
  type: z.enum(["residential", "commercial", "mixed-use"]),
  status: z.enum(["upcoming", "ongoing", "completed"]),
  featured: z.boolean(),
  published: z.boolean(),
  sortOrder: num,
  location: z.object({
    address: z.string().optional(),
    area: z.string().trim().min(1, "Area is used for filtering, please fill it in"),
    city: z.string().optional(),
    lat: num,
    lng: num,
    mapEmbedUrl: z.string().optional(),
  }),
  coverImage: img.nullable().optional(),
  gallery: z.array(img),
  floorPlans: z.array(z.object({ title: z.string().min(1, "Title required"), sizeSqft: num, bedrooms: num, bathrooms: num, image: img.nullable().optional() })),
  amenities: z.array(z.string()),
  facilities: z.array(z.string()),
  specs: z.object({
    landArea: z.string().optional(),
    totalFloors: num,
    floorsLabel: z.string().optional(),
    unitsPerFloor: num,
    parking: z.string().optional(),
    frontRoad: z.string().optional(),
    structure: z.string().optional(),
    typicalSizeSqft: z.string().optional(),
    bedrooms: num,
    bathrooms: num,
  }),
  construction: z.object({
    contractor: z.string().optional(),
    architect: z.string().optional(),
    engineer: z.string().optional(),
    startedAt: z.string().optional(),
    foundation: z.string().optional(),
    materials: z.string().optional(),
  }),
  priceFromMinor: z.number().int().nullable().optional(),
  expectedCompletion: z.string().optional(),
  faqs: z.array(z.object({ q: z.string().min(1, "Question required"), a: z.string().min(1, "Answer required") })),
});
type V = z.infer<typeof schema>;

const empty: V = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  type: "residential",
  status: "upcoming",
  featured: false,
  published: true,
  sortOrder: 0,
  location: { address: "", area: "", city: "Dhaka", lat: null, lng: null, mapEmbedUrl: "" },
  coverImage: null,
  gallery: [],
  floorPlans: [],
  amenities: [],
  facilities: [],
  specs: { landArea: "", totalFloors: null, floorsLabel: "", unitsPerFloor: null, parking: "", frontRoad: "", structure: "", typicalSizeSqft: "", bedrooms: null, bathrooms: null },
  construction: { contractor: "", architect: "", engineer: "", startedAt: "", foundation: "", materials: "" },
  priceFromMinor: null,
  expectedCompletion: "",
  faqs: [],
};

function toForm(p: Project): V {
  return {
    ...empty,
    ...p,
    tagline: p.tagline ?? "",
    description: p.description ?? "",
    location: { ...empty.location, ...p.location, lat: p.location.lat ?? null, lng: p.location.lng ?? null },
    specs: { ...empty.specs, ...p.specs } as V["specs"],
    construction: { ...empty.construction, ...p.construction, startedAt: toDateInput(p.construction?.startedAt) },
    coverImage: p.coverImage ?? null,
    floorPlans: p.floorPlans.map((f) => ({ ...f, sizeSqft: f.sizeSqft ?? null, bedrooms: f.bedrooms ?? null, bathrooms: f.bathrooms ?? null, image: f.image ?? null })),
    priceFromMinor: p.priceFromMinor ?? null,
    expectedCompletion: toDateInput(p.expectedCompletion),
  };
}

/** Strips empty strings so optional server fields are not overwritten with "". */
function toPayload(v: V) {
  const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, x === "" ? null : x]));
  return {
    ...v,
    slug: v.slug || undefined,
    location: clean(v.location),
    specs: clean(v.specs),
    construction: clean(v.construction),
    expectedCompletion: v.expectedCompletion || null,
    sortOrder: v.sortOrder ?? 0,
  };
}

export default function ProjectEditor() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["admin-project", id], queryFn: () => api.get<Project>(`/projects/admin/${id}`), enabled: !isNew });
  useDocumentTitle(isNew ? "New project" : data?.name);

  const { register, control, handleSubmit, reset, formState } = useForm<V>({ resolver: zodResolver(schema), defaultValues: empty });
  const { errors, isDirty } = formState;
  const plans = useFieldArray({ control, name: "floorPlans" });
  const faqs = useFieldArray({ control, name: "faqs" });
  useEffect(() => {
    if (data) reset(toForm(data));
  }, [data, reset]);

  const save = useMutation({
    mutationFn: (v: V) => (isNew ? api.post<Project>("/projects", toPayload(v)) : api.patch<Project>(`/projects/${id}`, toPayload(v))),
    onSuccess: (p) => {
      toast(isNew ? "Project created" : "Project saved");
      qc.invalidateQueries({ queryKey: ["admin-projects"] });
      qc.invalidateQueries({ queryKey: ["project-options"] });
      qc.invalidateQueries({ queryKey: ["public-projects"] });
      qc.invalidateQueries({ queryKey: ["admin-project", p._id] });
      if (isNew) nav(`/admin/projects/${p._id}`, { replace: true });
      else reset(toForm(p));
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  if (isError) return <ErrorState message={(error as Error).message} />;
  if (!isNew && isLoading) return <Skeleton className="h-96" />;

  const firstError = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <Link to="/admin/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-slate hover:text-ink">
        <ChevronLeft className="size-4" /> Projects
      </Link>
      <PageHeader
        title={isNew ? "New project" : (data?.name ?? "Project")}
        description={isNew ? "Units and construction tracking are added after the project is created." : `Public page: /projects/${data?.slug}`}
        actions={
          <>
            {!isNew && (
              <>
                <Button variant="secondary" onClick={() => nav(`/admin/flats?project=${id}`)}>
                  Manage units
                </Button>
                <Button variant="secondary" onClick={() => nav(`/admin/progress/${id}`)}>
                  Construction progress
                </Button>
              </>
            )}
            <Button type="submit" loading={save.isPending} disabled={!isNew && !isDirty}>
              {isNew ? "Create project" : "Save changes"}
            </Button>
          </>
        }
      />
      {firstError && (
        <p role="alert" className="mb-4 rounded-xs border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
          Some fields need attention. Check the highlighted fields below.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" required error={errors.name?.message} htmlFor="p-name">
                <Input id="p-name" invalid={!!errors.name} {...register("name")} />
              </Field>
              <Field label="URL slug" error={errors.slug?.message} hint="Leave blank to generate from the name" htmlFor="p-slug">
                <Input id="p-slug" invalid={!!errors.slug} {...register("slug")} />
              </Field>
              <Field label="Tagline" className="sm:col-span-2" htmlFor="p-tag" hint="One sentence shown on cards and as the page heading">
                <Input id="p-tag" {...register("tagline")} />
              </Field>
              <Field label="Description" className="sm:col-span-2" htmlFor="p-desc" hint="Separate paragraphs with a blank line">
                <Textarea id="p-desc" rows={7} {...register("description")} />
              </Field>
              <Field label="Type" htmlFor="p-type">
                <Select id="p-type" {...register("type")}>
                  {Object.entries(projectTypeLabel).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" htmlFor="p-status" hint="Also updated automatically from construction stage">
                <Select id="p-status" {...register("status")}>
                  {Object.entries(projectStatusLabel).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card title="Location">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address" className="sm:col-span-2" htmlFor="p-addr">
                <Input id="p-addr" {...register("location.address")} />
              </Field>
              <Field label="Area / neighbourhood" required error={errors.location?.area?.message} htmlFor="p-area">
                <Input id="p-area" placeholder="e.g. Bashundhara R/A" invalid={!!errors.location?.area} {...register("location.area")} />
              </Field>
              <Field label="City" htmlFor="p-city">
                <Input id="p-city" {...register("location.city")} />
              </Field>
              <Field label="Latitude" htmlFor="p-lat">
                <Input id="p-lat" inputMode="decimal" {...register("location.lat")} />
              </Field>
              <Field label="Longitude" htmlFor="p-lng">
                <Input id="p-lng" inputMode="decimal" {...register("location.lng")} />
              </Field>
              <Field label="Google Maps embed URL" className="sm:col-span-2" htmlFor="p-map" hint="Optional. Google Maps > Share > Embed a map > copy the src URL. Without it, the map uses the coordinates or address.">
                <Input id="p-map" placeholder="https://www.google.com/maps/embed?pb=…" {...register("location.mapEmbedUrl")} />
              </Field>
            </div>
          </Card>

          <Card title="Images">
            <Field label="Cover image">
              <Controller control={control} name="coverImage" render={({ field }) => <ImageField value={field.value} onChange={field.onChange} folder="projects" label="cover image" />} />
            </Field>
            <div className="mt-6">
              <Field label="Gallery">
                <Controller control={control} name="gallery" render={({ field }) => <ImageListEditor value={field.value} onChange={field.onChange} folder="projects" />} />
              </Field>
            </div>
          </Card>

          <Card title="Floor plans" actions={<Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => plans.append({ title: "", sizeSqft: null, bedrooms: null, bathrooms: null, image: null })}>Add plan</Button>}>
            {plans.fields.length === 0 && <p className="text-sm text-slate">No floor plans yet.</p>}
            <div className="space-y-5">
              {plans.fields.map((f, i) => (
                <div key={f.id} className="grid gap-3 border-b border-line pb-5 last:border-0 sm:grid-cols-[1fr_1fr]">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Title" className="col-span-2" error={errors.floorPlans?.[i]?.title?.message}>
                      <Input {...register(`floorPlans.${i}.title`)} placeholder="Type A, South" />
                    </Field>
                    <Field label="Size (sft)">
                      <Input inputMode="numeric" {...register(`floorPlans.${i}.sizeSqft`)} />
                    </Field>
                    <Field label="Bedrooms">
                      <Input inputMode="numeric" {...register(`floorPlans.${i}.bedrooms`)} />
                    </Field>
                    <Field label="Bathrooms">
                      <Input inputMode="numeric" {...register(`floorPlans.${i}.bathrooms`)} />
                    </Field>
                    <div className="flex items-end">
                      <Button variant="ghost" size="sm" className="text-danger" icon={<Trash2 className="size-3.5" />} onClick={() => plans.remove(i)}>
                        Remove plan
                      </Button>
                    </div>
                  </div>
                  <Controller control={control} name={`floorPlans.${i}.image`} render={({ field }) => <ImageField value={field.value} onChange={field.onChange} folder="floor-plans" label="plan drawing" />} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Amenities and facilities">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Amenities">
                <Controller control={control} name="amenities" render={({ field }) => <StringListEditor value={field.value} onChange={field.onChange} placeholder="e.g. Rooftop garden" />} />
              </Field>
              <Field label="Facilities">
                <Controller control={control} name="facilities" render={({ field }) => <StringListEditor value={field.value} onChange={field.onChange} placeholder="e.g. Basement parking" />} />
              </Field>
            </div>
          </Card>

          <Card title="Buyer FAQs" actions={<Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => faqs.append({ q: "", a: "" })}>Add question</Button>}>
            {faqs.fields.length === 0 && <p className="text-sm text-slate">No questions yet.</p>}
            <div className="space-y-4">
              {faqs.fields.map((f, i) => (
                <div key={f.id} className="grid gap-2 border-b border-line pb-4 last:border-0">
                  <div className="flex gap-2">
                    <Input placeholder="Question" invalid={!!errors.faqs?.[i]?.q} {...register(`faqs.${i}.q`)} />
                    <Button variant="ghost" aria-label="Remove question" onClick={() => faqs.remove(i)} icon={<Trash2 className="size-4 text-danger" />} />
                  </div>
                  <Textarea rows={2} placeholder="Answer" invalid={!!errors.faqs?.[i]?.a} {...register(`faqs.${i}.a`)} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-4">
              <Controller control={control} name="published" render={({ field }) => <Checkbox label="Show on website" description="Hidden projects stay available to admins and customers." checked={field.value} onChange={field.onChange} />} />
              <Controller control={control} name="featured" render={({ field }) => <Checkbox label="Featured" description="Listed first and eligible for the homepage." checked={field.value} onChange={field.onChange} />} />
              <Field label="Sort order" hint="Lower numbers appear first" htmlFor="p-sort">
                <Input id="p-sort" inputMode="numeric" {...register("sortOrder")} />
              </Field>
            </div>
          </Card>
          <Card title="Pricing and dates">
            <div className="space-y-4">
              <Field label="Price from (public)" hint="Shown as 'from' price. Leave empty for 'On request'.">
                <Controller control={control} name="priceFromMinor" render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />} />
              </Field>
              <Field label="Expected completion" htmlFor="p-comp">
                <Input id="p-comp" type="date" {...register("expectedCompletion")} />
              </Field>
            </div>
          </Card>
          <Card title="Key facts">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Land area" className="col-span-2">
                <Input placeholder="10 katha" {...register("specs.landArea")} />
              </Field>
              <Field label="Floors label">
                <Input placeholder="G + 9" {...register("specs.floorsLabel")} />
              </Field>
              <Field label="Total floors">
                <Input inputMode="numeric" {...register("specs.totalFloors")} />
              </Field>
              <Field label="Units per floor">
                <Input inputMode="numeric" {...register("specs.unitsPerFloor")} />
              </Field>
              <Field label="Front road">
                <Input placeholder="30 ft" {...register("specs.frontRoad")} />
              </Field>
              <Field label="Typical size" className="col-span-2">
                <Input placeholder="1,250 to 1,650 sft" {...register("specs.typicalSizeSqft")} />
              </Field>
              <Field label="Bedrooms">
                <Input inputMode="numeric" {...register("specs.bedrooms")} />
              </Field>
              <Field label="Bathrooms">
                <Input inputMode="numeric" {...register("specs.bathrooms")} />
              </Field>
              <Field label="Parking" className="col-span-2">
                <Input {...register("specs.parking")} />
              </Field>
              <Field label="Structure" className="col-span-2">
                <Input placeholder="RCC frame, BNBC 2020" {...register("specs.structure")} />
              </Field>
            </div>
          </Card>
          <Card title="Construction details">
            <div className="space-y-3">
              <Field label="Architect">
                <Input {...register("construction.architect")} />
              </Field>
              <Field label="Structural engineer">
                <Input {...register("construction.engineer")} />
              </Field>
              <Field label="Contractor">
                <Input {...register("construction.contractor")} />
              </Field>
              <Field label="Work started">
                <Input type="date" {...register("construction.startedAt")} />
              </Field>
              <Field label="Foundation">
                <Input {...register("construction.foundation")} />
              </Field>
              <Field label="Key materials">
                <Textarea rows={2} {...register("construction.materials")} />
              </Field>
            </div>
          </Card>
        </div>
      </div>
      <div className="sticky bottom-0 -mx-4 mt-6 flex justify-end gap-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button variant="secondary" onClick={() => (data ? reset(toForm(data)) : nav("/admin/projects"))}>
          {isNew ? "Cancel" : "Discard changes"}
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!isNew && !isDirty}>
          {isNew ? "Create project" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
