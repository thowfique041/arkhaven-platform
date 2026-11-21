import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { api, errorMessage } from "@/services/api";
import type { WebsiteSettings } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { ErrorState, Skeleton } from "@/components/ui/data";
import { ImageField, StringListEditor } from "@/components/ui/editors";
import { useFeedback } from "@/components/ui/overlay";
import { useProjectOptions } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type Section = "hero" | "about" | "trust" | "team" | "featured" | "contact" | "seo";
const tabs: [Section, string][] = [
  ["hero", "Homepage hero"],
  ["about", "About"],
  ["trust", "Values, reasons, stats"],
  ["team", "Team & milestones"],
  ["featured", "Featured projects"],
  ["contact", "Contact & social"],
  ["seo", "SEO & banner"],
];

/** Generic repeatable list editor for arrays of small objects. */
function Repeater<T extends Record<string, unknown>>({ items, onChange, blank, render, addLabel }: { items: T[]; onChange: (v: T[]) => void; blank: T; render: (item: T, set: (patch: Partial<T>) => void) => ReactNode; addLabel: string }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-xs border border-line p-3">
          <div className="flex-1">{render(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}</div>
          <button type="button" className="self-start rounded-xs p-1.5 text-slate hover:bg-danger/10 hover:text-danger" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => onChange([...items, { ...blank }])}>
        {addLabel}
      </Button>
    </div>
  );
}

export default function Content() {
  useDocumentTitle("Site content");
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [tab, setTab] = useState<Section>("hero");
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["settings"], queryFn: () => api.get<WebsiteSettings>("/settings") });
  const { data: projects } = useProjectOptions();
  const [s, setS] = useState<WebsiteSettings>({});
  useEffect(() => {
    if (data) setS(structuredClone(data));
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Partial<WebsiteSettings>) => api.put<WebsiteSettings>("/settings", body),
    onSuccess: () => {
      toast("Website updated");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading) return <Skeleton className="h-96" />;

  const set = <K extends keyof WebsiteSettings>(k: K, v: WebsiteSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const setIn = <K extends "hero" | "about" | "contact" | "social" | "seo">(k: K, patch: Partial<NonNullable<WebsiteSettings[K]>>) => setS((x) => ({ ...x, [k]: { ...(x[k] ?? {}), ...patch } }));
  const strip = <T extends Record<string, unknown>>(o?: T) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => k !== "_id")) as T;
  const clean = <T extends Record<string, unknown>>(arr?: T[]) => (arr ?? []).map(strip);
  const SaveBtn = ({ body }: { body: Partial<WebsiteSettings> }) => (
    <div className="mt-6 flex justify-end border-t border-line pt-4">
      <Button loading={save.isPending} onClick={() => save.mutate(body)}>
        Save {tabs.find((t) => t[0] === tab)?.[1].toLowerCase()}
      </Button>
    </div>
  );
  const featuredIds = (s.featuredProjectIds ?? []).map((f) => (typeof f === "string" ? f : f._id));

  return (
    <>
      <PageHeader
        title="Site content"
        description="Edit the public website without touching code. Changes go live when saved."
        actions={
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:underline">
            View website <ExternalLink className="size-3.5" />
          </a>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Content sections">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={clsx("rounded-xs px-3 py-2 text-left text-sm font-semibold whitespace-nowrap", tab === k ? "bg-ink text-paper" : "text-slate hover:bg-paper hover:text-ink")}>
              {l}
            </button>
          ))}
        </nav>
        <Card>
          {tab === "hero" && (
            <div className="grid gap-4">
              <Field label="Small line above the headline">
                <Input value={s.hero?.eyebrow ?? ""} onChange={(e) => setIn("hero", { eyebrow: e.target.value })} />
              </Field>
              <Field label="Headline">
                <Input value={s.hero?.title ?? ""} onChange={(e) => setIn("hero", { title: e.target.value })} />
              </Field>
              <Field label="Subtitle">
                <Textarea rows={3} value={s.hero?.subtitle ?? ""} onChange={(e) => setIn("hero", { subtitle: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Primary button label">
                  <Input value={s.hero?.primaryCtaLabel ?? ""} onChange={(e) => setIn("hero", { primaryCtaLabel: e.target.value })} />
                </Field>
                <Field label="Secondary button label">
                  <Input value={s.hero?.secondaryCtaLabel ?? ""} onChange={(e) => setIn("hero", { secondaryCtaLabel: e.target.value })} />
                </Field>
              </div>
              <Field label="Background photo" hint="Wide landscape photo, at least 2000 px across">
                <ImageField value={s.hero?.image} onChange={(v) => setIn("hero", { image: v })} folder="site" label="hero photo" />
              </Field>
              <SaveBtn body={{ hero: strip(s.hero) }} />
            </div>
          )}
          {tab === "about" && (
            <div className="grid gap-4">
              <Field label="Headline">
                <Input value={s.about?.title ?? ""} onChange={(e) => setIn("about", { title: e.target.value })} />
              </Field>
              <Field label="Story" hint="Separate paragraphs with a blank line">
                <Textarea rows={7} value={s.about?.body ?? ""} onChange={(e) => setIn("about", { body: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mission">
                  <Textarea rows={3} value={s.about?.mission ?? ""} onChange={(e) => setIn("about", { mission: e.target.value })} />
                </Field>
                <Field label="Vision">
                  <Textarea rows={3} value={s.about?.vision ?? ""} onChange={(e) => setIn("about", { vision: e.target.value })} />
                </Field>
              </div>
              <Field label="Proof points">
                <StringListEditor value={s.about?.points ?? []} onChange={(v) => setIn("about", { points: v })} placeholder="e.g. Land titles vetted by independent counsel" />
              </Field>
              <Field label="Photo">
                <ImageField value={s.about?.image} onChange={(v) => setIn("about", { image: v })} folder="site" label="about photo" />
              </Field>
              <SaveBtn body={{ about: strip(s.about) }} />
            </div>
          )}
          {tab === "trust" && (
            <div className="space-y-8">
              <div>
                <h3 className="mb-3 font-sans text-sm font-bold tracking-normal">Reasons to choose us (homepage and about)</h3>
                <Repeater
                  items={s.whyUs ?? []}
                  onChange={(v) => set("whyUs", v)}
                  blank={{ title: "", body: "" }}
                  addLabel="Add reason"
                  render={(it, up) => (
                    <div className="grid gap-2">
                      <Input placeholder="Title" value={it.title} onChange={(e) => up({ title: e.target.value })} />
                      <Textarea rows={2} placeholder="Explanation" value={it.body} onChange={(e) => up({ body: e.target.value })} />
                    </div>
                  )}
                />
              </div>
              <div>
                <h3 className="mb-3 font-sans text-sm font-bold tracking-normal">Company values (about page)</h3>
                <Repeater
                  items={s.values ?? []}
                  onChange={(v) => set("values", v)}
                  blank={{ title: "", body: "" }}
                  addLabel="Add value"
                  render={(it, up) => (
                    <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                      <Input placeholder="Value" value={it.title} onChange={(e) => up({ title: e.target.value })} />
                      <Input placeholder="What it means" value={it.body} onChange={(e) => up({ body: e.target.value })} />
                    </div>
                  )}
                />
              </div>
              <div>
                <h3 className="mb-3 font-sans text-sm font-bold tracking-normal">Achievements (numbers)</h3>
                <Repeater
                  items={s.stats ?? []}
                  onChange={(v) => set("stats", v)}
                  blank={{ label: "", value: "" }}
                  addLabel="Add figure"
                  render={(it, up) => (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <Input placeholder="340+" value={it.value} onChange={(e) => up({ value: e.target.value })} />
                      <Input placeholder="Homes handed over" value={it.label} onChange={(e) => up({ label: e.target.value })} />
                    </div>
                  )}
                />
              </div>
              <SaveBtn body={{ whyUs: clean(s.whyUs), values: clean(s.values), stats: clean(s.stats) }} />
            </div>
          )}
          {tab === "team" && (
            <div className="space-y-8">
              <div>
                <h3 className="mb-3 font-sans text-sm font-bold tracking-normal">Leadership team</h3>
                <Repeater
                  items={(s.team ?? []) as Record<string, unknown>[] as NonNullable<WebsiteSettings["team"]>}
                  onChange={(v) => set("team", v)}
                  blank={{ name: "", role: "", bio: "", photo: null }}
                  addLabel="Add person"
                  render={(it, up) => (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input placeholder="Name" value={it.name} onChange={(e) => up({ name: e.target.value })} />
                      <Input placeholder="Role" value={it.role} onChange={(e) => up({ role: e.target.value })} />
                      <Textarea rows={2} className="sm:col-span-2" placeholder="Short bio" value={it.bio ?? ""} onChange={(e) => up({ bio: e.target.value })} />
                      <div className="sm:col-span-2">
                        <ImageField value={it.photo} onChange={(v) => up({ photo: v })} folder="team" label="portrait" />
                      </div>
                    </div>
                  )}
                />
              </div>
              <div>
                <h3 className="mb-3 font-sans text-sm font-bold tracking-normal">Milestones</h3>
                <Repeater
                  items={(s.milestones ?? []) as NonNullable<WebsiteSettings["milestones"]>}
                  onChange={(v) => set("milestones", v)}
                  blank={{ year: "", title: "", body: "" }}
                  addLabel="Add milestone"
                  render={(it, up) => (
                    <div className="grid gap-2 sm:grid-cols-[90px_1fr]">
                      <Input placeholder="2025" value={it.year} onChange={(e) => up({ year: e.target.value })} />
                      <Input placeholder="Title" value={it.title} onChange={(e) => up({ title: e.target.value })} />
                      <Input className="sm:col-span-2" placeholder="Detail" value={it.body ?? ""} onChange={(e) => up({ body: e.target.value })} />
                    </div>
                  )}
                />
              </div>
              <SaveBtn body={{ team: clean(s.team).map((t) => ({ ...t, photo: t.photo ? { url: t.photo.url, publicId: t.photo.publicId ?? null } : null })), milestones: clean(s.milestones) }} />
            </div>
          )}
          {tab === "featured" && (
            <div>
              <p className="mb-4 text-sm text-slate">Choose up to three projects for the homepage, in order. If none are selected, projects marked "featured" are shown.</p>
              <ul className="divide-y divide-line rounded-xs border border-line">
                {projects?.map((p) => {
                  const idx = featuredIds.indexOf(p._id);
                  return (
                    <li key={p._id}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          className="accent-ink"
                          checked={idx >= 0}
                          disabled={idx < 0 && featuredIds.length >= 3}
                          onChange={(e) => set("featuredProjectIds", e.target.checked ? [...featuredIds, p._id] : featuredIds.filter((x) => x !== p._id))}
                        />
                        <span className="flex-1 font-semibold">{p.name}</span>
                        {idx >= 0 && <span className="text-xs text-slate">Position {idx + 1}</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <SaveBtn body={{ featuredProjectIds: featuredIds }} />
            </div>
          )}
          {tab === "contact" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <Input value={s.contact?.phone ?? ""} onChange={(e) => setIn("contact", { phone: e.target.value })} />
              </Field>
              <Field label="WhatsApp number" hint="International format without +, e.g. 8801711000000">
                <Input value={s.contact?.whatsapp ?? ""} onChange={(e) => setIn("contact", { whatsapp: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={s.contact?.email ?? ""} onChange={(e) => setIn("contact", { email: e.target.value })} />
              </Field>
              <Field label="Office hours">
                <Input value={s.contact?.officeHours ?? ""} onChange={(e) => setIn("contact", { officeHours: e.target.value })} />
              </Field>
              <Field label="Office address" className="sm:col-span-2">
                <Textarea rows={2} value={s.contact?.address ?? ""} onChange={(e) => setIn("contact", { address: e.target.value })} />
              </Field>
              <Field label="Google Maps embed URL" className="sm:col-span-2" hint="Optional. Without it, the map is generated from the address.">
                <Input value={s.contact?.mapEmbedUrl ?? ""} onChange={(e) => setIn("contact", { mapEmbedUrl: e.target.value })} />
              </Field>
              {(["facebook", "instagram", "linkedin", "youtube"] as const).map((k) => (
                <Field key={k} label={k[0].toUpperCase() + k.slice(1)} hint="Full URL">
                  <Input type="url" value={s.social?.[k] ?? ""} onChange={(e) => setIn("social", { [k]: e.target.value })} />
                </Field>
              ))}
              <div className="sm:col-span-2">
                <SaveBtn body={{ contact: strip(s.contact), social: strip(s.social) }} />
              </div>
            </div>
          )}
          {tab === "seo" && (
            <div className="grid gap-4">
              <Field label="Company name" hint="Used in the footer and on receipts">
                <Input value={s.companyName ?? ""} onChange={(e) => set("companyName", e.target.value)} />
              </Field>
              <Field label="Top banner message" hint="Leave empty to hide the banner">
                <Input value={s.announcementBar ?? ""} onChange={(e) => set("announcementBar", e.target.value)} />
              </Field>
              <Field label="Homepage title (search results)">
                <Input value={s.seo?.title ?? ""} onChange={(e) => setIn("seo", { title: e.target.value })} />
              </Field>
              <Field label="Homepage description (search results)">
                <Textarea rows={3} value={s.seo?.description ?? ""} onChange={(e) => setIn("seo", { description: e.target.value })} />
              </Field>
              <SaveBtn body={{ companyName: s.companyName, announcementBar: s.announcementBar, seo: strip(s.seo) }} />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
