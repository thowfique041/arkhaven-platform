import { useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import type { Credentials } from "@/types";
import { Button } from "./primitives";
import { Modal } from "./overlay";

/**
 * Shows freshly issued credentials exactly once. They are not stored anywhere on the
 * client and the server never returns them again.
 */
export function CredentialsDialog({ credentials, who, onClose }: { credentials: Credentials | null; who?: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);
  if (!credentials) return null;
  const portal = `${window.location.origin}/login`;
  const text = `Arkhaven customer portal\n${portal}\nUsername: ${credentials.username}\nTemporary password: ${credentials.temporaryPassword}\nYou will be asked to set a new password when you first sign in.`;

  return (
    <Modal
      open
      dismissible={false}
      onClose={onClose}
      title="Login details created"
      description={who ? `For ${who}` : undefined}
      size="sm"
      footer={
        <Button
          disabled={!ack}
          onClick={() => {
            setAck(false);
            setCopied(false);
            onClose();
          }}
        >
          Done
        </Button>
      }
    >
      <div className="flex items-start gap-3 rounded-xs border border-warning/30 bg-warning/10 p-3 text-[13px] text-charcoal">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <p>This password is shown only once. Share it with the person privately (in person, by phone or a direct message), never in a group chat or email thread with others.</p>
      </div>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xs border border-line bg-mist p-4 font-mono text-sm">
        <dt className="font-sans text-slate">Sign-in page</dt>
        <dd className="break-all">{portal}</dd>
        <dt className="font-sans text-slate">Username</dt>
        <dd className="font-semibold">{credentials.username}</dd>
        <dt className="font-sans text-slate">Password</dt>
        <dd className="font-semibold tracking-wide">{credentials.temporaryPassword}</dd>
      </dl>
      <Button
        className="mt-3 w-full"
        variant="secondary"
        icon={copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy login details"}
      </Button>
      <label className="mt-4 flex items-start gap-2 text-[13px]">
        <input type="checkbox" className="mt-0.5 accent-ink" checked={ack} onChange={(e) => setAck(e.target.checked)} />I have saved or shared these details. I understand they cannot be shown again.
      </label>
    </Modal>
  );
}
