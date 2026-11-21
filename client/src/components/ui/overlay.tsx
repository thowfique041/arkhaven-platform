import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import clsx from "clsx";
import { Button } from "./primitives";

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  dismissible?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => panel.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose, dismissible]);

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-ink-900/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={dismissible ? onClose : undefined} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={clsx("relative flex max-h-[92vh] w-full flex-col rounded-t-md bg-paper shadow-2xl sm:rounded-md", widths[size])}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h2 id="modal-title" className="font-sans text-lg font-bold tracking-normal">
                  {title}
                </h2>
                {description && <p className="mt-0.5 text-sm text-slate">{description}</p>}
              </div>
              {dismissible && (
                <button onClick={onClose} className="-mr-2 rounded-xs p-1.5 text-slate hover:bg-mist hover:text-ink" aria-label="Close">
                  <X className="size-5" />
                </button>
              )}
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-mist/50 px-6 py-3.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------------- Confirm ---------------- */
interface ConfirmOpts {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
}
type ConfirmFn = (o: ConfirmOpts) => Promise<boolean>;

/* ---------------- Toasts ---------------- */
type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}
interface FeedbackCtx {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: ConfirmFn;
}
const Ctx = createContext<FeedbackCtx | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);
  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => setPending({ ...o, resolve })), []);
  const close = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <Modal
        open={!!pending}
        onClose={() => close(false)}
        title={pending?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={pending?.danger ? "danger" : "primary"} onClick={() => close(true)}>
              {pending?.confirmLabel}
            </Button>
          </>
        }
      >
        <div className="text-sm leading-relaxed text-charcoal">{pending?.message}</div>
      </Modal>
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
          <AnimatePresence>
            {toasts.map((t) => {
              const Icon = icons[t.tone];
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  className={clsx(
                    "pointer-events-auto flex items-start gap-3 rounded-md border bg-paper px-4 py-3 text-sm shadow-lg",
                    t.tone === "error" ? "border-danger/30" : t.tone === "success" ? "border-success/30" : "border-line",
                  )}
                >
                  <Icon className={clsx("mt-0.5 size-4 shrink-0", t.tone === "error" ? "text-danger" : t.tone === "success" ? "text-success" : "text-info")} />
                  <p className="flex-1">{t.message}</p>
                  <button className="text-slate hover:text-ink" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">
                    <X className="size-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFeedback must be used inside FeedbackProvider");
  return c;
}
