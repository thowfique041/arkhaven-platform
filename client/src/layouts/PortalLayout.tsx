import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, CreditCard, HardHat, Home, LogOut, UserRound } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/site/Logo";

const items = [
  { to: "/portal", label: "My home", icon: Home, end: true },
  { to: "/portal/payments", label: "Payments", icon: CreditCard },
  { to: "/portal/progress", label: "Construction", icon: HardHat },
  { to: "/portal/announcements", label: "Notices", icon: Bell },
  { to: "/portal/profile", label: "Profile", icon: UserRound },
];

export default function PortalLayout() {
  const { customer, user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-dvh bg-mist pb-20 md:pb-0">
      <header className="border-b border-line bg-paper">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Link to="/portal" aria-label="My home">
            <Logo className="h-8" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Portal">
            {items.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx("rounded-xs px-3 py-2 text-sm font-semibold", isActive ? "bg-mist text-ink" : "text-slate hover:text-ink")}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-semibold text-charcoal">{customer?.fullName ?? user?.name}</p>
              <p className="text-xs text-slate">{customer?.code}</p>
            </div>
            <button onClick={() => logout().then(() => nav("/login"))} className="flex items-center gap-1.5 rounded-xs border border-line px-3 py-1.5 text-sm text-slate hover:text-ink" aria-label="Sign out">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="container-x py-8 lg:py-10">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper md:hidden" aria-label="Portal mobile">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => clsx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", isActive ? "text-ink" : "text-slate")}>
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
