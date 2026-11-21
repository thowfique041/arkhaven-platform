import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, FileCheck2, HardHat, Landmark, ReceiptText, Quote } from "lucide-react";
import { usePublicProjects, useSettings, useTestimonials } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ProjectCard } from "@/components/site/ProjectCard";
import { InquiryForm } from "@/components/site/InquiryForm";
import { ButtonLink } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/data";
import { formatDate, imgSrc, projectStatusLabel } from "@/utils/format";
import type { Project } from "@/types";

const ease = [0.25, 1, 0.5, 1] as const;

/** The signature element: live construction status for every project, straight from the database. */
function SiteLedger({ projects, loading }: { projects: Project[]; loading: boolean }) {
  const updated = projects
    .map((p) => p.progress?.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();
  return (
    <motion.aside
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.35, ease }}
      className="w-full bg-paper text-charcoal shadow-[0_30px_60px_-20px_rgba(11,32,28,0.45)] lg:w-[400px]"
      aria-labelledby="ledger-title"
    >
      <div className="flex items-baseline justify-between border-b border-line px-6 pt-5 pb-4">
        <h2 id="ledger-title" className="font-sans text-[15px] font-bold tracking-normal text-ink">
          On site right now
        </h2>
        {updated && <p className="text-xs text-slate">Updated {formatDate(updated)}</p>}
      </div>
      <ol className="divide-y divide-line">
        {loading &&
          [0, 1, 2].map((i) => (
            <li key={i} className="px-6 py-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-3 h-1.5 w-full" />
            </li>
          ))}
        {projects.map((p, i) => {
          const pct = Math.round(p.progress?.percent ?? 0);
          return (
            <li key={p._id}>
              <Link to={`/projects/${p.slug}`} className="group block px-6 py-4 transition-colors hover:bg-mist">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-display text-lg leading-tight text-ink">{p.name}</p>
                  <p className="font-display text-xl text-ink tabular-nums">
                    {pct}
                    <span className="text-sm text-slate">%</span>
                  </p>
                </div>
                <p className="mt-0.5 text-[13px] text-slate">
                  {p.status === "upcoming" ? "Approvals and pre-booking" : (p.progress?.currentStageName ?? projectStatusLabel[p.status])}, {p.location.area}
                </p>
                <div className="mt-2.5 h-[3px] w-full bg-mist-dark">
                  <div className="ledger-fill h-full bg-brass" style={{ width: `${pct}%`, animationDelay: `${0.6 + i * 0.12}s` }} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="border-t border-line bg-mist/60 px-6 py-3 text-[13px] text-slate">Owners see stage photos and payment records in their private portal.</p>
    </motion.aside>
  );
}

const process = [
  { title: "Visit and choose", body: "Walk the site with an advisor, compare floor plans and see the land papers." },
  { title: "Book and sign", body: "Pay the booking money and sign an agreement that lists your unit, price and schedule." },
  { title: "Pay by milestone", body: "Installments are tied to construction stages, so you pay as the building rises." },
  { title: "Follow in your portal", body: "Stage updates, site photos, payments and receipts, all in one private account." },
  { title: "Receive your keys", body: "Joint inspection, snag list, documents and handover on the date in your agreement." },
];

const whyIcons = [FileCheck2, HardHat, ReceiptText, Landmark];

export default function Home() {
  const { data: s } = useSettings();
  const { data: list, isLoading } = usePublicProjects();
  const { data: testimonials } = useTestimonials();
  const projects = list?.data ?? [];
  useDocumentTitle(s?.seo?.title ?? "Arkhaven Properties", s?.seo?.description);

  const featuredIds = (s?.featuredProjectIds ?? []).map((f) => (typeof f === "string" ? f : f._id));
  const featured = (featuredIds.length ? featuredIds.map((id) => projects.find((p) => p._id === id)).filter(Boolean) : projects.filter((p) => p.featured)).slice(0, 3) as Project[];
  const hero = s?.hero;

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative isolate overflow-hidden bg-ink-900 text-paper">
        {hero?.image?.url && <img src={imgSrc(hero.image.url, 2200)} alt="" className="absolute inset-0 -z-10 size-full object-cover text-transparent opacity-55" fetchPriority="high" />}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,32,28,0.92)_0%,rgba(11,32,28,0.6)_55%,rgba(11,32,28,0.2)_100%)]" />
        <div className="container-x flex min-h-[640px] flex-col justify-end gap-12 pt-36 pb-14 lg:min-h-[760px] lg:flex-row lg:items-end lg:justify-between lg:pb-20">
          <div className="max-w-2xl">
            {hero?.eyebrow && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-[15px] text-brass-light">
                {hero.eyebrow}
              </motion.p>
            )}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease }}
              className="mt-4 text-[44px] leading-[1.02] font-[450] sm:text-6xl lg:text-[80px]"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
            >
              {hero?.title ?? "Homes built with care, handed over with trust."}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="mt-6 max-w-xl text-lg leading-relaxed text-paper/80">
              {hero?.subtitle}
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="mt-9 flex flex-wrap gap-3">
              <ButtonLink to="/projects" variant="brass" size="lg">
                {hero?.primaryCtaLabel ?? "Explore projects"}
              </ButtonLink>
              <ButtonLink to="/contact" variant="light" size="lg">
                {hero?.secondaryCtaLabel ?? "Book a site visit"}
              </ButtonLink>
            </motion.div>
          </div>
          <SiteLedger projects={projects.slice(0, 4)} loading={isLoading} />
        </div>
      </section>

      {/* ---------------- Featured projects ---------------- */}
      <section className="container-x py-20 lg:py-28">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <h2 className="text-4xl leading-tight text-ink sm:text-[44px]">Current projects</h2>
            <p className="mt-3 text-lg text-slate">Every listing shows live availability and the actual stage of construction.</p>
          </div>
          <Link to="/projects" className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-brass decoration-2 underline-offset-4 hover:text-brass-dark">
            See all {projects.length || ""} projects
          </Link>
        </div>
        <div className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? [0, 1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="aspect-[4/3] w-full" />
                  <Skeleton className="mt-5 h-6 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-full" />
                </div>
              ))
            : (featured.length ? featured : projects.slice(0, 3)).map((p) => <ProjectCard key={p._id} p={p} />)}
        </div>
      </section>

      {/* ---------------- About ---------------- */}
      {s?.about && (
        <section className="bg-mist">
          <div className="container-x grid items-center gap-12 py-20 lg:grid-cols-12 lg:py-28">
            <div className="lg:col-span-6">
              {s.about.image?.url && <img src={imgSrc(s.about.image.url, 1200)} alt="Arkhaven engineers reviewing drawings on site" loading="lazy" className="aspect-[5/4] w-full object-cover" />}
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <h2 className="text-4xl leading-tight text-ink">{s.about.title}</h2>
              <div className="prose-body mt-6 text-[17px] leading-relaxed text-charcoal/85">
                {s.about.body?.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
              </div>
              {s.stats && s.stats.length > 0 && (
                <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-ink/15 pt-8">
                  {s.stats.map((st) => (
                    <div key={st.label}>
                      <dt className="text-[13px] text-slate">{st.label}</dt>
                      <dd className="font-display text-4xl text-ink">{st.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <Link to="/about" className="mt-8 inline-flex font-semibold text-ink underline decoration-brass decoration-2 underline-offset-4 hover:text-brass-dark">
                Our story and team
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Why Arkhaven ---------------- */}
      {s?.whyUs && s.whyUs.length > 0 && (
        <section className="container-x py-20 lg:py-28">
          <h2 className="max-w-2xl text-4xl leading-tight text-ink sm:text-[44px]">What you can check before you commit</h2>
          <ul className="mt-14 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {s.whyUs.map((w, i) => {
              const Icon = whyIcons[i % whyIcons.length];
              return (
                <li key={w.title} className="bg-paper p-7">
                  <Icon className="size-6 text-brass" strokeWidth={1.6} />
                  <h3 className="mt-5 font-sans text-lg font-bold tracking-normal text-ink">{w.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate">{w.body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------------- Process (a real sequence) ---------------- */}
      <section className="bg-ink text-paper">
        <div className="container-x py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-4xl leading-tight">From booking to keys</h2>
              <p className="mt-4 text-paper/70">The five steps every Arkhaven buyer goes through, and what you receive at each one.</p>
            </div>
            <ol className="lg:col-span-8">
              {process.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[48px_1fr] gap-4 border-t border-paper/15 py-6 first:border-t-0 first:pt-0 sm:grid-cols-[64px_220px_1fr]">
                  <span className="font-display text-2xl text-brass-light tabular-nums">{i + 1}</span>
                  <h3 className="font-sans text-lg font-bold tracking-normal">{step.title}</h3>
                  <p className="col-start-2 text-paper/70 sm:col-start-3">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      {testimonials && testimonials.length > 0 && (
        <section className="container-x py-20 lg:py-28">
          <h2 className="text-4xl leading-tight text-ink">From our owners</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {testimonials.slice(0, 3).map((t) => (
              <figure key={t._id} className="flex flex-col border-l-2 border-brass pl-6">
                <Quote className="size-5 text-brass" aria-hidden />
                <blockquote className="mt-4 flex-1 font-display text-xl leading-snug text-ink">{t.quote}</blockquote>
                <figcaption className="mt-6 text-sm">
                  <span className="font-bold text-charcoal">{t.name}</span>
                  {t.role && <span className="block text-slate">{t.role}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Inquiry ---------------- */}
      <section className="border-t border-line bg-mist">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-4">
            <h2 className="text-4xl leading-tight text-ink">Visit a site this week</h2>
            <p className="mt-4 text-slate">Tell us what you are looking for. An advisor will call you back within one working day with available units and a time to visit.</p>
            {s?.contact?.phone && (
              <a href={`tel:${s.contact.phone.replace(/\s/g, "")}`} className="mt-8 inline-flex items-center gap-2 text-lg font-bold text-ink hover:text-brass-dark">
                {s.contact.phone}
                <ArrowUpRight className="size-4" />
              </a>
            )}
          </div>
          <div className="rounded-md bg-paper p-6 sm:p-8 lg:col-span-7 lg:col-start-6">
            <InquiryForm projects={projects} submitLabel="Request a call back" />
          </div>
        </div>
      </section>
    </>
  );
}
