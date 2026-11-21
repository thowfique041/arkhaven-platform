import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/primitives";
import type { Role } from "@/types";

/**
 * UX-level route guard only. Every API endpoint enforces the same rules on the server,
 * so bypassing this in the browser exposes nothing.
 */
export function RequireRole({ roles, children, loginPath }: { roles: Role[]; children: ReactNode; loginPath: string }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  if (!user) return <Navigate to={loginPath} replace state={{ from: loc.pathname + loc.search }} />;
  if (user.mustChangePassword) return <Navigate to="/account/password" replace />;
  if (!roles.includes(user.role)) return <Navigate to={user.role === "customer" ? "/portal" : "/admin"} replace />;
  return <>{children}</>;
}
