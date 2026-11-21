import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  HardHat,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareQuote,
  Settings,
  ShieldCheck,
  SquareStack,
  UsersRound,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Mark } from "@/components/site/Logo";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; badge?: number; superOnly?: boolean };

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  const { data: inq } = useQuery({ queryKey: ["inquiries-count"], queryFn: () => api.page<unknown[]>("/inquiries", { limit: 1, status: "new" }), refetchInterval: 60_000 });
  const newInquiries = (inq?.meta?.newCount as number | undefined) ?? 0;

  const groups: { title: string; items: Item[] }[] = [
    { title: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true }] },
    {
      title: "Sales",
      items: [
        { to: "/admin/inquiries", label: "Inquiries", icon: Inbox, badge: newInquiries },
        { to: "/admin/leads", label: "Leads", icon: ClipboardList },
        { to: "/admin/customers", label: "Customers", icon: UsersRound },
        { to: "/admin/payments", label: "Payments", icon: CreditCard },
      ],
    },
    {
      title: "Projects",
      items: [
        { to: "/admin/projects", label: "Projects", icon: Building2 },
        { to: "/admin/flats", label: "Flats & units", icon: SquareStack },
        { to: "/admin/progress", label: "Construction", icon: HardHat },
        { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
      ],
    },
    {
      title: "Website",
      items: [
        { to: "/admin/content", label: "Site content", icon: LayoutTemplate },
        { to: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      ],
    },
    {
      title: "System",
      items: [
        { to: "/admin/users", label: "Staff accounts", icon: ShieldCheck, superOnly: true },
        { to: "/admin/activity", label: "Activity log", icon: Activity },
        { to: "/admin/settings", label: "My settings", icon: Settings },
      ],
    },
  ];

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-3 px-5 py-5">
        <Mark className="size-8 text-paper" />
        <span className="leading-tight">
          <span className="block font-display text-lg tracking-wide text-paper">Arkhaven</span>
          <span className="block text-[11px] text-paper/50">Operations</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Admin">
        {groups.map((g) => {
          const items = g.items.filter((i) => !i.superOnly || user?.role === "superadmin");
          if (!items.length) return null;
          return (
            <div key={g.title} className="mt-5">
              <p className="px-3 pb-1.5 text-[11px] font-semibold text-paper/40">{g.title}</p>
              <ul className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, end, badge }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        clsx("flex items-center gap-3 rounded-xs px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-paper/10 text-paper" : "text-paper/65 hover:bg-paper/5 hover:text-paper")
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {!!badge && <span className="rounded-full bg-brass px-1.5 text-[11px] font-bold text-ink-900">{badge}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-paper/10 p-4">
        <p className="truncate text-sm font-semibold text-paper">{user?.name}</p>
        <p className="truncate text-xs text-paper/50">{user?.role === "superadmin" ? "Super Admin" : "Admin"}</p>
        <div className="mt-3 flex gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-xs border border-paper/15 py-1.5 text-xs text-paper/70 hover:text-paper">
            <ExternalLink className="size-3.5" /> Website
          </a>
          <button onClick={() => logout().then(() => nav("/admin/login"))} className="flex flex-1 items-center justify-center gap-1.5 rounded-xs border border-paper/15 py-1.5 text-xs text-paper/70 hover:text-paper">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-mist/60">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-ink-900 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink-900">
            <button className="absolute top-4 right-3 p-1.5 text-paper/70" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="p-1.5" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Mark className="size-6 text-ink" />
          <span className="font-display text-lg">Arkhaven</span>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
