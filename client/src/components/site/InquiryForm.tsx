import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import type { Project } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{5,}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).optional(),
  project: z.string().optional(),
  message: z.string().max(3000).optional(),
  website: z.string().max(0).optional(),
});
type Values = z.infer<typeof schema>;

export function InquiryForm({ projects, projectId, compact, submitLabel = "Send inquiry" }: { projects?: Pick<Project, "_id" | "name">[]; projectId?: string; compact?: boolean; submitLabel?: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { project: projectId ?? "" } });
  const { errors, isSubmitting } = formState;

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      await api.post("/inquiries", { ...v, kind: v.project ? "project" : "general", project: v.project || null, email: v.email || null });
      setSent(true);
      reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-md border border-success/30 bg-success/5 p-6">
        <CheckCircle2 className="size-6 text-success" />
        <p className="font-bold text-charcoal">Thank you. Your inquiry has been received.</p>
        <p className="text-sm text-slate">An Arkhaven advisor will call you within one working day.</p>
        <Button variant="secondary" size="sm" onClick={() => setSent(false)}>
          Send another inquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" error={errors.name?.message} required htmlFor="inq-name">
        <Input id="inq-name" autoComplete="name" invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field label="Phone" error={errors.phone?.message} required htmlFor="inq-phone">
        <Input id="inq-phone" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <Field label="Email" error={errors.email?.message} htmlFor="inq-email" className={compact ? "sm:col-span-2" : undefined}>
        <Input id="inq-email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
      </Field>
      {!compact && projects && (
        <Field label="Project of interest" htmlFor="inq-project">
          <Select id="inq-project" {...register("project")}>
            <option value="">Not sure yet</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Message" className="sm:col-span-2" htmlFor="inq-msg" hint="Budget, preferred size or floor, best time to call.">
        <Textarea id="inq-msg" rows={compact ? 3 : 4} {...register("message")} />
      </Field>
      {/* Honeypot field, hidden from people and screen readers */}
      <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...register("website")} />
      {error && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
