import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, errorMessage } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button, Card, Checkbox, Field, Input } from "@/components/ui/primitives";
import { useFeedback } from "@/components/ui/overlay";
import { ChangePasswordForm } from "@/pages/public/ChangePassword";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { User } from "@/types";

export default function AdminSettings() {
  useDocumentTitle("My settings");
  const { user, setSession, customer } = useAuth();
  const { toast } = useFeedback();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [prefs, setPrefs] = useState(user?.notificationPrefs ?? { newLeadEmail: true, paymentSubmitted: true, followUpReminders: true });
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
      if (user.notificationPrefs) setPrefs(user.notificationPrefs);
    }
  }, [user]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<{ user: User; customer: typeof customer }>("/auth/me", body),
    onSuccess: (s) => {
      setSession(s);
      toast("Settings saved");
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <>
      <PageHeader title="My settings" description={`Signed in as ${user?.email}`} />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <div className="space-y-4">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Email" hint="Ask a Super Admin to change your sign-in email.">
              <Input value={user?.email ?? ""} disabled />
            </Field>
            <Button loading={save.isPending} disabled={name.trim().length < 2} onClick={() => save.mutate({ name: name.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) })}>
              Save profile
            </Button>
          </div>
        </Card>
        <Card title="Change password">
          <ChangePasswordForm />
        </Card>
        <Card title="Notifications" className="lg:col-span-2">
          <p className="mb-4 text-sm text-slate">Which events should be highlighted for you. Email delivery requires an email provider to be configured on the server.</p>
          <div className="space-y-4">
            <Checkbox label="New website inquiries and leads" checked={prefs.newLeadEmail} onChange={(v) => setPrefs({ ...prefs, newLeadEmail: v })} />
            <Checkbox label="Payments waiting for verification" checked={prefs.paymentSubmitted} onChange={(v) => setPrefs({ ...prefs, paymentSubmitted: v })} />
            <Checkbox label="Follow-up reminders" checked={prefs.followUpReminders} onChange={(v) => setPrefs({ ...prefs, followUpReminders: v })} />
            <Button variant="secondary" loading={save.isPending} onClick={() => save.mutate({ notificationPrefs: prefs })}>
              Save notification settings
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
