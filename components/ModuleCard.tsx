import Image from "next/image";
import Link from "next/link";
import { Lock, CheckCircle2, PlayCircle, Clock } from "lucide-react";
import { fmtDuration, pad2 } from "@/lib/format";

type Props = {
  position: number;
  title: string;
  subtitle?: string | null;
  cover?: string | null;
  duration?: number;
  state?: "locked" | "open" | "done" | "preview";
  href?: string;
  percent?: number;
};

export function ModuleCard({ position, title, subtitle, cover, duration, state = "preview", href, percent }: Props) {
  const inner = (
    <div
      className={`group relative flex aspect-[5/4] flex-col justify-between overflow-hidden rounded-[18px] p-4 text-white transition sm:p-5 ${
        state === "locked" ? "opacity-75 grayscale-[30%]" : "hover:-translate-y-1 hover:shadow-xl hover:shadow-black/15"
      }`}
    >
      {cover ? (
        <Image src={cover} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
      ) : (
        <div className="grid-bg absolute inset-0">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/35 blur-3xl" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />

      <div className="relative flex items-start justify-between">
        <span className="rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-bold tracking-wider text-ink">
          MODULE {pad2(position)}
        </span>
        {state === "locked" && <Lock className="h-5 w-5 text-white/90" />}
        {state === "done" && <CheckCircle2 className="h-6 w-6 text-white" fill="#e11d2e" />}
        {state === "open" && <PlayCircle className="h-6 w-6 text-white transition group-hover:text-brand" />}
      </div>

      <div className="relative">
        {!cover && <div className="text-5xl font-bold leading-none text-white/15">{pad2(position)}</div>}
        <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-snug sm:text-xl">{title}</h3>
        {subtitle && <p className="mt-0.5 line-clamp-1 text-sm text-white/75">{subtitle}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/80">
          {!!duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {fmtDuration(duration)}
            </span>
          )}
          {state === "locked" && <span>Finish the previous module to unlock</span>}
        </div>
        {typeof percent === "number" && state !== "locked" && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-brand" style={{ width: `${Math.min(100, percent)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
  if (href && state !== "locked") return <Link href={href}>{inner}</Link>;
  return inner;
}
