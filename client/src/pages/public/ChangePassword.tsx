import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, errorMessage } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { Logo } from "@/components/site/Logo";

export const passwordRules = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

const schema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: passwordRules, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords do not match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a different password" });
type V = z.infer<typeof schema>;

export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const { refresh } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const { register, handleSubmit, formState, reset } = useForm<V>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        setErr(null);
        setOk(false);
        try {
          await api.post("/auth/change-password", { currentPassword: v.currentPassword, newPassword: v.newPassword });
          await refresh();
          reset();
          setOk(true);
          onDone?.();
        } catch (e) {
          setErr(errorMessage(e));
        }
      })}
    >
      <Field label="Current password" error={errors.currentPassword?.message} htmlFor="cp-cur">
        <Input id="cp-cur" type="password" autoComplete="current-password" invalid={!!errors.currentPassword} {...register("currentPassword")} />
      </Field>
      <Field label="New password" error={errors.newPassword?.message} hint="At least 8 characters with a letter and a number." htmlFor="cp-new">
        <Input id="cp-new" type="password" autoComplete="new-password" invalid={!!errors.newPassword} {...register("newPassword")} />
      </Field>
      <Field label="Confirm new password" error={errors.confirm?.message} htmlFor="cp-conf">
        <Input id="cp-conf" type="password" autoComplete="new-password" invalid={!!errors.confirm} {...register("confirm")} />
      </Field>
      {err && (
        <p role="alert" className="text-sm text-danger">
          {err}
        </p>
      )}
      {ok && !onDone && (
        <p role="status" className="text-sm text-success">
          Password changed. Other devices have been signed out.
        </p>
      )}
      <Button type="submit" loading={isSubmitting}>
        Change password
      </Button>
    </form>
  );
}

/** Forced first-login password change. */
export default function ChangePassword() {
  useDocumentTitle("Set your password");
  const { user, loading, isStaff, logout } = useAuth();
  const nav = useNavigate();
  if (!loading && !user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-mist px-5 py-12">
      <div className="w-full max-w-md border border-line bg-paper p-8">
        <Logo className="h-9" />
        <h1 className="mt-8 text-3xl text-ink">Set a new password</h1>
        <p className="mt-2 mb-6 text-slate">You signed in with a temporary password. Choose your own before continuing; the temporary one will stop working.</p>
        <ChangePasswordForm onDone={() => nav(isStaff ? "/admin" : "/portal", { replace: true })} />
        <button onClick={() => logout().then(() => nav("/"))} className="mt-6 text-sm text-slate underline underline-offset-2 hover:text-ink">
          Sign out
        </button>
      </div>
    </div>
  );
}
