"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Megaphone, Play, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Popup = {
  enabled: boolean;
  intervalSeconds: number;
  type: "attention" | "message";
  content: { title?: string; body?: string; button_text?: string; button_url?: string };
};

type Props = {
  moduleId: string;
  embedUrl: string | null;
  directUrl: string | null;
  watermark: string;
  setupIssue?: string | null;
  duration: number;
  startAt: number;
  maxPosition: number;
  videoCompleted: boolean;
  moduleCompleted: boolean;
  popup: Popup;
  nextHref: string;
  nextLabel: string;
};

/** Minimal adapter so Bunny's iframe (player.js) and a native <video> share one API. */
type PlayerAdapter = {
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
};

declare global {
  interface Window {
    playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs };
  }
}
type PlayerJs = {
  on: (ev: string, cb: (d?: { seconds: number; duration: number }) => void) => void;
  play: () => void;
  pause: () => void;
  setCurrentTime: (t: number) => void;
  getDuration: (cb: (d: number) => void) => void;
};

const HEARTBEAT_EVERY = 15; // seconds
const MAX_SPEED = 1.5;

export function ModuleExperience(p: Props) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [videoDone, setVideoDone] = useState(p.videoCompleted);
  const [moduleDone, setModuleDone] = useState(p.moduleCompleted);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPct, setPopupPct] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const player = useRef<PlayerAdapter | null>(null);

  const playing = useRef(false);
  const lastT = useRef<number | null>(null); // last playhead time seen
  const lastAdvance = useRef(0); // wall-clock ms when the playhead last moved forward
  const lastWall = useRef(0); // wall-clock ms of the previous time update
  const speedWarned = useRef(0);
  const current = useRef(0);
  const duration = useRef(p.duration);
  const maxPos = useRef(p.maxPosition);
  const pending = useRef(0); // seconds watched not yet sent
  const sinceBeat = useRef(0);
  const sincePopup = useRef(0);
  const resumed = useRef(false);
  const freeSeek = useRef(p.videoCompleted);

  const sendHeartbeat = useCallback(async () => {
    const delta = pending.current;
    pending.current = 0;
    sinceBeat.current = 0;
    if (delta <= 0 && current.current <= 0) return;
    const { data, error } = await supabase.rpc("record_heartbeat", {
      p_module: p.moduleId,
      p_position: Math.floor(current.current),
      p_delta: Math.round(delta),
      p_duration: Math.round(duration.current || 0),
    });
    if (error) return;
    if (data?.video_completed && !freeSeek.current) {
      freeSeek.current = true;
      setVideoDone(true);
      setModuleDone(true);
      router.refresh();
    }
  }, [supabase, p.moduleId, router]);

  // Called by both player types on every time update.
  // Watch time = how far the playhead genuinely advanced (works at any playback speed,
  // and doesn't depend on play/pause events arriving).
  const warnSpeed = useCallback(() => {
    if (Date.now() - speedWarned.current < 4000) return;
    speedWarned.current = Date.now();
    setNotice(`Maximum playback speed is ${MAX_SPEED}×. Please lower the speed to keep your progress.`);
    setTimeout(() => setNotice(null), 3500);
  }, []);

  const onTime = useCallback((t: number, d?: number) => {
    if (d && d > 0) duration.current = d;
    if (!freeSeek.current && t > maxPos.current + 3) {
      // Skipping ahead (or playing faster than allowed) is not counted
      player.current?.seek(maxPos.current);
      lastT.current = maxPos.current;
      lastWall.current = Date.now();
      if (Date.now() - speedWarned.current > 4000) {
        setNotice("Skipping ahead isn't allowed on the first watch.");
        setTimeout(() => setNotice(null), 2500);
      }
      return;
    }
    const now = Date.now();
    const prev = lastT.current;
    let credit = 0;
    if (prev !== null) {
      const step = t - prev;
      if (step > 0 && step <= 3) {
        const wallSec = lastWall.current ? (now - lastWall.current) / 1000 : step;
        const cap = wallSec * MAX_SPEED + 0.35;
        if (step > cap && wallSec > 0.15) warnSpeed();
        credit = Math.min(step, cap);
        pending.current += credit;
        lastAdvance.current = now;
      }
    }
    lastT.current = t;
    lastWall.current = now;
    current.current = t;
    if (freeSeek.current) {
      if (t > maxPos.current) maxPos.current = t;
    } else if (t > maxPos.current) {
      // the unlocked range grows only as fast as 1.5x real time
      maxPos.current = Math.min(t, maxPos.current + Math.max(credit, 0) + (prev === null ? 0.5 : 0));
    }
  }, [warnSpeed]);

  const onEnded = useCallback(() => {
    playing.current = false;
    const d = duration.current;
    if (d > 0) {
      // credit the last fraction of a second before the end event
      if (lastT.current !== null && d > lastT.current && d - lastT.current <= 3) pending.current += d - lastT.current;
      current.current = d;
      lastT.current = d;
      if (maxPos.current < d) maxPos.current = d;
    }
  }, []);

  const onReady = useCallback(() => {
    if (resumed.current) return;
    resumed.current = true;
    const d = duration.current;
    if (p.startAt > 5 && (!d || p.startAt < d - 5)) player.current?.seek(p.startAt);
  }, [p.startAt]);

  // 1-second ticker: sends heartbeats and triggers popups while the video is actually moving
  useEffect(() => {
    const t = setInterval(() => {
      const active = Date.now() - lastAdvance.current < 2500;
      if (active) {
        sincePopup.current += 1;
        if (p.popup.enabled && p.popup.intervalSeconds > 0 && sincePopup.current >= p.popup.intervalSeconds) {
          sincePopup.current = 0;
          player.current?.pause();
          setPopupPct(duration.current > 0 ? Math.min(100, Math.round((current.current / duration.current) * 100)) : 0);
          setShowPopup(true);
        }
      }
      if (pending.current > 0) {
        sinceBeat.current += 1;
        if (sinceBeat.current >= HEARTBEAT_EVERY) void sendHeartbeat();
      }
    }, 1000);
    const flush = () => {
      if (document.visibilityState === "hidden") void sendHeartbeat();
    };
    document.addEventListener("visibilitychange", flush);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", flush);
      void sendHeartbeat();
    };
  }, [sendHeartbeat, p.popup.enabled, p.popup.intervalSeconds]);

  // Bunny iframe wiring
  useEffect(() => {
    if (!p.embedUrl || !scriptReady || !iframeRef.current || !window.playerjs) return;
    const pj = new window.playerjs.Player(iframeRef.current);
    pj.on("ready", () => {
      player.current = { play: () => pj.play(), pause: () => pj.pause(), seek: (s) => pj.setCurrentTime(s) };
      pj.getDuration((d) => {
        if (d) duration.current = d;
        onReady();
      });
      pj.on("play", () => (playing.current = true));
      pj.on("pause", () => {
        playing.current = false;
        void sendHeartbeat();
      });
      pj.on("ended", () => {
        onEnded();
        void sendHeartbeat();
      });
      pj.on("timeupdate", (d) => d && onTime(d.seconds, d.duration));
    });
  }, [p.embedUrl, scriptReady, onTime, onReady, onEnded, sendHeartbeat]);

  // Native video wiring
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !p.directUrl) return;
    player.current = { play: () => void v.play(), pause: () => v.pause(), seek: (s) => (v.currentTime = s) };
    const meta = () => {
      duration.current = v.duration || duration.current;
      onReady();
    };
    const play = () => (playing.current = true);
    const stop = () => {
      playing.current = false;
      void sendHeartbeat();
    };
    const time = () => onTime(v.currentTime, v.duration);
    const rate = () => {
      if (v.playbackRate > MAX_SPEED) {
        v.playbackRate = MAX_SPEED;
        warnSpeed();
      }
    };
    const ended = () => {
      onEnded();
      void sendHeartbeat();
    };
    v.addEventListener("loadedmetadata", meta);
    v.addEventListener("play", play);
    v.addEventListener("pause", stop);
    v.addEventListener("ended", ended);
    v.addEventListener("ratechange", rate);
    v.addEventListener("timeupdate", time);
    return () => {
      v.removeEventListener("loadedmetadata", meta);
      v.removeEventListener("play", play);
      v.removeEventListener("pause", stop);
      v.removeEventListener("ended", ended);
      v.removeEventListener("ratechange", rate);
      v.removeEventListener("timeupdate", time);
    };
  }, [p.directUrl, onTime, onReady, onEnded, sendHeartbeat, warnSpeed]);

  return (
    <>
      {p.embedUrl && (
        <Script src="https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js" onReady={() => setScriptReady(true)} />
      )}

      <div className="relative mt-8 overflow-hidden rounded-[22px] bg-ink" onContextMenu={(e) => e.preventDefault()}>
        <div className="relative aspect-video w-full">
          {p.embedUrl ? (
            <iframe
              ref={iframeRef}
              src={p.embedUrl}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : p.directUrl ? (
            <video
              ref={videoRef}
              src={p.directUrl}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              playsInline
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="grid-bg absolute inset-0 grid place-items-center text-center text-white/80">
              <div>
                <PlayCircle className="mx-auto h-14 w-14 text-brand" />
                <p className="mt-3 text-lg">Video coming soon</p>
                {p.setupIssue && (
                  <p className="mx-auto mt-3 max-w-md rounded-lg bg-brand/90 px-4 py-2 text-sm text-white">Admin only: {p.setupIssue}</p>
                )}
              </div>
            </div>
          )}
          {/* light watermark to discourage screen recording */}
          {(p.embedUrl || p.directUrl) && (
            <span className="pointer-events-none absolute right-4 top-4 select-none text-xs text-white/25">{p.watermark}</span>
          )}
          {notice && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm text-white">{notice}</div>
          )}
        </div>
      </div>

      {/* status bar */}
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[15px]">
          {moduleDone ? (
            <><CheckCircle2 className="h-5 w-5 text-brand" /> Module completed</>
          ) : videoDone ? (
            <><CheckCircle2 className="h-5 w-5 text-ink" /> Video completed</>
          ) : (
            <span className="text-muted">Watch at least 90% of the video to unlock the next module.</span>
          )}
        </div>
        {moduleDone && (
          <Link href={p.nextHref} className="btn-primary">{p.nextLabel} →</Link>
        )}
      </div>


      {showPopup && (
        <ContinuePopup
          popup={p.popup}
          pct={popupPct}
          onContinue={() => {
            setShowPopup(false);
            player.current?.play();
          }}
        />
      )}
    </>
  );
}


export function ContinuePopup({ popup, pct, onContinue }: { popup: Popup; pct: number; onContinue: () => void }) {
  const attention = popup.type === "attention";
  const c = popup.content;
  const title = c.title || (attention ? "Still with us?" : "A quick note for you");
  const body = c.body || (attention ? "Take a breath, then jump back in. You're doing great." : "");
  const Icon = attention ? Sparkles : Megaphone;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue]);

  const r = 26;
  const circ = 2 * Math.PI * r;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="animate-pop-in w-full max-w-[440px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
        {/* header */}
        <div className="grid-bg relative overflow-hidden px-6 pb-8 pt-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.2em] ring-1 ring-white/20">
              {attention ? "QUICK CHECK-IN" : "MESSAGE FOR YOU"}
            </span>
            {/* progress ring */}
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                <circle cx="32" cy="32" r={r} fill="none" stroke="#e11d2e" strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-bold">{pct}%</span>
            </div>
          </div>
          <div className="relative mt-2 flex justify-center">
            <span className="relative grid h-20 w-20 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand/40" />
              <span className="absolute inset-1 rounded-full bg-brand/30" />
              <span className="animate-float relative grid h-16 w-16 place-items-center rounded-full bg-brand shadow-lg shadow-brand/40">
                <Icon className="h-8 w-8" />
              </span>
            </span>
          </div>
        </div>

        {/* body */}
        <div className="relative z-10 -mt-5 rounded-t-[24px] bg-white px-7 pb-7 pt-6 text-center">
          <h3 className="text-2xl font-bold leading-tight">{title}</h3>
          {body && <p className="mt-2 whitespace-pre-line text-muted">{body}</p>}
          <p className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs font-medium text-ink-2">
            You&apos;re {pct}% through this module
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              autoFocus
              onClick={onContinue}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 text-base font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
            >
              <Play className="h-4 w-4 fill-white transition group-hover:scale-110" /> Continue watching
            </button>
            {c.button_url && (
              <a
                href={c.button_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink px-5 py-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white"
              >
                {c.button_text || "Learn more"} <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Your progress is saved automatically
          </p>
        </div>
      </div>
    </div>
  );
}
