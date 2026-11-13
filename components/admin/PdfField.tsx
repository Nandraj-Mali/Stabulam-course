"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Uploads a PDF straight to the private "resources" bucket (admin-only policy). */
export function PdfField({ initialPath, initialName, initialSize }: { initialPath?: string | null; initialName?: string | null; initialSize?: number | null }) {
  const supabase = useRef(createClient()).current;
  const [path, setPath] = useState(initialPath ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [size, setSize] = useState<number>(initialSize ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f?: File) {
    if (!f) return;
    setErr(null);
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setErr("Please upload a PDF file.");
    if (f.size > 50 * 1024 * 1024) return setErr("PDF must be under 50 MB.");
    setBusy(true);
    const safe = f.name.replace(/[^\w.\-]+/g, "_");
    const p = `bonuses/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("resources").upload(p, f, { contentType: "application/pdf", upsert: false });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (error) return setErr(error.message);
    setPath(p);
    setName(f.name);
    setSize(f.size);
  }

  return (
    <div>
      <input type="hidden" name="file_path" value={path} />
      <input type="hidden" name="file_name" value={name} />
      <input type="hidden" name="file_size" value={size || ""} />
      {path ? (
        <div className="flex items-center gap-3 rounded-xl border border-line p-3">
          <span className="grid h-12 w-10 shrink-0 place-items-center rounded-md bg-brand text-white [clip-path:polygon(0_0,72%_0,100%_22%,100%_100%,0_100%)]">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{name || path.split("/").pop()}</p>
            <p className="text-xs text-muted">{size ? `${(size / 1048576).toFixed(1)} MB` : "PDF"} · stored privately</p>
          </div>
          <button type="button" onClick={() => input.current?.click()} className="btn-outline text-sm" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Replace
          </button>
          <button type="button" onClick={() => { setPath(""); setName(""); setSize(0); }} className="rounded-md p-2 text-brand hover:bg-brand-soft" title="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void onFile(e.dataTransfer.files?.[0]); }}
          onClick={() => input.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${drag ? "border-brand bg-brand-soft" : "border-line hover:border-ink"}`}
        >
          {busy ? <Loader2 className="h-7 w-7 animate-spin text-brand" /> : <UploadCloud className="h-7 w-7 text-brand" />}
          <span className="font-medium">{busy ? "Uploading…" : "Drop the bonus PDF here or click to upload"}</span>
          <span className="text-xs text-muted">PDF up to 50 MB · only learners who complete the course can download it</span>
        </label>
      )}
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      {err && <p className="mt-2 rounded-lg bg-brand-soft px-3 py-1.5 text-xs text-brand-dark">{err}</p>}
    </div>
  );
}
