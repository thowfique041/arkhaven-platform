import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage } from "@/services/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { Logo, Mark } from "@/components/site/Logo";
import { useSettings } from "@/hooks/queries";

const schema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});
type V = z.infer<typeof schema>;

export default function Login({ staff = false }: { staff?: boolean }) {
  useDocumentTitle(staff ? "Staff sign-in" : "Owner login");
  const { user, isStaff, login, loading } = useAuth();
  const { data: s } = useSettings();
  const nav = useNavigate();
  const loc = useLocation();
  const [err, setErr] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState } = useForm<V>({ resolver: zodResolver(schema) });

  const from = (loc.state as { from?: string } | null)?.from;
  if (!loading && user) {
    if (user.mustChangePassword) return <Navigate to="/account/password" replace />;
    return <Navigate to={from ?? (isStaff ? "/admin" : "/portal")} replace />;
  }

  const onSubmit = async (v: V) => {
    setErr(null);
    try {
      const session = await login(v.identifier, v.password);
      const staffUser = session.user.role !== "customer";
      if (session.user.mustChangePassword) return nav("/account/password", { replace: true });
      nav(from ?? (staffUser ? "/admin" : "/portal"), { replace: true });
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <Mark className="pointer-events-none absolute -right-24 -bottom-16 size-[560px] text-paper/[0.04]" door="rgba(176,141,87,0.12)" />
        <Link to="/" aria-label="Arkhaven home">
          <Logo variant="light" className="h-10" />
        </Link>
        <div className="relative max-w-md">
          <h1 className="text-5xl leading-[1.05]">{staff ? "Arkhaven operations" : "Your home, from first pile to final key."}</h1>
          <p className="mt-5 text-lg text-paper/70">
            {staff ? "Manage projects, leads, customers, payments and construction updates." : "See your unit, every payment and receipt, and the latest photos from site, whenever you want."}
          </p>
        </div>
        <p className="relative text-sm text-paper/50">{s?.contact?.phone && <>Need help? Call {s.contact.phone}</>}</p>
      </aside>
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="lg:hidden" aria-label="Arkhaven home">
            <Logo className="h-9" />
          </Link>
          <h2 className="mt-10 text-4xl text-ink lg:mt-0">{staff ? "Staff sign-in" : "Owner login"}</h2>
          <p className="mt-2 text-slate">{staff ? "Use your Arkhaven staff email." : "Use the username and password from your Arkhaven advisor."}</p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            <Field label={staff ? "Email" : "Username or email"} error={formState.errors.identifier?.message} htmlFor="login-id">
              <Input id="login-id" autoComplete="username" autoCapitalize="none" spellCheck={false} invalid={!!formState.errors.identifier} {...register("identifier")} />
            </Field>
            <Field label="Password" error={formState.errors.password?.message} htmlFor="login-pw">
              <div className="relative">
                <Input id="login-pw" type={show ? "text" : "password"} autoComplete="current-password" className="pr-10" invalid={!!formState.errors.password} {...register("password")} />
                <button type="button" onClick={() => setShow((x) => !x)} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 text-slate hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {err && (
              <p role="alert" className="rounded-xs border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
                {err}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting} icon={<Lock className="size-4" />}>
              Sign in
            </Button>
          </form>
          <div className="mt-8 border-t border-line pt-6 text-sm text-slate">
            {staff ? (
              <p>Forgot your password? Ask a Super Admin to reset it.</p>
            ) : (
              <>
                <p>Accounts are created by Arkhaven after booking. There is no public sign-up.</p>
                <p className="mt-2">
                  Forgot your password?{" "}
                  <Link to="/contact" className="font-semibold text-ink underline decoration-brass underline-offset-2">
                    Contact your advisor
                  </Link>{" "}
                  for a reset.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
