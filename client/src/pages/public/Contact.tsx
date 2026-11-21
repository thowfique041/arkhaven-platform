import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { usePublicProjects, useSettings } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { InquiryForm } from "@/components/site/InquiryForm";
import { whatsappLink } from "@/utils/format";

export default function Contact() {
  useDocumentTitle("Contact", "Talk to an Arkhaven advisor, book a site visit or visit our office in Banani, Dhaka.");
  const { data: s } = useSettings();
  const { data: projects } = usePublicProjects();
  const c = s?.contact ?? {};
  const wa = whatsappLink(c.whatsapp, "Hello Arkhaven, I'd like to book a site visit.");
  const map = c.mapEmbedUrl || (c.address ? `https://maps.google.com/maps?q=${encodeURIComponent(c.address)}&z=15&output=embed` : null);

  const rows = [
    c.phone && { icon: Phone, label: "Call", value: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    wa && { icon: MessageCircle, label: "WhatsApp", value: "Message an advisor", href: wa },
    c.email && { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
    c.address && { icon: MapPin, label: "Office", value: c.address },
    c.officeHours && { icon: Clock, label: "Hours", value: c.officeHours },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <>
      <section className="border-b border-line bg-mist">
        <div className="container-x pt-16 pb-12 lg:pt-20">
          <h1 className="text-5xl text-ink sm:text-6xl">Talk to an advisor</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate">Ask about prices, payment schedules or a site visit. We reply to every inquiry within one working day.</p>
        </div>
      </section>
      <section className="container-x grid gap-14 py-16 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-5">
          <ul className="divide-y divide-line border-y border-line">
            {rows.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex gap-4 py-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-brass" />
                <div>
                  <p className="text-[13px] text-slate">{label}</p>
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener" className="text-lg font-semibold text-ink hover:text-brass-dark">
                      {value}
                    </a>
                  ) : (
                    <p className="text-lg text-charcoal">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-7">
          <h2 className="mb-6 font-sans text-xl font-bold tracking-normal text-ink">Send us a message</h2>
          <InquiryForm projects={projects?.data} />
        </div>
      </section>
      {map && <iframe title="Arkhaven head office map" src={map} className="block h-[420px] w-full border-0 border-t border-line" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
    </>
  );
}
