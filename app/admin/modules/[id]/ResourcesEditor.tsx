"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, File, Link2, Loader2, Trash2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Resource } from "@/lib/types";

function size(bytes?: number) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

export function ResourcesEditor({ initial, folder }: { initial: Resource[]; folder: string }) {
  const supabase = useRef(createClient()).current;
  const [items, setItems] = useState<Resource[]>(initial ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    for (const f of Array.from(files)) {
      if (f.size > 50 * 1024 * 1024) {
        setErr(`${f.name} is larger than 50 MB`);
        continue;
      }
      setBusy(f.name);
      const safe = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${folder}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("resources").upload(path, f, { contentType: f.type || undefined, upsert: false });
      if (error) {
        setErr(`${f.name}: ${error.message}`);
        continue;
      }
      const label = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      setItems((x) => [...x, { label, path, type: f.type, size: f.size }]);
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(i: number) {
    const r = items[i];
    if (r.path) await supabase.storage.from("resources").remove([r.path]);
    setItems((x) => x.filter((_, j) => j !== i));
  }

  function move(i: number, d: -1 | 1) {
    setItems((x) => {
      const y = [...x];
      const j = i + d;
      if (j < 0 || j >= y.length) return y;
      [y[i], y[j]] = [y[j], y[i]];
      return y;
    });
  }

  function addLink() {
    if (!linkUrl.trim()) return;
    setItems((x) => [...x, { label: linkLabel.trim() || linkUrl.trim(), url: linkUrl.trim() }]);
    setLinkLabel("");
    setLinkUrl("");
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="resources_json" value={JSON.stringify(items)} />

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void upload(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          drag ? "border-brand bg-brand-soft" : "border-line hover:border-ink"
        }`}
      >
        {busy ? <Loader2 className="h-7 w-7 animate-spin text-brand" /> : <UploadCloud className="h-7 w-7 text-brand" />}
        <span className="font-medium">{busy ? `Uploading ${busy}…` : "Drop files here or click to upload"}</span>
        <span className="text-xs text-muted">PDF, Word, Excel, PowerPoint, images, ZIP · up to 50 MB each · stored privately</span>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      </label>
      {err && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">{err}</p>}

      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {items.map((r, i) => (
            <li key={(r.path ?? r.url ?? "") + i} className="flex items-center gap-3 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cream">
                {r.path ? <File className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <input
                  value={r.label}
                  onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
                  className="w-full rounded-md border border-transparent px-1.5 py-1 text-sm font-medium outline-none hover:border-line focus:border-ink"
                />
                <p className="truncate px-1.5 text-xs text-muted">{r.path ? `${r.path.split("/").pop()} · ${size(r.size)}` : r.url}</p>
              </div>
              <button type="button" onClick={() => move(i, -1)} className="rounded-md p-1.5 text-muted hover:bg-cream" title="Move up"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => move(i, 1)} className="rounded-md p-1.5 text-muted hover:bg-cream" title="Move down"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => void remove(i)} className="rounded-md p-1.5 text-brand hover:bg-brand-soft" title="Remove"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Link label (optional)" className="input" />
        <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Or add an external link https://…" className="input" />
        <button type="button" onClick={addLink} className="btn-outline">Add link</button>
      </div>
      <p className="text-xs text-muted">Files upload immediately. Click <b>Save module</b> to publish the list to learners.</p>
    </div>
  );
}
