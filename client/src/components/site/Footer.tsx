import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./Logo";
import { useSettings } from "@/hooks/queries";

export function Footer() {
  const { data: s } = useSettings();
  const c = s?.contact ?? {};
  const social = [
    { href: s?.social?.facebook, label: "Facebook" },
    { href: s?.social?.instagram, label: "Instagram" },
    { href: s?.social?.linkedin, label: "LinkedIn" },
    { href: s?.social?.youtube, label: "YouTube" },
  ].filter((x) => x.href);

  return (
    <footer className="bg-ink-900 text-paper/75">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo variant="light" className="h-10" />
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed">{s?.about?.mission ?? "Durable, well-planned homes, and honest progress from booking to handover."}</p>
          {social.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {social.map(({ href, label }) => (
                <li key={label}>
                  <a href={href!} target="_blank" rel="noreferrer noopener" className="underline decoration-paper/25 underline-offset-4 hover:text-paper hover:decoration-brass">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav className="md:col-span-3" aria-label="Footer">
          <h2 className="font-sans text-sm font-bold tracking-normal text-paper">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {[
              ["/projects", "All projects"],
              ["/projects?status=ongoing", "Under construction"],
              ["/projects?status=completed", "Ready to move in"],
              ["/about", "About Arkhaven"],
              ["/landowners", "For landowners"],
              ["/contact", "Contact"],
              ["/login", "Owner login"],
            ].map(([to, l]) => (
              <li key={to}>
                <Link to={to} className="hover:text-paper">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <address className="not-italic md:col-span-4">
          <h2 className="font-sans text-sm font-bold tracking-normal text-paper">Head office</h2>
          <ul className="mt-4 space-y-3 text-[15px]">
            {c.address && (
              <li className="flex gap-3">
                <MapPin className="mt-1 size-4 shrink-0 text-brass" />
                {c.address}
              </li>
            )}
            {c.phone && (
              <li className="flex gap-3">
                <Phone className="mt-1 size-4 shrink-0 text-brass" />
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="hover:text-paper">
                  {c.phone}
                </a>
              </li>
            )}
            {c.email && (
              <li className="flex gap-3">
                <Mail className="mt-1 size-4 shrink-0 text-brass" />
                <a href={`mailto:${c.email}`} className="hover:text-paper">
                  {c.email}
                </a>
              </li>
            )}
            {c.officeHours && <li className="pl-7 text-sm text-paper/55">{c.officeHours}</li>}
          </ul>
        </address>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-x flex flex-col justify-between gap-2 py-5 text-[13px] text-paper/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {s?.companyName ?? "Arkhaven Properties Ltd."} All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-paper">
              Privacy
            </Link>
            <Link to="/admin/login" className="hover:text-paper">
              Staff sign-in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
