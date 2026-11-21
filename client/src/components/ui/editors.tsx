import { useRef, useState } from "react";
import { ImagePlus, Link2, Plus, Trash2, Upload, X } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import type { Img } from "@/types";
import { imgSrc, minorToTakaInput, takaToMinor } from "@/utils/format";
import { Button, Input } from "./primitives";
import { useFeedback } from "./overlay";

async function uploadFiles(files: FileList | File[], folder: string): Promise<Img[]> {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append("files", f));
  fd.append("folder", folder);
  return api.upload<Img[]>("/uploads", fd);
}

/** Upload to Cloudinary (if configured) or paste a URL. Both paths store a real URL. */
export function ImageField({ value, onChange, folder = "general", label = "Image" }: { value?: Img | null; onChange: (v: Img | null) => void; folder?: string; label?: string }) {
  const { toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const [img] = await uploadFiles(files, folder);
      onChange(img);
    } catch (e) {
      toast(errorMessage(e), "error");
      setShowUrl(true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value?.url ? (
        <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-xs border border-line bg-mist">
          <img src={imgSrc(value.url, 800)} alt={value.caption ?? label} className="size-full object-cover" />
          <button type="button" onClick={() => onChange(null)} className="absolute top-2 right-2 rounded-xs bg-paper/90 p-1.5 text-danger hover:bg-paper" aria-label={`Remove ${label}`}>
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full max-w-md items-center justify-center rounded-xs border border-dashed border-line bg-mist/60 text-slate">
          <ImagePlus className="size-6" strokeWidth={1.5} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFiles(e.target.files)} />
        <Button size="sm" variant="secondary" loading={busy} onClick={() => fileRef.current?.click()} icon={<Upload className="size-3.5" />}>
          Upload
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowUrl((s) => !s)} icon={<Link2 className="size-3.5" />}>
          Use image URL
        </Button>
      </div>
      {showUrl && (
        <div className="flex max-w-md gap-2">
          <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button
            size="md"
            variant="secondary"
            onClick={() => {
              try {
                new URL(url);
                onChange({ url });
                setUrl("");
                setShowUrl(false);
              } catch {
                toast("Enter a full image URL starting with https://", "error");
              }
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

export function ImageListEditor({ value, onChange, folder = "general" }: { value: Img[]; onChange: (v: Img[]) => void; folder?: string }) {
  const { toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const imgs = await uploadFiles(files, folder);
      onChange([...value, ...imgs]);
      toast(`${imgs.length} image${imgs.length > 1 ? "s" : ""} uploaded`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((img, i) => (
            <li key={img._id ?? img.url + i} className="group relative overflow-hidden rounded-xs border border-line">
              <img src={imgSrc(img.url, 400)} alt={img.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
              <input
                className="w-full border-t border-line px-2 py-1.5 text-xs outline-none focus:bg-mist"
                placeholder="Caption"
                value={img.caption ?? ""}
                onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, caption: e.target.value } : v)))}
              />
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 rounded-xs bg-paper/90 p-1 text-danger" aria-label="Remove image">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <Button size="sm" variant="secondary" loading={busy} onClick={() => fileRef.current?.click()} icon={<Upload className="size-3.5" />}>
          Upload images
        </Button>
        <div className="flex min-w-[260px] flex-1 gap-2">
          <Input className="h-8 py-1 text-sm" placeholder="…or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              try {
                new URL(url);
                onChange([...value, { url }]);
                setUrl("");
              } catch {
                toast("Enter a full image URL starting with https://", "error");
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StringListEditor({ value, onChange, placeholder = "Add item" }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-xs border border-line bg-mist px-2 py-1 text-[13px]">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="text-slate hover:text-danger" aria-label={`Remove ${v}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="secondary" onClick={add} icon={<Plus className="size-4" />}>
          Add
        </Button>
      </div>
    </div>
  );
}

/** Taka input that reports integer poisha (or null when invalid/empty). */
export function MoneyInput({ value, onChange, invalid, id, placeholder = "0" }: { value: number | null | undefined; onChange: (minor: number | null) => void; invalid?: boolean; id?: string; placeholder?: string }) {
  const [text, setText] = useState(minorToTakaInput(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (takaToMinor(text) !== value) setText(minorToTakaInput(value));
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate">৳</span>
      <Input
        id={id}
        inputMode="decimal"
        className="pl-7 tabular-nums"
        invalid={invalid}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          const m = e.target.value.trim() === "" ? null : takaToMinor(e.target.value);
          setLastValue(m);
          onChange(m);
        }}
      />
    </div>
  );
}
