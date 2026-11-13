import Image from "next/image";
import Link from "next/link";
import { Award, CheckCircle2, Clock, ImageIcon, Layers, PlayCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Countdown } from "@/components/Countdown";
import { ModuleCard } from "@/components/ModuleCard";
import { getSettings } from "@/lib/settings";
import { getPublicCatalog } from "@/lib/catalog";
import { BonusCard } from "@/components/BonusCard";
import { fmtDuration } from "@/lib/format";


export default async function Home() {
  const [s, { course, modules: mods, bonuses }] = await Promise.all([getSettings(), getPublicCatalog()]);
  const h = s.hero;
  const totalSec = mods.reduce((a, m) => a + (m.duration_seconds || 0), 0);

  const slotsTotal = Math.max(1, Math.min(24, Number(h.slots_total ?? 11)));
  const slotsFilled = Math.min(slotsTotal, Math.max(0, Number(h.slots_filled ?? 9)));
  const slotsLeft = slotsTotal - slotsFilled;
  const filledPct = Math.round((slotsFilled / slotsTotal) * 100);

  return (
    <>
      <Navbar marketing />
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* HERO */}
        <section className="grid-bg relative mt-2 flex overflow-hidden rounded-[24px] px-5 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[min(calc(100svh-120px),560px)] lg:items-center lg:px-12">
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative grid w-full items-center gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
            <div>
              <p className="eyebrow text-xs sm:text-sm">{h.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-bold leading-[1.1] sm:text-4xl xl:text-5xl">{h.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">{h.subtitle}</p>
              {(h.badges ?? []).length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {(h.badges ?? []).map((b) => (
                    <span key={b} className="pill px-3 py-2 text-xs sm:text-[13px]">{b}</span>
                  ))}
                </div>
              )}
              <Link
                href="/signup"
                className="mt-7 inline-flex items-center gap-2 rounded-xl border-2 border-brand bg-brand px-6 py-3 text-base font-medium text-white transition hover:bg-brand-dark sm:text-lg"
              >
                {h.cta_text} {h.value_price && <s className="opacity-80">{h.value_price}</s>} Free
              </Link>
              {h.certificate_note && <p className="mt-4 text-sm text-white/70">{h.certificate_note}</p>}
            </div>

            {/* Hero image (uploaded from Admin → Site settings) */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-white/5 ring-1 ring-white/10">
              {h.image_url ? (
                        <Image src={h.image_url} alt={h.title ?? ""} fill priority sizes="(min-width:1024px) 480px, 100vw" className="object-cover" />
              ) : (
                <div className="dots-bg absolute inset-0 grid place-items-center text-center text-muted">
                  <div>
                    <ImageIcon className="mx-auto h-10 w-10" />
                    <p className="mt-2 text-sm font-medium">Hero image</p>
                    <p className="text-xs">Upload in Admin → Site settings</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* LIMITED SEATS — ticket strip */}
        <section aria-label="Limited seats" className="relative mt-6">
          <div className="relative flex flex-col overflow-hidden rounded-[22px] border border-ink bg-white md:flex-row">
            {/* main ticket body */}
            <div className="relative flex-1 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">{h.offer_title || "Limited free seats"}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
                <p className="text-5xl font-bold leading-none tracking-tight sm:text-6xl">
                  {String(slotsLeft).padStart(2, "0")}
                </p>
                <p className="pb-1 text-lg text-ink-2">
                  seat{slotsLeft === 1 ? "" : "s"} left of {slotsTotal} in this batch
                </p>
              </div>

              {/* seat map */}
              <div className="mt-5">
                <div className="mx-auto mb-2 h-1.5 w-2/3 rounded-full bg-gradient-to-r from-transparent via-ink/25 to-transparent" />
                <div className="flex flex-wrap justify-start gap-1.5">
                  {Array.from({ length: slotsTotal }).map((_, i) => {
                    const taken = i < slotsFilled;
                    return (
                      <span
                        key={i}
                        title={taken ? "Claimed" : "Available"}
                        className={`grid h-8 w-8 place-items-center rounded-t-lg rounded-b-sm text-[10px] font-bold transition sm:h-9 sm:w-9 ${
                          taken ? "bg-ink text-white/60" : "border-2 border-dashed border-brand bg-brand-soft text-brand"
                        }`}
                      >
                        {taken ? "✕" : i + 1}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${filledPct}%` }} />
                  </div>
                  <span className="font-semibold text-ink">{filledPct}% claimed</span>
                </div>
              </div>
            </div>

            {/* perforation */}
            <div className="relative hidden w-0 md:block">
              <span className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border border-ink bg-white" />
              <span className="absolute -bottom-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border border-ink bg-white" />
              <span className="absolute inset-y-4 left-1/2 border-l-2 border-dashed border-ink/25" />
            </div>
            <div className="border-t-2 border-dashed border-ink/20 md:hidden" />

            {/* stub */}
            <div className="flex flex-col justify-center gap-4 bg-ink p-6 text-white sm:p-8 md:w-[320px]">
              <div>
                {h.value_price && (
                  <p className="text-sm text-white/60">
                    Worth <s>{h.value_price}</s>
                  </p>
                )}
                <p className="text-4xl font-bold tracking-tight">FREE</p>
              </div>
              {h.countdown_end && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/50">Offer ends in</p>
                  <p className="mt-1 font-mono text-xl">
                    <Countdown end={h.countdown_end} />
                  </p>
                </div>
              )}
              <Link href="/signup" className="btn-primary w-full py-3 text-base">
                Grab your seat →
              </Link>
            </div>
          </div>
        </section>

        {/* COURSE THUMBNAIL */}
        {course && (
          <section id="course" className="mt-20 scroll-mt-10">
            <p className="eyebrow">The course</p>
            <div className="mt-4 grid items-center gap-8 overflow-hidden rounded-[24px] border border-line p-4 sm:p-6 lg:grid-cols-[1.15fr_1fr]">
              <div className="relative aspect-video w-full overflow-hidden rounded-[18px] bg-ink">
                {course.cover_url ? (
                            <Image src={course.cover_url} alt={course.title} fill sizes="(min-width:1024px) 620px, 100vw" className="object-cover" />
                ) : (
                  <div className="grid-bg absolute inset-0 grid place-items-center text-center text-white/70">
                    <div>
                      <ImageIcon className="mx-auto h-10 w-10" />
                      <p className="mt-2 text-sm">Course thumbnail · upload in Admin → Course & modules</p>
                    </div>
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-md bg-brand px-2.5 py-1 text-xs font-bold tracking-wider text-white">FREE</span>
              </div>
              <div className="lg:pr-4">
                <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{course.title}</h2>
                {course.description && <p className="mt-3 text-lg text-muted">{course.description}</p>}
                <div className="mt-5 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream px-3 py-1.5"><Layers className="h-4 w-4 text-brand" /> {mods.length} modules</span>
                  {totalSec > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream px-3 py-1.5"><Clock className="h-4 w-4 text-brand" /> {fmtDuration(totalSec)}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-cream px-3 py-1.5"><Award className="h-4 w-4 text-brand" /> Free certificate</span>
                </div>
                <Link href="/signup" className="btn-dark mt-6 px-6 py-3 text-base">
                  <PlayCircle className="h-5 w-5" /> Start learning free
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* MODULES */}
        <section id="modules" className="mt-20 scroll-mt-10">
          <p className="eyebrow">Course curriculum</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">What you&apos;ll learn</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mods.map((m) => (
              <ModuleCard key={m.id} position={m.position} title={m.title} subtitle={m.subtitle} cover={m.cover_url} duration={m.duration_seconds} />
            ))}
          </div>
        </section>

        {/* BONUSES */}
        {bonuses.length > 0 && (
          <section id="bonuses" className="mt-20 scroll-mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Free bonuses</p>
                <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Complete the course, unlock {bonuses.length} bonus{bonuses.length > 1 ? "es" : ""}</h2>
              </div>
              <p className="max-w-sm text-muted">Delivered with your certificate, ready to download as PDFs.</p>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {bonuses.map((b, i) => <BonusCard key={b.id} b={b} index={i + 1} unlocked={false} />)}
            </div>
          </section>
        )}

        {/* CERTIFICATE */}
        <section id="certificate" className="mt-20 scroll-mt-10">
          <div className="dots-bg grid items-center gap-10 rounded-[24px] p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Free certificate</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Finish the course, get certified</h2>
              <p className="mt-4 text-lg text-muted">
                Complete all modules to download a verified certificate with your name.
              </p>
              <ul className="mt-6 space-y-2.5">
                {["100% free, no hidden charges", "Verifiable with a unique certificate ID", "Instant PDF download"].map((x) => (
                  <li key={x} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-brand" /> {x}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary mt-8 px-7 py-3.5 text-base">Start learning for free</Link>
            </div>
            <div className="rounded-2xl border-[10px] border-ink bg-white p-8 text-center shadow-xl">
              <p className="text-xs font-bold tracking-[0.3em] text-brand">CERTIFICATE OF COMPLETION</p>
              <p className="mt-6 text-sm text-muted">This is to certify that</p>
              <p className="mt-2 text-3xl font-bold">Your Name</p>
              <p className="mt-6 text-sm text-muted">has successfully completed</p>
              <p className="mt-1 text-xl font-semibold">{course?.title ?? h.title}</p>
              <div className="mx-auto mt-8 h-px w-40 bg-line" />
              <p className="mt-2 text-xs text-muted">{s.certificate.signatory_name}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
