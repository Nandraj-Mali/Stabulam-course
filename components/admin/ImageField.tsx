"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Uploads an image straight from the browser to the public-assets bucket (admin-only policy)
 * and keeps the resulting public URL in a hidden input named `name`.
 */
export function ImageField({
  name,
  initial,
  folder,
  hint,
  previewClass = "h-20 w-32",
  dark = false,
}: {
  name: string;
  initial?: string | null;
  folder: string;
  hint?: string;
  previewClass?: string;
  dark?: boolean;
}) {
  const supabase = useRef(createClient()).current;
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f?: File) {
    if (!f) return;
    setErr(null);
    if (!f.type.startsWith("image/")) return setErr("Please choose an image file (PNG, JPG, WEBP).");
    if (f.size > 10 * 1024 * 1024) return setErr("Image must be under 10 MB.");
    setBusy(true);
    const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(path, f, { contentType: f.type, upsert: false });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (error) return setErr(error.message);
    setUrl(supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-wrap items-center gap-4">
        <div className={`grid shrink-0 place-items-center overflow-hidden rounded-lg border border-line ${dark ? "bg-ink" : "dots-bg"} ${previewClass}`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="btn-outline text-sm">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {url ? "Replace" : "Upload"}
          </button>
          {url && (
            <button type="button" onClick={() => setUrl("")} className="btn text-sm text-brand hover:bg-brand-soft">
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {err && <p className="mt-1.5 rounded-lg bg-brand-soft px-3 py-1.5 text-xs text-brand-dark">{err}</p>}
      {url && <p className="mt-1.5 text-xs text-muted">Click <b>Save</b> below to apply.</p>}
    </div>
  );
}
