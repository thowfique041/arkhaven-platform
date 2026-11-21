import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, errorMessage } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { useFeedback } from "@/components/ui/overlay";
import { ChangePasswordForm } from "@/pages/public/ChangePassword";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMyAccount } from "./Overview";

const schema = z.object({
  phone: z.string().trim().regex(/^[+\d][\d\s-]{5,}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  address: z.string().max(300),
});
type V = z.infer<typeof schema>;

export default function PortalProfile() {
  useDocumentTitle("Profile");
  const { setSession } = useAuth();
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const { data: c } = useMyAccount();
  const { register, handleSubmit, reset, formState } = useForm<V>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (c) reset({ phone: c.phone, email: c.email ?? "", address: c.address ?? "" });
  }, [c, reset]);
  const save = useMutation({
    mutationFn: (v: V) => api.patch<Parameters<typeof setSession>[0]>("/auth/me", { phone: v.phone, email: v.email || null, address: v.address || null }),
    onSuccess: (s) => {
      setSession(s);
      qc.invalidateQueries({ queryKey: ["my-account"] });
      toast("Contact details saved");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const { errors } = formState;

  return (
    <>
      <h1 className="text-4xl text-ink">Profile</h1>
      <p className="mt-2 text-slate">Keep your contact details up to date so we can reach you about your home.</p>
      <div className="mt-8 grid max-w-4xl gap-6 lg:grid-cols-2">
        <Card title="Contact details">
          <form className="space-y-4" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
            <Field label="Full name" hint="To change your registered name, contact your advisor.">
              <Input value={c?.fullName ?? ""} disabled />
            </Field>
            <Field label="Customer ID">
              <Input value={c?.code ?? ""} disabled />
            </Field>
            <Field label="Phone" required error={errors.phone?.message}>
              <Input type="tel" invalid={!!errors.phone} {...register("phone")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" invalid={!!errors.email} {...register("email")} />
            </Field>
            <Field label="Mailing address">
              <Textarea rows={2} {...register("address")} />
            </Field>
            <Button type="submit" loading={save.isPending} disabled={!formState.isDirty}>
              Save contact details
            </Button>
          </form>
        </Card>
        <Card title="Password">
          <ChangePasswordForm />
        </Card>
      </div>
    </>
  );
}
