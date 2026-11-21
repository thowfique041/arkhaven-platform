import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import PublicLayout, { ScrollToTop } from "@/layouts/PublicLayout";
import { RequireRole } from "./guards";
import { Spinner } from "@/components/ui/primitives";
import Home from "@/pages/public/Home";
import NotFound from "@/pages/public/NotFound";

const Projects = lazy(() => import("@/pages/public/Projects"));
const ProjectDetail = lazy(() => import("@/pages/public/ProjectDetail"));
const About = lazy(() => import("@/pages/public/About"));
const Contact = lazy(() => import("@/pages/public/Contact"));
const Landowners = lazy(() => import("@/pages/public/Landowners"));
const Privacy = lazy(() => import("@/pages/public/Privacy"));
const Login = lazy(() => import("@/pages/public/Login"));
const ChangePassword = lazy(() => import("@/pages/public/ChangePassword"));

const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminProjects = lazy(() => import("@/pages/admin/Projects"));
const ProjectEditor = lazy(() => import("@/pages/admin/ProjectEditor"));
const Flats = lazy(() => import("@/pages/admin/Flats"));
const Leads = lazy(() => import("@/pages/admin/Leads"));
const Customers = lazy(() => import("@/pages/admin/Customers"));
const CustomerDetail = lazy(() => import("@/pages/admin/CustomerDetail"));
const Payments = lazy(() => import("@/pages/admin/Payments"));
const Progress = lazy(() => import("@/pages/admin/Progress"));
const ProgressDetail = lazy(() => import("@/pages/admin/ProgressDetail"));
const Announcements = lazy(() => import("@/pages/admin/Announcements"));
const Testimonials = lazy(() => import("@/pages/admin/Testimonials"));
const Inquiries = lazy(() => import("@/pages/admin/Inquiries"));
const Content = lazy(() => import("@/pages/admin/Content"));
const Users = lazy(() => import("@/pages/admin/Users"));
const ActivityLog = lazy(() => import("@/pages/admin/ActivityLog"));
const AdminSettings = lazy(() => import("@/pages/admin/Settings"));

const PortalLayout = lazy(() => import("@/layouts/PortalLayout"));
const PortalHome = lazy(() => import("@/pages/portal/Overview"));
const PortalPayments = lazy(() => import("@/pages/portal/Payments"));
const PortalProgress = lazy(() => import("@/pages/portal/Progress"));
const PortalNotices = lazy(() => import("@/pages/portal/Announcements"));
const PortalProfile = lazy(() => import("@/pages/portal/Profile"));

const S = ({ children }: { children: ReactNode }) => (
  <Suspense
    fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    }
  >
    {children}
  </Suspense>
);

function Root() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/projects", element: <S><Projects /></S> },
          { path: "/projects/:slug", element: <S><ProjectDetail /></S> },
          { path: "/about", element: <S><About /></S> },
          { path: "/contact", element: <S><Contact /></S> },
          { path: "/landowners", element: <S><Landowners /></S> },
          { path: "/privacy", element: <S><Privacy /></S> },
          { path: "*", element: <NotFound /> },
        ],
      },
      { path: "/login", element: <S><Login /></S> },
      { path: "/admin/login", element: <S><Login staff /></S> },
      { path: "/account/password", element: <S><ChangePassword /></S> },
      {
        path: "/admin",
        element: (
          <RequireRole roles={["admin", "superadmin"]} loginPath="/admin/login">
            <S><AdminLayout /></S>
          </RequireRole>
        ),
        children: [
          { index: true, element: <S><Dashboard /></S> },
          { path: "projects", element: <S><AdminProjects /></S> },
          { path: "projects/new", element: <S><ProjectEditor /></S> },
          { path: "projects/:id", element: <S><ProjectEditor /></S> },
          { path: "flats", element: <S><Flats /></S> },
          { path: "leads", element: <S><Leads /></S> },
          { path: "customers", element: <S><Customers /></S> },
          { path: "customers/:id", element: <S><CustomerDetail /></S> },
          { path: "payments", element: <S><Payments /></S> },
          { path: "progress", element: <S><Progress /></S> },
          { path: "progress/:projectId", element: <S><ProgressDetail /></S> },
          { path: "announcements", element: <S><Announcements /></S> },
          { path: "testimonials", element: <S><Testimonials /></S> },
          { path: "inquiries", element: <S><Inquiries /></S> },
          { path: "content", element: <S><Content /></S> },
          {
            path: "users",
            element: (
              <RequireRole roles={["superadmin"]} loginPath="/admin/login">
                <S><Users /></S>
              </RequireRole>
            ),
          },
          { path: "activity", element: <S><ActivityLog /></S> },
          { path: "settings", element: <S><AdminSettings /></S> },
        ],
      },
      {
        path: "/portal",
        element: (
          <RequireRole roles={["customer"]} loginPath="/login">
            <S><PortalLayout /></S>
          </RequireRole>
        ),
        children: [
          { index: true, element: <S><PortalHome /></S> },
          { path: "payments", element: <S><PortalPayments /></S> },
          { path: "progress", element: <S><PortalProgress /></S> },
          { path: "announcements", element: <S><PortalNotices /></S> },
          { path: "profile", element: <S><PortalProfile /></S> },
        ],
      },
    ],
  },
]);
