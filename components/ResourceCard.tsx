import { Download, ExternalLink, FileArchive, FileImage, FileSpreadsheet, FileText, FileVideo, File, Link2, Presentation } from "lucide-react";
import type { SignedResource, ResourceKind } from "@/lib/resources";
import { fmtSize } from "@/lib/resources";

const META: Record<ResourceKind, { icon: typeof File; label: string; tone: string }> = {
  pdf: { icon: FileText, label: "PDF", tone: "bg-brand text-white" },
  doc: { icon: FileText, label: "DOC", tone: "bg-ink text-white" },
  sheet: { icon: FileSpreadsheet, label: "SHEET", tone: "bg-ink text-white" },
  slides: { icon: Presentation, label: "SLIDES", tone: "bg-brand text-white" },
  image: { icon: FileImage, label: "IMAGE", tone: "bg-ink text-white" },
  video: { icon: FileVideo, label: "VIDEO", tone: "bg-ink text-white" },
  zip: { icon: FileArchive, label: "ZIP", tone: "bg-ink text-white" },
  link: { icon: Link2, label: "LINK", tone: "bg-cream text-ink" },
  file: { icon: File, label: "FILE", tone: "bg-ink text-white" },
};

export function ResourceCard({ r, caption }: { r: SignedResource; caption?: string }) {
  const m = META[r.kind];
  const Icon = m.icon;
  const external = r.kind === "link";
  return (
    <a
      href={r.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-ink hover:shadow-lg hover:shadow-black/5"
    >
      {/* folded-corner file tile */}
      <div className={`relative grid h-14 w-12 shrink-0 place-items-center rounded-lg ${m.tone} [clip-path:polygon(0_0,72%_0,100%_22%,100%_100%,0_100%)]`}>
        <Icon className="h-5 w-5" />
        <span className="absolute bottom-1 text-[8px] font-bold tracking-wider opacity-90">{m.label}</span>
        <span className="absolute right-0 top-0 h-3 w-3 rounded-bl-md bg-white/40" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold group-hover:text-brand">{r.label}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {[caption, fmtSize(r.size)].filter(Boolean).join(" · ") || (external ? "External link" : "Download")}
        </p>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream transition group-hover:bg-brand group-hover:text-white">
        {external ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      </span>
    </a>
  );
}
