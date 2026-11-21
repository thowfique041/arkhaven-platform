import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Phone, UserRound, X } from "lucide-react";
import clsx from "clsx";
import { Logo } from "./Logo";
import { buttonClass } from "@/components/ui/primitives";
import { useSettings } from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";

const nav = [
  { to: "/projects", label: "Projects" },
  { to: "/about", label: "About" },
  { to: "/landowners", label: "For landowners" },
  { to: "/contact", label: "Contact" },
];

export function Header({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: s } = useSettings();
  const { user, isStaff } = useAuth();
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const transparent = overlay && !scrolled && !open;
  const accountHref = user ? (isStaff ? "/admin" : "/portal") : "/login";

  return (
    <>
      {s?.announcementBar && (
        <div className="bg-ink-900 text-[13px] text-paper/80">
          <div className="container-x flex h-9 items-center justify-between gap-4">
            <p className="truncate">{s.announcementBar}</p>
            {s.contact?.phone && (
              <a href={`tel:${s.contact.phone.replace(/\s/g, "")}`} className="hidden shrink-0 items-center gap-1.5 hover:text-paper sm:inline-flex">
                <Phone className="size-3.5" />
                {s.contact.phone}
              </a>
            )}
          </div>
        </div>
      )}
      <header
        className={clsx(
          "sticky top-0 z-40 transition-colors duration-300",
          transparent ? "-mb-[72px] bg-transparent text-paper" : "border-b border-line bg-paper/95 text-charcoal backdrop-blur",
        )}
      >
        <div className="container-x flex h-[72px] items-center justify-between gap-6">
          <Link to="/" aria-label="Arkhaven Properties home" className="shrink-0">
            <Logo variant={transparent ? "light" : "dark"} className="h-8 sm:h-9" />
          </Link>
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  clsx("relative py-2 text-[15px] font-semibold transition-colors", isActive ? (transparent ? "text-paper" : "text-ink") : transparent ? "text-paper/80 hover:text-paper" : "text-slate hover:text-ink", isActive && "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-brass")
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to={accountHref} className={clsx("hidden items-center gap-1.5 px-2 py-2 text-sm font-semibold sm:inline-flex", transparent ? "text-paper/90 hover:text-paper" : "text-slate hover:text-ink")}>
              <UserRound className="size-4" />
              {user ? (isStaff ? "Dashboard" : "My home") : "Owner login"}
            </Link>
            <Link to="/contact" className={buttonClass(transparent ? "light" : "primary", "md", "max-sm:hidden")}>
              Book a site visit
            </Link>
            <button className={clsx("rounded-xs p-2 lg:hidden", transparent ? "hover:bg-paper/10" : "hover:bg-mist")} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}>
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav
              id="mobile-nav"
              aria-label="Mobile"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line bg-paper lg:hidden"
            >
              <ul className="container-x flex flex-col py-3">
                {[{ to: "/", label: "Home" }, ...nav].map((n) => (
                  <li key={n.to}>
                    <NavLink to={n.to} end className={({ isActive }) => clsx("block border-b border-line py-3.5 text-lg font-semibold", isActive ? "text-ink" : "text-slate")}>
                      {n.label}
                    </NavLink>
                  </li>
                ))}
                <li className="flex flex-col gap-2 pt-4 pb-2">
                  <Link to="/contact" className={buttonClass("primary", "lg")}>
                    Book a site visit
                  </Link>
                  <Link to={accountHref} className={buttonClass("secondary", "lg")}>
                    {user ? (isStaff ? "Dashboard" : "My home") : "Owner login"}
                  </Link>
                </li>
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
