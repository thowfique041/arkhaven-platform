import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{5,}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).optional(),
  location: z.string().trim().min(3, "Where is the land?"),
  sizeKatha: z.coerce.number({ invalid_type_error: "Enter the size in katha" }).positive("Enter the size in katha").max(10000),
  roadWidth: z.string().trim().max(40).optional(),
  message: z.string().max(3000).optional(),
  website: z.string().max(0).optional(),
});
type V = z.infer<typeof schema>;

const steps = [
  { t: "Land assessment", b: "We visit the plot, check the title chain, mutation and RAJUK zoning, and tell you what can be built." },
  { t: "Offer and agreement", b: "A written offer covering your share of apartments, signing money and a fixed construction timeline." },
  { t: "Design and approvals", b: "Our architects design the building; we obtain the plan approval and utility clearances at our cost." },
  { t: "Construction", b: "You follow progress in the same portal our buyers use, with monthly site photos." },
  { t: "Handover", b: "Your apartments are handed over first, with all documents, before buyer handovers begin." },
];

export default function Landowners() {
  useDocumentTitle("For landowners", "Joint-venture development with Arkhaven Properties: assessment, agreement, approvals, construction and handover.");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<V>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = formState;

  const onSubmit = async (v: V) => {
    setErr(null);
    try {
      await api.post("/inquiries", {
        kind: "landowner",
        name: v.name,
        phone: v.phone,
        email: v.email || null,
        message: v.message,
        website: v.website,
        landDetails: { location: v.location, sizeKatha: v.sizeKatha, roadWidth: v.roadWidth },
      });
      setSent(true);
      reset();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  return (
    <>
      <section className="border-b border-line bg-mist">
        <div className="container-x grid gap-8 pt-16 pb-14 lg:grid-cols-12 lg:pt-24">
          <h1 className="text-5xl leading-[1.05] text-ink sm:text-6xl lg:col-span-7">Develop your land with Arkhaven</h1>
          <p className="text-lg leading-relaxed text-charcoal/80 lg:col-span-5 lg:pt-3">
            If you own 5 katha or more in Dhaka or Sylhet, we can build on it under a joint-venture agreement. You keep a share of the finished apartments; we handle design, approvals, construction and sales.
          </p>
        </div>
      </section>
      <section className="container-x grid gap-16 py-16 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-5">
          <h2 className="text-3xl text-ink">How a joint venture works</h2>
          <ol className="mt-8 space-y-7">
            {steps.map((s, i) => (
              <li key={s.t} className="grid grid-cols-[40px_1fr] gap-3">
                <span className="font-display text-2xl text-brass tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="font-sans text-lg font-bold tracking-normal text-charcoal">{s.t}</h3>
                  <p className="mt-1 text-slate">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="border border-line p-6 sm:p-8">
            <h2 className="font-sans text-xl font-bold tracking-normal text-ink">Request a land assessment</h2>
            <p className="mt-1 mb-6 text-sm text-slate">Free and without obligation. Our land team will call you to arrange a visit.</p>
            {sent ? (
              <div role="status" className="flex flex-col items-start gap-3 rounded-md border border-success/30 bg-success/5 p-6">
                <CheckCircle2 className="size-6 text-success" />
                <p className="font-bold">Thank you. Our land team will call you within two working days.</p>
                <Button variant="secondary" size="sm" onClick={() => setSent(false)}>
                  Submit another plot
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" required error={errors.name?.message} htmlFor="lo-name">
                  <Input id="lo-name" autoComplete="name" invalid={!!errors.name} {...register("name")} />
                </Field>
                <Field label="Phone" required error={errors.phone?.message} htmlFor="lo-phone">
                  <Input id="lo-phone" type="tel" autoComplete="tel" invalid={!!errors.phone} {...register("phone")} />
                </Field>
                <Field label="Email" error={errors.email?.message} className="sm:col-span-2" htmlFor="lo-email">
                  <Input id="lo-email" type="email" invalid={!!errors.email} {...register("email")} />
                </Field>
                <Field label="Land location" required error={errors.location?.message} className="sm:col-span-2" htmlFor="lo-loc" hint="Area, road and plot number if known">
                  <Input id="lo-loc" invalid={!!errors.location} {...register("location")} />
                </Field>
                <Field label="Size (katha)" required error={errors.sizeKatha?.message} htmlFor="lo-size">
                  <Input id="lo-size" inputMode="decimal" invalid={!!errors.sizeKatha} {...register("sizeKatha")} />
                </Field>
                <Field label="Front road width" htmlFor="lo-road" hint="e.g. 30 ft">
                  <Input id="lo-road" {...register("roadWidth")} />
                </Field>
                <Field label="Anything else we should know" className="sm:col-span-2" htmlFor="lo-msg">
                  <Textarea id="lo-msg" rows={3} {...register("message")} />
                </Field>
                <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...register("website")} />
                {err && (
                  <p role="alert" className="text-sm text-danger sm:col-span-2">
                    {err}
                  </p>
                )}
                <div className="sm:col-span-2">
                  <Button type="submit" size="lg" loading={isSubmitting}>
                    Request assessment
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
