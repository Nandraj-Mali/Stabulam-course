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
      className={`group relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-[22px] p-6 text-white transition ${
        state === "locked" ? "opacity-75 grayscale-[30%]" : "hover:-translate-y-1 hover:shadow-xl hover:shadow-black/15"
      }`}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="grid-bg absolute inset-0">
          <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-brand/35 blur-3xl" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />

      <div className="relative flex items-start justify-between">
        <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold tracking-wider text-ink">
          MODULE {pad2(position)}
        </span>
        {state === "locked" && <Lock className="h-6 w-6 text-white/90" />}
        {state === "done" && <CheckCircle2 className="h-7 w-7 text-white" fill="#e11d2e" />}
        {state === "open" && <PlayCircle className="h-7 w-7 text-white transition group-hover:text-brand" />}
      </div>

      <div className="relative">
        {!cover && <div className="mb-1 text-[64px] font-bold leading-none text-white/15">{pad2(position)}</div>}
        <h3 className="text-2xl font-bold leading-tight sm:text-[26px]">{title}</h3>
        {subtitle && <p className="mt-1.5 text-[15px] text-white/75">{subtitle}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
          {!!duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" /> {fmtDuration(duration)}
            </span>
          )}
          {state === "locked" && <span>Finish the previous module to unlock</span>}
        </div>
        {typeof percent === "number" && state !== "locked" && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-brand" style={{ width: `${Math.min(100, percent)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
  if (href && state !== "locked") return <Link href={href}>{inner}</Link>;
  return inner;
}
