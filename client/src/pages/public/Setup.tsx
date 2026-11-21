import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button, Checkbox, Field, Input } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/data";
import { Logo } from "@/components/site/Logo";

const schema = z
  .object({
    token: z.string().trim().min(16, "Paste the setup token"),
    name: z.string().trim().min(2, "Enter your name"),
    email: z.string().trim().email("Enter a valid email"),
    password: z
      .string()
      .min(12, "Use at least 12 characters")
      .regex(/[A-Za-z]/, "Include a letter")
      .regex(/\d/, "Include a number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type V = z.infer<typeof schema>;

/**
 * First-run setup: creates the first Super Admin with a password the owner chooses.
 * Works only while no Super Admin exists and BOOTSTRAP_TOKEN is configured on the server.
 */
export default function Setup() {
  useDocumentTitle("First-time setup");
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { login } = useAuth();
  const [sample, setSample] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const { data: status, isLoading } = useQuery({ queryKey: ["setup-status"], queryFn: () => api.get<{ needsSetup: boolean; bootstrapEnabled: boolean }>("/auth/setup-status"), retry: false });
  const { register, handleSubmit, formState } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { token: params.get("token") ?? "" } });
  const { errors, isSubmitting } = formState;

  const onSubmit = async (v: V) => {
    setErr(null);
    try {
      setStage("Creating your Super Admin account…");
      await api.post("/auth/bootstrap", { token: v.token, name: v.name, email: v.email, password: v.password });
      setStage("Signing you in…");
      await login(v.email, v.password);
      if (sample) {
        setStage("Loading sample projects and website content…");
        await api.post("/settings/sample-content");
      }
      nav("/admin", { replace: true });
    } catch (e) {
      setStage(null);
      setErr(errorMessage(e));
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-mist px-5 py-12">
      <div className="w-full max-w-lg border border-line bg-paper p-8">
        <Logo className="h-9" />
        <h1 className="mt-8 text-3xl text-ink">First-time setup</h1>
        {isLoading ? (
          <Skeleton className="mt-6 h-40" />
        ) : !status?.needsSetup ? (
          <div className="mt-4 space-y-4 text-slate">
            <p>Setup is complete: a Super Admin already exists. This page is closed.</p>
            <Link to="/admin/login" className="font-semibold text-ink underline">
              Go to staff sign-in
            </Link>
          </div>
        ) : !status.bootstrapEnabled ? (
          <p className="mt-4 text-slate">
            No Super Admin exists yet, but web setup is disabled. Set <code className="rounded-xs bg-mist px-1">BOOTSTRAP_TOKEN</code> on the server, or run{" "}
            <code className="rounded-xs bg-mist px-1">npm run create-super-admin</code> as described in the README.
          </p>
        ) : (
          <>
            <p className="mt-2 mb-6 text-slate">Create the first Super Admin account. Choose your own password; it is stored only as a secure hash. This page closes permanently once the account exists.</p>
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Field label="Setup token" error={errors.token?.message} htmlFor="su-token" hint="Pre-filled from the setup link">
                <Input id="su-token" autoComplete="off" invalid={!!errors.token} {...register("token")} />
              </Field>
              <Field label="Your full name" error={errors.name?.message} htmlFor="su-name">
                <Input id="su-name" autoComplete="name" invalid={!!errors.name} {...register("name")} />
              </Field>
              <Field label="Email (used to sign in)" error={errors.email?.message} htmlFor="su-email">
                <Input id="su-email" type="email" autoComplete="username" invalid={!!errors.email} {...register("email")} />
              </Field>
              <Field label="Password" error={errors.password?.message} htmlFor="su-pw" hint="At least 12 characters with letters and numbers">
                <Input id="su-pw" type="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
              </Field>
              <Field label="Confirm password" error={errors.confirm?.message} htmlFor="su-pw2">
                <Input id="su-pw2" type="password" autoComplete="new-password" invalid={!!errors.confirm} {...register("confirm")} />
              </Field>
              <Checkbox label="Load sample content" description="Four example projects with units, website text and testimonials. You can edit or delete them later." checked={sample} onChange={setSample} />
              {err && (
                <p role="alert" className="rounded-xs border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {err}
                </p>
              )}
              {stage && (
                <p role="status" className="text-sm text-slate">
                  {stage}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={<ShieldCheck className="size-4" />}>
                Create Super Admin
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
