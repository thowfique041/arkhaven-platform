import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSettings } from "@/hooks/queries";

export default function Privacy() {
  useDocumentTitle("Privacy");
  const { data: s } = useSettings();
  const company = s?.companyName ?? "Arkhaven Properties Ltd.";
  const sections: [string, string][] = [
    ["What we collect", "When you send an inquiry we store your name, phone number, email (if given) and message. If you buy a property, we also store your booking details, payment records and the documents needed for registration."],
    ["How we use it", "To reply to your inquiry, prepare your agreement, record your payments, issue receipts and keep you informed about construction. We do not sell or rent your information."],
    ["Who can see it", "Only authorised Arkhaven staff. Your customer portal shows your own records to you alone; no other customer can see them."],
    ["How we protect it", "Passwords are stored as one-way hashes, all traffic is encrypted, and every staff action on payment records is logged."],
    ["Your choices", `You can ask us to correct or delete your information at any time by contacting ${s?.contact?.email ?? "our office"}. Records we must keep by law, such as payment receipts, are retained for the required period.`],
  ];
  return (
    <section className="container-x max-w-3xl py-20">
      <h1 className="text-5xl text-ink">Privacy</h1>
      <p className="mt-4 text-slate">How {company} handles your personal information.</p>
      <div className="mt-10 space-y-8">
        {sections.map(([h, b]) => (
          <div key={h}>
            <h2 className="font-sans text-lg font-bold tracking-normal">{h}</h2>
            <p className="mt-2 leading-relaxed text-charcoal/85">{b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
