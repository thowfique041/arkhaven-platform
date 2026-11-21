import clsx from "clsx";

/** Inline brand mark (same geometry as /assets/brand SVGs) so it can inherit theme colours. */
export function Mark({ className, gable = "currentColor", door = "#B08D57" }: { className?: string; gable?: string; door?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M7 57 L32 7.5 L57 57 L50.9 57 L32 19.6 L13.1 57 Z" fill={gable} />
      <path d="M23.5 57 V41 A8.5 8.5 0 0 1 40.5 41 V57" fill="none" stroke={door} strokeWidth="5.5" />
    </svg>
  );
}

export function Logo({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  // "dark" = for light backgrounds (dark lettering); "light" = for dark backgrounds.
  const src = variant === "light" ? "/assets/brand/arkhaven-logo-dark.svg" : "/assets/brand/arkhaven-logo-primary.svg";
  return <img src={src} alt="Arkhaven Properties" className={clsx("h-9 w-auto", className)} width={196} height={36} />;
}
