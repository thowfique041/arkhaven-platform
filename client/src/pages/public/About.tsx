import { useSettings } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ButtonLink } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/data";
import { imgSrc } from "@/utils/format";

function initials(name: string) {
  return name
    .replace(/^(Engr\.|Ar\.|Dr\.)\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

export default function About() {
  const { data: s, isLoading } = useSettings();
  useDocumentTitle("About us", "Arkhaven Properties: who we are, how we build, and why buyers trust us.");
  if (isLoading || !s)
    return (
      <div className="container-x py-32">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="mt-6 h-4 w-1/2" />
      </div>
    );
  const a = s.about ?? {};

  return (
    <>
      <section className="border-b border-line bg-mist">
        <div className="container-x grid gap-10 pt-16 pb-14 lg:grid-cols-12 lg:pt-24">
          <h1 className="text-5xl leading-[1.05] text-ink sm:text-6xl lg:col-span-7">{a.title}</h1>
          <div className="prose-body text-[17px] leading-relaxed text-charcoal/85 lg:col-span-5 lg:pt-3">
            {a.body?.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </section>

      {a.image?.url && <img src={imgSrc(a.image.url, 2200)} alt="Arkhaven team on a construction site" className="h-[360px] w-full object-cover lg:h-[520px]" />}

      <section className="container-x grid gap-12 py-20 md:grid-cols-2 lg:py-28">
        {a.mission && (
          <div>
            <h2 className="text-3xl text-ink">Our mission</h2>
            <p className="mt-4 max-w-[54ch] text-lg leading-relaxed text-charcoal/85">{a.mission}</p>
          </div>
        )}
        {a.vision && (
          <div>
            <h2 className="text-3xl text-ink">Our vision</h2>
            <p className="mt-4 max-w-[54ch] text-lg leading-relaxed text-charcoal/85">{a.vision}</p>
          </div>
        )}
      </section>

      {s.values && s.values.length > 0 && (
        <section className="bg-ink text-paper">
          <div className="container-x py-20 lg:py-24">
            <h2 className="text-4xl">What we hold ourselves to</h2>
            <dl className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {s.values.map((v) => (
                <div key={v.title} className="border-t border-brass pt-5">
                  <dt className="font-display text-2xl">{v.title}</dt>
                  <dd className="mt-2 text-paper/70">{v.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {s.whyUs && s.whyUs.length > 0 && (
        <section className="container-x py-20 lg:py-28">
          <h2 className="max-w-2xl text-4xl text-ink">Why buyers trust us</h2>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {s.whyUs.map((w) => (
              <li key={w.title} className="grid gap-2 py-6 md:grid-cols-[320px_1fr]">
                <h3 className="font-sans text-lg font-bold tracking-normal text-charcoal">{w.title}</h3>
                <p className="max-w-[64ch] text-charcoal/80">{w.body}</p>
              </li>
            ))}
          </ul>
          {a.points && a.points.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {a.points.map((pt) => (
                <li key={pt} className="rounded-xs border border-line bg-mist px-3 py-1.5 text-sm">
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {s.team && s.team.length > 0 && (
        <section className="bg-mist">
          <div className="container-x py-20 lg:py-28">
            <h2 className="text-4xl text-ink">Leadership</h2>
            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {s.team.map((m) => (
                <li key={m.name}>
                  {m.photo?.url ? (
                    <img src={imgSrc(m.photo.url, 600)} alt={m.name} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex aspect-[4/5] w-full items-center justify-center bg-ink font-display text-5xl text-brass-light" aria-hidden>
                      {initials(m.name)}
                    </div>
                  )}
                  <h3 className="mt-4 font-sans text-lg font-bold tracking-normal text-charcoal">{m.name}</h3>
                  <p className="text-sm font-semibold text-brass-dark">{m.role}</p>
                  {m.bio && <p className="mt-2 text-sm text-slate">{m.bio}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {s.milestones && s.milestones.length > 0 && (
        <section className="container-x py-20 lg:py-28">
          <h2 className="text-4xl text-ink">Milestones</h2>
          <ol className="mt-10 border-l-2 border-line">
            {s.milestones.map((m) => (
              <li key={m.year + m.title} className="relative pb-10 pl-8 last:pb-0">
                <span className="absolute top-2 -left-[7px] size-3 rounded-full bg-brass" aria-hidden />
                <p className="font-display text-2xl text-ink">{m.year}</p>
                <h3 className="mt-1 font-sans text-lg font-bold tracking-normal">{m.title}</h3>
                {m.body && <p className="mt-1 text-slate">{m.body}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="border-t border-line">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-16 sm:flex-row sm:items-center">
          <h2 className="text-3xl text-ink">See what we're building now</h2>
          <div className="flex gap-3">
            <ButtonLink to="/projects">View projects</ButtonLink>
            <ButtonLink to="/contact" variant="secondary">
              Talk to an advisor
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
