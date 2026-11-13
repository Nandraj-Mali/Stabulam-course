import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, FolderOpen, Lock, PlayCircle, RotateCcw } from "lucide-react";
import type { ModuleWithState } from "@/lib/course";
import { fmtDuration, pad2 } from "@/lib/format";

export function ProgressRing({ pct, done, total }: { pct: number; done: number; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-36 w-36 shrink-0 md:mx-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e11d2e" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-bold">{pct}%</p>
          <p className="text-xs text-white/60">{done}/{total} done</p>
        </div>
      </div>
    </div>
  );
}

export function ModuleTile({ m, slug, prev }: { m: ModuleWithState; slug: string; prev?: ModuleWithState }) {
  const locked = m.state === "locked";
  const done = m.state === "done";
  const started = !!m.progress && !done;
  const files = m.resources?.length ?? 0;

  const body = (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[22px] border bg-white transition ${
        locked ? "border-line" : "border-line hover:-translate-y-1 hover:border-ink hover:shadow-2xl hover:shadow-black/10"
      } ${m.state === "open" ? "ring-2 ring-brand ring-offset-2" : ""}`}
    >
      {/* image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-ink">
        {m.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover_url} alt="" className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${locked ? "blur-[3px] grayscale" : ""}`} />
        ) : (
          <div className="grid-bg h-full w-full">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand/30 blur-3xl" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* giant number */}
        <span className="absolute -bottom-5 right-3 select-none text-[110px] font-bold leading-none text-white/90 [text-shadow:0_4px_30px_rgba(0,0,0,0.35)] sm:text-[130px]">
          {pad2(m.position)}
        </span>

        {/* status chip */}
        <span
          className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            done ? "bg-brand text-white" : locked ? "bg-black/60 text-white backdrop-blur" : "bg-white text-ink"
          }`}
        >
          {done ? <><CheckCircle2 className="h-3.5 w-3.5" /> COMPLETED</> : locked ? <><Lock className="h-3.5 w-3.5" /> LOCKED</> : started ? <>● IN PROGRESS</> : <>● UP NEXT</>}
        </span>

        {locked && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-ink shadow-xl"><Lock className="h-6 w-6" /></span>
          </div>
        )}
        {!locked && (
          <span className="absolute bottom-4 left-4 grid h-12 w-12 place-items-center rounded-full bg-white text-brand shadow-lg transition group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
            <PlayCircle className="h-6 w-6" />
          </span>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-xs font-bold tracking-[0.2em] text-brand">MODULE {pad2(m.position)}</p>
        <h3 className="mt-1.5 text-xl font-bold leading-snug sm:text-2xl">{m.title}</h3>
        {m.subtitle && <p className="mt-1 text-muted">{m.subtitle}</p>}

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          {m.duration_seconds > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtDuration(m.duration_seconds)}</span>}
          {files > 0 && <span className="inline-flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" /> {files} resource{files > 1 ? "s" : ""}</span>}
        </div>

        <div className="mt-auto pt-5">
          {!locked && (
            <div className="mb-4 flex items-center gap-3 text-xs">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, m.percent)}%` }} />
              </div>
              <span className="w-9 text-right font-semibold tabular-nums">{Math.min(100, m.percent)}%</span>
            </div>
          )}
          {locked ? (
            <p className="flex items-center gap-2 rounded-xl bg-cream px-4 py-3 text-sm text-muted">
              <Lock className="h-4 w-4" /> Unlocks after {prev ? `Module ${pad2(prev.position)}` : "onboarding"}
            </p>
          ) : (
            <span className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${done ? "bg-cream text-ink" : "bg-ink text-white group-hover:bg-brand"}`}>
              {done ? <span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Watch again</span> : started ? "Continue watching" : "Start module"}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          )}
        </div>
      </div>
    </article>
  );

  return locked ? body : <Link href={`/course/${slug}/module/${m.position}`} className="block h-full">{body}</Link>;
}
