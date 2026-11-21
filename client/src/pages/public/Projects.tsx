import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { usePublicProjects } from "@/hooks/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ProjectCard } from "@/components/site/ProjectCard";
import { Button, Input, Select } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/data";
import { projectStatusLabel, projectTypeLabel } from "@/utils/format";
import { useEffect, useState } from "react";

export default function Projects() {
  useDocumentTitle("Projects", "Residential and commercial projects by Arkhaven Properties in Dhaka and Sylhet, with live availability and construction status.");
  const [params, setParams] = useSearchParams();
  const filters = {
    status: params.get("status") ?? undefined,
    type: params.get("type") ?? undefined,
    area: params.get("area") ?? undefined,
    search: params.get("search") ?? undefined,
  };
  const [search, setSearch] = useState(filters.search ?? "");
  const { data, isLoading, isError, error, refetch, isFetching } = usePublicProjects(filters);
  const areas = (data?.meta?.areas as string[] | undefined) ?? [];

  // Debounced search into the URL so results are shareable.
  useEffect(() => {
    const t = setTimeout(() => set("search", search.trim() || undefined), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function set(key: string, value?: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }
  const active = Object.values(filters).some(Boolean);

  return (
    <>
      <section className="border-b border-line bg-mist">
        <div className="container-x pt-16 pb-12 lg:pt-20">
          <h1 className="max-w-3xl text-5xl leading-[1.05] text-ink sm:text-6xl">Projects</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate">Homes and workplaces we are building or have completed. Availability and construction stage are updated by our site team.</p>
        </div>
      </section>

      <section className="container-x py-10">
        <form role="search" className="grid gap-3 border-b border-line pb-8 sm:grid-cols-2 lg:grid-cols-[1fr_200px_180px_200px_auto]" onSubmit={(e) => e.preventDefault()}>
          <label className="relative">
            <span className="sr-only">Search projects</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
            <Input className="pl-9" placeholder="Search by name or area" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <Select aria-label="Status" value={filters.status ?? ""} onChange={(e) => set("status", e.target.value)}>
            <option value="">Any status</option>
            {Object.entries(projectStatusLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select aria-label="Property type" value={filters.type ?? ""} onChange={(e) => set("type", e.target.value)}>
            <option value="">Any type</option>
            {Object.entries(projectTypeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select aria-label="Location" value={filters.area ?? ""} onChange={(e) => set("area", e.target.value)}>
            <option value="">Any location</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            disabled={!active}
            onClick={() => {
              setSearch("");
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            Clear filters
          </Button>
        </form>

        <p className="mt-6 flex items-center gap-2 text-sm text-slate" aria-live="polite">
          <SlidersHorizontal className="size-4" />
          {isLoading ? "Loading projects" : `${data?.meta.total ?? 0} project${data?.meta.total === 1 ? "" : "s"}${active ? " match your filters" : ""}`}
          {isFetching && !isLoading && <span className="text-slate/60">(updating)</span>}
        </p>

        {isError ? (
          <div className="mt-8">
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          </div>
        ) : (
          <div className="mt-8 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {isLoading &&
              [0, 1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="aspect-[4/3] w-full" />
                  <Skeleton className="mt-5 h-6 w-2/3" />
                </div>
              ))}
            {data?.data.map((p) => <ProjectCard key={p._id} p={p} />)}
          </div>
        )}
        {!isLoading && !isError && data?.data.length === 0 && (
          <EmptyState
            title="No projects match these filters"
            body="Try a different location or status, or clear the filters to see everything."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}
