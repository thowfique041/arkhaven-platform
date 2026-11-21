import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, CircleDot, MapPin, MessageCircle, X } from "lucide-react";
import clsx from "clsx";
import { api } from "@/services/api";
import type { FlatStatus, Project } from "@/types";
import { useSettings } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { InquiryForm } from "@/components/site/InquiryForm";
import { buttonClass } from "@/components/ui/primitives";
import { ErrorState, FlatStatusBadge, ProgressBar, Skeleton } from "@/components/ui/data";
import { flatStatusLabel, formatBDT, formatBDTShort, formatDate, imgSrc, projectStatusLabel, projectTypeLabel, sqft, whatsappLink } from "@/utils/format";
import NotFound from "./NotFound";

function Gallery({ images, name }: { images: Project["gallery"]; name: string }) {
  const [idx, setIdx] = useState<number | null>(null);
  if (!images.length) return null;
  const go = (d: number) => setIdx((i) => (i === null ? null : (i + d + images.length) % images.length));
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {images.map((img, i) => (
          <button key={img._id ?? img.url} onClick={() => setIdx(i)} className={clsx("group relative overflow-hidden bg-mist", i === 0 && "col-span-2 row-span-2")} aria-label={`Open photo: ${img.caption ?? name}`}>
            <img src={imgSrc(img.url, i === 0 ? 1200 : 600)} alt={img.caption ?? name} loading="lazy" className="aspect-[4/3] size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          </button>
        ))}
      </div>
      <AnimatePresence>
        {idx !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/95 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIdx(null);
              if (e.key === "ArrowRight") go(1);
              if (e.key === "ArrowLeft") go(-1);
            }}
            tabIndex={-1}
            ref={(el) => el?.focus()}
          >
            <button className="absolute top-4 right-4 p-2 text-paper/80 hover:text-paper" onClick={() => setIdx(null)} aria-label="Close">
              <X className="size-7" />
            </button>
            <button className="absolute left-2 p-3 text-paper/80 hover:text-paper sm:left-6" onClick={() => go(-1)} aria-label="Previous photo">
              <ChevronLeft className="size-8" />
            </button>
            <figure className="max-h-full max-w-5xl">
              <img src={imgSrc(images[idx].url, 2000)} alt={images[idx].caption ?? name} className="max-h-[82vh] w-auto object-contain" />
              <figcaption className="mt-3 text-center text-sm text-paper/70">
                {images[idx].caption} ({idx + 1} of {images.length})
              </figcaption>
            </figure>
            <button className="absolute right-2 p-3 text-paper/80 hover:text-paper sm:right-6" onClick={() => go(1)} aria-label="Next photo">
              <ChevronRight className="size-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line py-12 first:border-t-0 first:pt-0">
      <h2 className="text-3xl text-ink">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const { data: s } = useSettings();
  const { data: p, isLoading, isError, error, refetch } = useQuery({ queryKey: ["project", slug], queryFn: () => api.get<Project>(`/projects/slug/${slug}`) });
  const [unitFilter, setUnitFilter] = useState<FlatStatus | "all">("available");
  useDocumentTitle(p ? `${p.name}, ${p.location.area ?? ""}` : undefined, p?.tagline);

  const flats = useMemo(() => (p?.flats ?? []).filter((f) => unitFilter === "all" || f.status === unitFilter), [p, unitFilter]);

  if (isLoading)
    return (
      <div>
        <Skeleton className="h-[520px] w-full rounded-none" />
        <div className="container-x py-12">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-4 h-4 w-2/3" />
        </div>
      </div>
    );
  if (isError) {
    if ((error as { status?: number }).status === 404) return <NotFound />;
    return (
      <div className="container-x py-32">
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      </div>
    );
  }
  if (!p) return null;

  const wa = whatsappLink(s?.contact?.whatsapp, `Hello Arkhaven, I'm interested in ${p.name} (${p.location.area}). Please share availability and price.`);
  const mapSrc = p.location.mapEmbedUrl || (p.location.lat && p.location.lng ? `https://maps.google.com/maps?q=${p.location.lat},${p.location.lng}&z=15&output=embed` : p.location.address ? `https://maps.google.com/maps?q=${encodeURIComponent(p.location.address)}&z=15&output=embed` : null);
  const facts = [
    ["Land area", p.specs.landArea],
    ["Floors", p.specs.floorsLabel ?? p.specs.totalFloors],
    ["Units per floor", p.specs.unitsPerFloor],
    ["Total units", p.units?.total],
    ["Typical size", p.specs.typicalSizeSqft],
    ["Front road", p.specs.frontRoad],
    ["Parking", p.specs.parking],
    ["Structure", p.specs.structure],
    ["Handover", p.progress?.expectedHandover ? formatDate(p.progress.expectedHandover) : p.expectedCompletion ? formatDate(p.expectedCompletion) : undefined],
  ].filter(([, v]) => v !== undefined && v !== null && v !== "");
  const construction = [
    ["Architect", p.construction.architect],
    ["Structural engineer", p.construction.engineer],
    ["Contractor", p.construction.contractor],
    ["Work started", p.construction.startedAt ? formatDate(p.construction.startedAt) : undefined],
    ["Foundation", p.construction.foundation],
    ["Key materials", p.construction.materials],
  ].filter(([, v]) => v);

  const nav = [
    ["overview", "Overview"],
    p.gallery.length ? ["gallery", "Gallery"] : null,
    p.floorPlans.length ? ["plans", "Floor plans"] : null,
    p.flats?.length ? ["units", "Availability"] : null,
    p.progress ? ["progress", "Progress"] : null,
    ["amenities", "Amenities"],
    ["location", "Location"],
  ].filter(Boolean) as [string, string][];

  return (
    <>
      <section className="relative isolate flex min-h-[520px] items-end overflow-hidden bg-ink-900 text-paper lg:min-h-[620px]">
        {p.coverImage?.url && <img src={imgSrc(p.coverImage.url, 2200)} alt={`${p.name} exterior`} className="absolute inset-0 -z-10 size-full object-cover text-transparent opacity-70" fetchPriority="high" />}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(11,32,28,0.95)_0%,rgba(11,32,28,0.35)_55%,rgba(11,32,28,0.3)_100%)]" />
        <div className="container-x pt-32 pb-12">
          <Link to="/projects" className="mb-6 inline-flex items-center gap-1 text-sm text-paper/70 hover:text-paper">
            <ChevronLeft className="size-4" /> All projects
          </Link>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-brass-light">
            <span>{projectStatusLabel[p.status]}</span>
            <span>{projectTypeLabel[p.type]}</span>
          </p>
          <h1 className="mt-3 text-5xl leading-[1.02] sm:text-7xl">{p.name}</h1>
          <p className="mt-4 flex items-start gap-2 text-paper/80">
            <MapPin className="mt-1 size-4 shrink-0" />
            {p.location.address}
          </p>
        </div>
      </section>

      <nav className="sticky top-[72px] z-30 border-b border-line bg-paper/95 backdrop-blur" aria-label="Project sections">
        <ul className="container-x flex gap-6 overflow-x-auto text-sm font-semibold whitespace-nowrap text-slate">
          {nav.map(([id, l]) => (
            <li key={id}>
              <a href={`#${id}`} className="block py-3.5 hover:text-ink">
                {l}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container-x grid gap-12 py-14 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <Section id="overview" title={p.tagline ?? "Overview"}>
            <div className="prose-body max-w-[68ch] text-[17px] leading-relaxed text-charcoal/85">
              {p.description?.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
            </div>
            {facts.length > 0 && (
              <dl className="mt-10 grid grid-cols-2 border-t border-l border-line sm:grid-cols-3">
                {facts.map(([k, v]) => (
                  <div key={String(k)} className="border-r border-b border-line p-4">
                    <dt className="text-[13px] text-slate">{k}</dt>
                    <dd className="mt-1 font-semibold text-charcoal">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>

          {p.gallery.length > 0 && (
            <Section id="gallery" title="Gallery">
              <Gallery images={p.gallery} name={p.name} />
            </Section>
          )}

          {p.floorPlans.length > 0 && (
            <Section id="plans" title="Floor plans">
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {p.floorPlans.map((fp) => (
                  <li key={fp._id ?? fp.title} className="border border-line">
                    {fp.image?.url ? (
                      <img src={imgSrc(fp.image.url, 800)} alt={`${fp.title} plan`} loading="lazy" className="aspect-square w-full bg-mist object-contain" />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-mist text-sm text-slate">Plan drawing on request</div>
                    )}
                    <div className="p-4">
                      <p className="font-bold text-charcoal">{fp.title}</p>
                      <p className="mt-1 text-sm text-slate">{[sqft(fp.sizeSqft), fp.bedrooms ? `${fp.bedrooms} bed` : null, fp.bathrooms ? `${fp.bathrooms} bath` : null].filter(Boolean).join(", ")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {p.flats && p.flats.length > 0 && (
            <Section id="units" title="Unit availability">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter units">
                {(["available", "all", "reserved", "booked", "sold"] as const).map((k) => {
                  const count = k === "all" ? p.units?.total : p.units?.[k];
                  return (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={unitFilter === k}
                      onClick={() => setUnitFilter(k)}
                      className={clsx("rounded-xs border px-3 py-1.5 text-sm font-semibold", unitFilter === k ? "border-ink bg-ink text-paper" : "border-line text-slate hover:border-ink/40")}
                    >
                      {k === "all" ? "All" : flatStatusLabel[k]} ({count ?? 0})
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 max-h-[480px] overflow-auto border border-line">
                <table className="table-base">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Unit</th>
                      <th>Floor</th>
                      <th>Size</th>
                      {p.type !== "commercial" && <th>Beds</th>}
                      <th>Facing</th>
                      <th>Status</th>
                      <th className="text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flats.map((f) => (
                      <tr key={f._id}>
                        <td className="font-bold">{f.unitNumber}</td>
                        <td className="tabular-nums">{f.floor}</td>
                        <td className="whitespace-nowrap tabular-nums">{sqft(f.sizeSqft)}</td>
                        {p.type !== "commercial" && <td>{f.bedrooms}</td>}
                        <td>{f.facing ?? "–"}</td>
                        <td>
                          <FlatStatusBadge s={f.status} />
                        </td>
                        <td className="text-right whitespace-nowrap tabular-nums">{f.priceMinor ? formatBDT(f.priceMinor) : "–"}</td>
                      </tr>
                    ))}
                    {flats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate">
                          No units in this category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[13px] text-slate">Prices exclude registration, car parking and utility connection charges. Ask your advisor for the full cost sheet.</p>
            </Section>
          )}

          {p.progress && (
            <Section id="progress" title="Construction progress">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-6xl text-ink tabular-nums">{Math.round(p.progress.percent)}%</p>
                  <p className="mt-1 text-slate">
                    Last updated {formatDate(p.progress.updatedAt)}
                    {p.progress.expectedHandover && <>, handover target {formatDate(p.progress.expectedHandover)}</>}
                  </p>
                </div>
              </div>
              <ProgressBar value={p.progress.percent} tone="brass" className="mt-5 h-2" />
              <ol className="mt-8 gap-x-6 sm:columns-2">
                {p.progress.stages?.map((st) => (
                  <li key={st.key} className="flex break-inside-avoid items-center gap-3 border-b border-line py-2.5 text-[15px]">
                    {st.status === "completed" ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-success text-paper">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    ) : st.status === "in_progress" ? (
                      <CircleDot className="size-5 text-brass" />
                    ) : (
                      <span className="size-5 rounded-full border-2 border-line" />
                    )}
                    <span className={clsx(st.status === "pending" ? "text-slate" : "text-charcoal", st.status === "in_progress" && "font-bold")}>{st.name}</span>
                    {st.status === "in_progress" && <span className="ml-auto text-xs font-semibold text-brass-dark">In progress</span>}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          <Section id="amenities" title="Amenities and facilities">
            <div className="grid gap-10 sm:grid-cols-2">
              {[
                ["Amenities", p.amenities],
                ["Facilities", p.facilities],
              ].map(([t, list]) =>
                (list as string[]).length ? (
                  <div key={t as string}>
                    <h3 className="font-sans text-base font-bold tracking-normal text-charcoal">{t as string}</h3>
                    <ul className="mt-3 space-y-2">
                      {(list as string[]).map((a) => (
                        <li key={a} className="flex items-start gap-2.5 text-[15px] text-charcoal/85">
                          <Check className="mt-1 size-4 shrink-0 text-brass" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
            {construction.length > 0 && (
              <>
                <h3 className="mt-12 font-sans text-base font-bold tracking-normal text-charcoal">Construction details</h3>
                <dl className="mt-3 divide-y divide-line border-y border-line">
                  {construction.map(([k, v]) => (
                    <div key={k} className="grid gap-1 py-3 sm:grid-cols-[200px_1fr]">
                      <dt className="text-sm text-slate">{k}</dt>
                      <dd className="text-[15px]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Section>

          <Section id="location" title="Location">
            <p className="flex items-start gap-2 text-charcoal/85">
              <MapPin className="mt-1 size-4 shrink-0 text-brass" />
              {p.location.address}
            </p>
            {mapSrc && (
              <iframe title={`Map of ${p.name}`} src={mapSrc} className="mt-5 aspect-[16/9] w-full border border-line" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            )}
          </Section>

          {p.faqs.length > 0 && (
            <Section id="faq" title="Questions buyers ask">
              <div className="divide-y divide-line border-y border-line">
                {p.faqs.map((f) => (
                  <details key={f.q} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-charcoal">
                      {f.q}
                      <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-3 max-w-[68ch] text-charcoal/80">{f.a}</p>
                  </details>
                ))}
              </div>
            </Section>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-36 space-y-6">
            <div className="border border-line p-6">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[13px] text-slate">Starting from</dt>
                  <dd className="font-display text-3xl text-ink">{p.priceFromMinor ? formatBDTShort(p.priceFromMinor) : "On request"}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-slate">Available units</dt>
                  <dd className="font-display text-3xl text-ink">
                    {p.units?.available ?? 0}
                    <span className="text-base text-slate"> / {p.units?.total ?? 0}</span>
                  </dd>
                </div>
              </dl>
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer noopener" className={buttonClass("primary", "lg", "mt-6 w-full")}>
                  <MessageCircle className="size-4" /> Ask on WhatsApp
                </a>
              )}
            </div>
            <div className="border border-line bg-mist p-6">
              <h2 className="font-sans text-lg font-bold tracking-normal text-ink">Request price list and visit</h2>
              <p className="mt-1 mb-5 text-sm text-slate">We'll send the cost sheet and book a time for you to see the site.</p>
              <InquiryForm projectId={p._id} compact submitLabel="Send request" />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
