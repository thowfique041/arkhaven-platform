import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "brass" | "light";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-800 active:bg-ink-900 disabled:bg-ink/40",
  secondary: "border border-line bg-paper text-ink hover:border-ink/40 hover:bg-mist disabled:text-slate/60",
  ghost: "text-ink hover:bg-mist disabled:text-slate/60",
  danger: "bg-danger text-paper hover:bg-danger/90 disabled:bg-danger/40",
  brass: "bg-brass text-ink-900 hover:bg-brass-light disabled:bg-brass/40",
  light: "border border-paper/40 text-paper hover:bg-paper hover:text-ink",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(
    "inline-flex shrink-0 items-center justify-center rounded-xs font-semibold whitespace-nowrap transition-colors duration-150 select-none",
    variants[variant],
    sizes[size],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({ variant = "primary", size = "md", className, children, icon, ...rest }: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={clsx("inline-flex items-center gap-2 text-sm text-slate", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

const tones = {
  neutral: "bg-mist text-slate border-line",
  ink: "bg-ink text-paper border-ink",
  brass: "bg-brass/15 text-brass-dark border-brass/30",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  info: "bg-info/10 text-info border-info/25",
} as const;
export type Tone = keyof typeof tones;
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

export function Field({ label, error, hint, children, required, className, htmlFor }: { label?: string; error?: string; hint?: string; children: ReactNode; required?: boolean; className?: string; htmlFor?: string }) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-charcoal">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-slate">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={clsx("input", invalid && "input-invalid", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ className, invalid, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={clsx("input resize-y", invalid && "input-invalid", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={clsx("input appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9", invalid && "input-invalid", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235B6B66' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  );
});

export function Checkbox({ label, checked, onChange, disabled, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; description?: string }) {
  return (
    <label className={clsx("flex items-start gap-3 text-sm", disabled ? "opacity-60" : "cursor-pointer")}>
      <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-semibold">{label}</span>
        {description && <span className="block text-slate">{description}</span>}
      </span>
    </label>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={clsx("rounded-md border border-line bg-paper", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="font-sans text-[15px] font-bold tracking-normal text-charcoal">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
