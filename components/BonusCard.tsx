import Image from "next/image";
import { Download, Gift, Lock } from "lucide-react";
import type { Bonus } from "@/lib/types";
import { pad2 } from "@/lib/format";

function size(b?: number | null) {
  if (!b) return "";
  return b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`;
}

export function BonusCard({ b, index, unlocked }: { b: Bonus; index: number; unlocked: boolean }) {
  const hasFile = !!b.file_name;
  const card = (
    <article className={`group relative flex h-full flex-col overflow-hidden rounded-[22px] border bg-white transition ${unlocked ? "border-line hover:-translate-y-1 hover:border-ink hover:shadow-2xl hover:shadow-black/10" : "border-line"}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        {b.thumbnail_url ? (
            <Image src={b.thumbnail_url} alt="" fill sizes="(min-width:1280px) 20vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className={`object-cover transition duration-500 group-hover:scale-105 ${unlocked ? "" : "blur-[2px] grayscale-[40%]"}`} />
        ) : (
          <div className="grid-bg grid h-full w-full place-items-center">
            <Gift className="h-12 w-12 text-brand" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-[11px] font-bold tracking-wider text-white">BONUS {pad2(index)}</span>
        {!unlocked && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-ink shadow-xl"><Lock className="h-5 w-5" /></span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug">{b.title}</h3>
        {b.summary && <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-sm text-muted">{b.summary}</p>}
        <div className="mt-auto pt-4">
          {unlocked ? (
            hasFile ? (
              <span className="flex items-center justify-between rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-brand">
                <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" /> Download PDF</span>
                <span className="text-xs font-normal opacity-70">{size(b.file_size)}</span>
              </span>
            ) : (
              <span className="block rounded-xl bg-cream px-4 py-2.5 text-sm text-muted">Coming soon</span>
            )
          ) : (
            <span className="flex items-center gap-2 rounded-xl bg-cream px-4 py-2.5 text-sm text-muted"><Lock className="h-4 w-4" /> Unlocks with your certificate</span>
          )}
        </div>
      </div>
    </article>
  );
  return unlocked && hasFile ? (
    <a href={`/api/bonus/${b.id}`} className="block h-full">{card}</a>
  ) : (
    card
  );
}
