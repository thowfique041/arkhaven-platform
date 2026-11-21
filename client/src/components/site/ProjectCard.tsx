import { Link } from "react-router-dom";
import { BedDouble, Building2, MapPin, Ruler } from "lucide-react";
import type { Project } from "@/types";
import { formatBDTShort, imgSrc, projectStatusLabel, projectTypeLabel } from "@/utils/format";
import { ProgressBar } from "@/components/ui/data";

/**
 * Project card. Whole card is a link; the image keeps a fixed 4:3 frame so grids stay aligned.
 */
export function ProjectCard({ p }: { p: Project }) {
  const u = p.units;
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden bg-mist">
        {p.coverImage?.url && (
          <img src={imgSrc(p.coverImage.url, 900)} alt={`${p.name} exterior`} loading="lazy" className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
        )}
        <span className="absolute top-3 left-3 rounded-xs bg-paper px-2 py-1 text-xs font-bold text-ink">{projectStatusLabel[p.status]}</span>
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-brass-dark">
          <MapPin className="size-3.5" />
          {p.location.area ?? p.location.city}
        </p>
        <h3 className="mt-1.5 text-[26px] leading-tight text-ink">
          <Link to={`/projects/${p.slug}`} className="after:absolute after:inset-0">
            {p.name}
          </Link>
        </h3>
        {p.tagline && <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-slate">{p.tagline}</p>}
        <dl className="mt-4 grid grid-cols-3 border-y border-line py-3 text-[13px]">
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1 text-slate">
              <Building2 className="size-3.5" />
              Floors
            </dt>
            <dd className="font-bold text-charcoal">{p.specs?.floorsLabel ?? p.specs?.totalFloors ?? "–"}</dd>
          </div>
          <div className="flex flex-col gap-0.5 border-x border-line px-3">
            <dt className="flex items-center gap-1 text-slate">
              {p.type === "commercial" ? <Ruler className="size-3.5" /> : <BedDouble className="size-3.5" />}
              {p.type === "commercial" ? "Suites" : "Homes"}
            </dt>
            <dd className="font-bold text-charcoal">{u?.total ?? 0}</dd>
          </div>
          <div className="flex flex-col gap-0.5 pl-3">
            <dt className="text-slate">Available</dt>
            <dd className={u?.available ? "font-bold text-success" : "font-bold text-slate"}>{u?.available ? u.available : "Sold out"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            {p.progress && p.status !== "upcoming" ? (
              <>
                <p className="flex justify-between text-[13px] text-slate">
                  <span className="truncate">{p.progress.currentStageName}</span>
                  <span className="font-bold text-ink tabular-nums">{Math.round(p.progress.percent)}%</span>
                </p>
                <ProgressBar value={p.progress.percent} className="mt-1.5" tone={p.status === "completed" ? "success" : "brass"} />
              </>
            ) : (
              <p className="text-[13px] text-slate">{projectTypeLabel[p.type]}, pre-booking open</p>
            )}
          </div>
          {p.priceFromMinor ? (
            <p className="shrink-0 text-right text-[13px] text-slate">
              from <span className="block text-base font-bold text-ink">{formatBDTShort(p.priceFromMinor)}</span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
