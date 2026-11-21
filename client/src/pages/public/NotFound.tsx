import { ButtonLink } from "@/components/ui/primitives";
import { Mark } from "@/components/site/Logo";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <section className="container-x flex min-h-[60vh] flex-col items-start justify-center py-24">
      <Mark className="size-12 text-ink" />
      <h1 className="mt-8 text-5xl text-ink">This page isn't here</h1>
      <p className="mt-4 max-w-lg text-lg text-slate">The link may be out of date, or the project may have been renamed. Try the projects list instead.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/projects">Browse projects</ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Go to homepage
        </ButtonLink>
      </div>
    </section>
  );
}
