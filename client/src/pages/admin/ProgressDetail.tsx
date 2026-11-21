import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, CircleDot, Megaphone, Trash2 } from "lucide-react";
import clsx from "clsx";
import { api, errorMessage } from "@/services/api";
import type { ConstructionProgress, Img } from "@/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { ErrorState, ProgressBar, Skeleton } from "@/components/ui/data";
import { ImageListEditor } from "@/components/ui/editors";
import { useFeedback } from "@/components/ui/overlay";
import { formatDate, imgSrc, relativeTime, toDateInput } from "@/utils/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ProgressDetail() {
  const { projectId } = useParams();
  const qc = useQueryClient();
  const { toast, confirm } = useFeedback();
  const { data: p, isLoading, isError, error, refetch } = useQuery({ queryKey: ["progress", projectId], queryFn: () => api.get<ConstructionProgress>(`/progress/project/${projectId}`) });
  const projectName = p && typeof p.project === "object" ? p.project.name : "";
  useDocumentTitle(projectName ? `Construction: ${projectName}` : "Construction");

  const [stage, setStage] = useState(0);
  const [percent, setPercent] = useState("0");
  const [handover, setHandover] = useState("");
  const [stageNote, setStageNote] = useState("");
  useEffect(() => {
    if (p) {
      setStage(p.currentStage);
      setPercent(String(p.percent));
      setHandover(toDateInput(p.expectedHandover));
    }
  }, [p]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<Img[]>([]);
  const [announce, setAnnounce] = useState(true);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["progress", projectId] });
    qc.invalidateQueries({ queryKey: ["progress-list"] });
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
  };
  const saveStatus = useMutation({
    mutationFn: () => {
      const pct = Number(percent);
      return api.patch(`/progress/project/${projectId}`, {
        ...(stage !== p?.currentStage ? { currentStage: stage, stageNote: stageNote || undefined } : {}),
        ...(pct !== p?.percent && !Number.isNaN(pct) ? { percent: pct } : {}),
        expectedHandover: handover || null,
      });
    },
    onSuccess: () => {
      toast("Construction status saved");
      setStageNote("");
      refresh();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const post = useMutation({
    mutationFn: async () => {
      await api.post(`/progress/project/${projectId}/updates`, { title, description: desc || undefined, photos: photos.map(({ url, publicId, caption }) => ({ url, publicId: publicId ?? undefined, caption: caption ?? undefined })) });
      if (announce) await api.post("/announcements", { title: `${projectName}: ${title}`, body: desc || title, project: projectId, published: true });
    },
    onSuccess: () => {
      toast(announce ? "Update posted and owners notified" : "Update posted");
      setTitle("");
      setDesc("");
      setPhotos([]);
      refresh();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/progress/project/${projectId}/updates/${id}`),
    onSuccess: () => {
      toast("Update removed");
      refresh();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (isLoading || !p) return <Skeleton className="h-96" />;
  const pctNum = Number(percent);
  const pctInvalid = Number.isNaN(pctNum) || pctNum < 0 || pctNum > 100;
  const dirty = stage !== p.currentStage || pctNum !== p.percent || handover !== toDateInput(p.expectedHandover);

  return (
    <>
      <Link to="/admin/progress" className="mb-3 inline-flex items-center gap-1 text-sm text-slate hover:text-ink">
        <ChevronLeft className="size-4" /> Construction
      </Link>
      <PageHeader title={projectName} description={`Last updated ${relativeTime(p.updatedAt)}`} />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card title="Current status" className="xl:col-span-2">
          <p className="mb-3 text-sm text-slate">Pick the stage the site is in now. Earlier stages are marked complete automatically.</p>
          <ol className="divide-y divide-line rounded-xs border border-line" role="radiogroup" aria-label="Construction stage">
            {p.stages.map((s) => {
              const sel = s.key === stage;
              const done = s.key < stage || (s.key === stage && s.key === p.stages.length - 1);
              return (
                <li key={s.key}>
                  <button role="radio" aria-checked={sel} onClick={() => setStage(s.key)} className={clsx("flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm", sel ? "bg-ink text-paper" : "hover:bg-mist")}>
                    {done ? (
                      <span className={clsx("flex size-5 items-center justify-center rounded-full", sel ? "bg-paper text-ink" : "bg-success text-paper")}>
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    ) : sel ? (
                      <CircleDot className="size-5 text-brass-light" />
                    ) : (
                      <span className="size-5 rounded-full border-2 border-line" />
                    )}
                    <span className="flex-1">{s.name}</span>
                    {s.completedAt && !sel && <span className="text-xs text-slate">{formatDate(s.completedAt)}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          {stage !== p.currentStage && (
            <Field label="Note for owners about this stage change" className="mt-4">
              <Textarea rows={2} value={stageNote} onChange={(e) => setStageNote(e.target.value)} placeholder="e.g. Seventh-floor slab cast on 12 Nov" />
            </Field>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Overall progress %" error={pctInvalid ? "0 to 100" : undefined} hint={stage !== p.currentStage ? "Leave as is to use the stage default" : undefined}>
              <Input inputMode="decimal" value={percent} invalid={pctInvalid} onChange={(e) => setPercent(e.target.value)} />
            </Field>
            <Field label="Expected handover">
              <Input type="date" value={handover} onChange={(e) => setHandover(e.target.value)} />
            </Field>
          </div>
          <ProgressBar value={pctInvalid ? 0 : pctNum} tone="brass" className="mt-4 h-2" />
          <Button className="mt-4 w-full" disabled={!dirty || pctInvalid} loading={saveStatus.isPending} onClick={() => saveStatus.mutate()}>
            Save status
          </Button>
        </Card>

        <div className="space-y-6 xl:col-span-3">
          <Card title="Post a site update">
            <div className="space-y-4">
              <Field label="Title" required>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Brickwork reaches level 6" />
              </Field>
              <Field label="Details">
                <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </Field>
              <Field label="Photos">
                <ImageListEditor value={photos} onChange={setPhotos} folder="progress" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-ink" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
                <Megaphone className="size-4 text-slate" /> Also post as an announcement to this project's owners
              </label>
              <Button disabled={title.trim().length < 2} loading={post.isPending} onClick={() => post.mutate()}>
                Post update
              </Button>
            </div>
          </Card>

          <Card title={`Published updates (${p.updates.length})`}>
            {p.updates.length === 0 && <p className="text-sm text-slate">No updates yet.</p>}
            <ol className="space-y-5">
              {p.updates.map((u) => (
                <li key={u._id} className="border-b border-line pb-5 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{u.title}</p>
                      <p className="text-xs text-slate">
                        {formatDate(u.createdAt)}
                        {u.percent !== undefined && `, ${Math.round(u.percent)}%`}
                      </p>
                    </div>
                    <button
                      className="rounded-xs p-1.5 text-slate hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete update ${u.title}`}
                      onClick={async () => {
                        if (await confirm({ title: "Delete this update?", message: "It will disappear from owners' portals.", confirmLabel: "Delete update", danger: true })) del.mutate(u._id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {u.description && <p className="mt-2 text-sm whitespace-pre-wrap text-charcoal/85">{u.description}</p>}
                  {u.photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {u.photos.map((ph) => (
                        <img key={ph.url} src={imgSrc(ph.url, 300)} alt={ph.caption ?? u.title} className="aspect-[4/3] w-full rounded-xs object-cover" />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
