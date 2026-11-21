import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, AUTH_EXPIRED_EVENT } from "@/services/api";
import type { User } from "@/types";

interface SessionCustomer {
  _id: string;
  code: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
}
interface Session {
  user: User;
  customer: SessionCustomer | null;
}

interface AuthState {
  user: User | null;
  customer: SessionCustomer | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setSession: (s: Session) => void;
  isStaff: boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const refresh = useCallback(async () => {
    try {
      setSession(await api.get<Session | null>("/auth/session"));
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onExpired = () => {
      setSession(null);
      qc.clear();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [refresh, qc]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const s = await api.post<Session>("/auth/login", { identifier, password });
      qc.clear();
      setSession(s);
      return s;
    },
    [qc],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setSession(null);
      qc.clear();
    }
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      customer: session?.customer ?? null,
      loading,
      login,
      logout,
      refresh,
      setSession,
      isStaff: session?.user.role === "admin" || session?.user.role === "superadmin",
    }),
    [session, loading, login, logout, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
