import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Resource } from "@/lib/types";

export type SignedResource = Resource & { href: string; kind: ResourceKind };
export type ResourceKind = "pdf" | "doc" | "sheet" | "slides" | "image" | "video" | "zip" | "link" | "file";

export function resourceKind(r: Resource): ResourceKind {
  if (!r.path && r.url) {
    if (/\.pdf($|\?)/i.test(r.url)) return "pdf";
    return "link";
  }
  const name = (r.path ?? "").toLowerCase();
  const t = (r.type ?? "").toLowerCase();
  if (t.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (/sheet|excel|csv/.test(t) || /\.(xlsx?|csv)$/.test(name)) return "sheet";
  if (/presentation|powerpoint/.test(t) || /\.(pptx?|key)$/.test(name)) return "slides";
  if (/word|document|text/.test(t) || /\.(docx?|txt|rtf)$/.test(name)) return "doc";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (/zip|compressed/.test(t) || /\.(zip|rar|7z)$/.test(name)) return "zip";
  return "file";
}

/** Turns stored resources into downloadable links. Private files get signed URLs valid for `ttl` seconds. */
export async function signResources(list: Resource[] | null | undefined, ttl = 60 * 60): Promise<SignedResource[]> {
  const items = (list ?? []).filter((r) => r && (r.path || r.url));
  if (!items.length) return [];
  const paths = items.filter((r) => r.path).map((r) => r.path!);
  const signed = new Map<string, string>();
  if (paths.length) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("resources").createSignedUrls(paths, ttl, { download: true });
    for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }
  return items
    .map((r) => ({ ...r, href: r.path ? signed.get(r.path) ?? "" : r.url!, kind: resourceKind(r) }))
    .filter((r) => r.href);
}

export function fmtSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
