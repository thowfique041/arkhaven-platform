import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Flat } from "@/types";
import { useProjectOptions } from "@/hooks/queries";
import { Field, Select } from "@/components/ui/primitives";
import { flatStatusLabel, formatBDTShort, sqft } from "@/utils/format";

/** Project + unit selects. `onlyOpen` limits units to ones that can still be booked. */
export function ProjectFlatPicker({
  project,
  flat,
  onProject,
  onFlat,
  onlyOpen = true,
  includeFlatId,
  projectLabel = "Project",
  flatLabel = "Unit",
  errors,
  required,
}: {
  project: string;
  flat: string;
  onProject: (id: string) => void;
  onFlat: (id: string, f?: Flat) => void;
  onlyOpen?: boolean;
  includeFlatId?: string;
  projectLabel?: string;
  flatLabel?: string;
  errors?: { project?: string; flat?: string };
  required?: boolean;
}) {
  const { data: projects } = useProjectOptions();
  const { data: flats, isFetching } = useQuery({
    queryKey: ["flat-options", project],
    queryFn: () => api.get<Flat[]>("/flats", { project, limit: 500 }),
    enabled: !!project,
  });
  const options = (flats ?? []).filter((f) => !onlyOpen || ((f.status === "available" || f.status === "reserved") && !f.customer) || f._id === includeFlatId);
  return (
    <>
      <Field label={projectLabel} error={errors?.project} required={required}>
        <Select
          value={project}
          invalid={!!errors?.project}
          onChange={(e) => {
            onProject(e.target.value);
            onFlat("");
          }}
        >
          <option value="">Select project</option>
          {projects?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={flatLabel} error={errors?.flat} hint={project && !isFetching && options.length === 0 ? "No open units in this project" : undefined} required={required}>
        <Select
          value={flat}
          disabled={!project}
          invalid={!!errors?.flat}
          onChange={(e) =>
            onFlat(
              e.target.value,
              options.find((f) => f._id === e.target.value),
            )
          }
        >
          <option value="">{project ? "Select unit" : "Choose a project first"}</option>
          {options.map((f) => (
            <option key={f._id} value={f._id}>
              {f.unitNumber}, floor {f.floor}, {sqft(f.sizeSqft)}, {formatBDTShort(f.priceMinor)}
              {f.status !== "available" ? ` (${flatStatusLabel[f.status]})` : ""}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
