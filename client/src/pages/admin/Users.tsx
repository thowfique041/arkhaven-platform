import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Plus, Power, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Credentials, User } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge, Button, Field, Input, Select } from "@/components/ui/primitives";
import { ErrorState, Skeleton, TableWrap } from "@/components/ui/data";
import { Modal, useFeedback } from "@/components/ui/overlay";
import { CredentialsDialog } from "@/components/ui/CredentialsDialog";
import { relativeTime } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().regex(/^([+\d][\d\s-]{5,})?$/, "Enter a valid phone number").optional(),
  role: z.enum(["admin", "superadmin"]),
});
type V = z.infer<typeof schema>;

export default function Users() {
  useDocumentTitle("Staff accounts");
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState<{ c: Credentials; who: string } | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["staff"], queryFn: () => api.get<User[]>("/users") });
  const { register, handleSubmit, reset, formState } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { role: "admin" } });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["staff"] });
  const create = useMutation({
    mutationFn: (v: V) => api.post<{ user: User; credentials: Credentials }>("/users", { ...v, phone: v.phone || undefined }),
    onSuccess: (r) => {
      invalidate();
      setAdding(false);
      reset({ name: "", email: "", phone: "", role: "admin" });
      setCreds({ c: r.credentials, who: r.user.name });
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e) => toast(errorMessage(e), "error"),
  });

  return (
    <>
      <PageHeader
        title="Staff accounts"
        description="Admins manage projects, leads, customers and payments. Super Admins can also manage staff."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            Add staff member
          </Button>
        }
      />
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading && <Skeleton className="h-40" />}
      {data && (
        <div className="rounded-md border border-line bg-paper px-5">
          <TableWrap>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => {
                  const self = u._id === me?._id;
                  return (
                    <tr key={u._id}>
                      <td>
                        <p className="font-semibold">
                          {u.name} {self && <span className="text-xs font-normal text-slate">(you)</span>}
                        </p>
                        <p className="text-xs text-slate">{u.email}</p>
                      </td>
                      <td>
                        <Select
                          aria-label={`Role for ${u.name}`}
                          className="h-8 w-36 py-1 text-sm"
                          value={u.role}
                          disabled={self}
                          onChange={(e) => act.mutate(() => api.patch(`/users/${u._id}`, { role: e.target.value }).then(() => toast("Role updated")))}
                        >
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </Select>
                      </td>
                      <td>{u.isActive ? u.mustChangePassword ? <Badge tone="warning">Temporary password</Badge> : <Badge tone="success">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}</td>
                      <td className="whitespace-nowrap text-slate">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : "Never"}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            className="rounded-xs p-2 text-slate hover:bg-mist hover:text-ink"
                            title="Reset password"
                            aria-label={`Reset password for ${u.name}`}
                            onClick={async () => {
                              if (await confirm({ title: `Reset ${u.name}'s password?`, message: "A temporary password will be generated and their sessions ended.", confirmLabel: "Reset password" }))
                                act.mutate(() => api.post<{ credentials: Credentials }>(`/users/${u._id}/reset-password`).then((r) => setCreds({ c: r.credentials, who: u.name })));
                            }}
                          >
                            <KeyRound className="size-4" />
                          </button>
                          <button
                            className="rounded-xs p-2 text-slate hover:bg-mist hover:text-ink disabled:opacity-30"
                            disabled={self}
                            title={u.isActive ? "Deactivate" : "Reactivate"}
                            aria-label={`${u.isActive ? "Deactivate" : "Reactivate"} ${u.name}`}
                            onClick={() => act.mutate(() => api.patch(`/users/${u._id}`, { isActive: !u.isActive }).then(() => toast(u.isActive ? "Account deactivated" : "Account reactivated")))}
                          >
                            <Power className="size-4" />
                          </button>
                          <button
                            className="rounded-xs p-2 text-slate hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                            disabled={self}
                            aria-label={`Delete ${u.name}`}
                            onClick={async () => {
                              if (await confirm({ title: `Delete ${u.name}?`, message: "Their activity history is kept. Deactivating is usually better.", confirmLabel: "Delete account", danger: true }))
                                act.mutate(() => api.del(`/users/${u._id}`).then(() => toast("Account deleted")));
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add staff member"
        description="A temporary password is generated. They must change it at first sign-in."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={handleSubmit((v) => create.mutate(v))}>
              Create account
            </Button>
          </>
        }
      >
        <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Full name" required error={formState.errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label="Work email" required error={formState.errors.email?.message} hint="Used to sign in">
            <Input type="email" {...register("email")} />
          </Field>
          <Field label="Phone" error={formState.errors.phone?.message}>
            <Input type="tel" {...register("phone")} />
          </Field>
          <Field label="Role">
            <Select {...register("role")}>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </Select>
          </Field>
        </form>
      </Modal>
      <CredentialsDialog credentials={creds?.c ?? null} who={creds?.who} onClose={() => setCreds(null)} />
    </>
  );
}
