"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PlayCircle, RotateCcw, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Popup = {
  enabled: boolean;
  intervalMinutes: number;
  type: "attention" | "message";
  content: { title?: string; body?: string; button_text?: string; button_url?: string };
};

type Props = {
  moduleId: string;
  embedUrl: string | null;
  directUrl: string | null;
  watermark: string;
  duration: number;
  startAt: number;
  maxPosition: number;
  videoCompleted: boolean;
  moduleCompleted: boolean;
  hasQuiz: boolean;
  passPercent: number;
  bestScore: number | null;
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

export function ModuleExperience(p: Props) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [videoDone, setVideoDone] = useState(p.videoCompleted);
  const [moduleDone, setModuleDone] = useState(p.moduleCompleted);
  const [showPopup, setShowPopup] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const player = useRef<PlayerAdapter | null>(null);

  const playing = useRef(false);
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
      if (!p.hasQuiz) {
        setModuleDone(true);
        router.refresh();
      }
    }
  }, [supabase, p.moduleId, p.hasQuiz, router]);

  // Called by both player types on every time update
  const onTime = useCallback((t: number, d?: number) => {
    if (d && d > 0) duration.current = d;
    if (!freeSeek.current && t > maxPos.current + 3) {
      // Skipping ahead is not allowed
      player.current?.seek(maxPos.current);
      setNotice("Skipping ahead isn't allowed on the first watch.");
      setTimeout(() => setNotice(null), 2500);
      return;
    }
    current.current = t;
    if (t > maxPos.current) maxPos.current = t;
  }, []);

  const onReady = useCallback(() => {
    if (resumed.current) return;
    resumed.current = true;
    const d = duration.current;
    if (p.startAt > 5 && (!d || p.startAt < d - 5)) player.current?.seek(p.startAt);
  }, [p.startAt]);

  // 1-second ticker: counts real watch time, sends heartbeats, triggers popups
  useEffect(() => {
    const t = setInterval(() => {
      if (!playing.current || document.visibilityState !== "visible") return;
      pending.current += 1;
      sinceBeat.current += 1;
      sincePopup.current += 1;
      if (sinceBeat.current >= HEARTBEAT_EVERY) void sendHeartbeat();
      if (p.popup.enabled && p.popup.intervalMinutes > 0 && sincePopup.current >= p.popup.intervalMinutes * 60) {
        sincePopup.current = 0;
        player.current?.pause();
        setShowPopup(true);
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
  }, [sendHeartbeat, p.popup.enabled, p.popup.intervalMinutes]);

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
        playing.current = false;
        void sendHeartbeat();
      });
      pj.on("timeupdate", (d) => d && onTime(d.seconds, d.duration));
    });
  }, [p.embedUrl, scriptReady, onTime, onReady, sendHeartbeat]);

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
    v.addEventListener("loadedmetadata", meta);
    v.addEventListener("play", play);
    v.addEventListener("pause", stop);
    v.addEventListener("ended", stop);
    v.addEventListener("timeupdate", time);
    return () => {
      v.removeEventListener("loadedmetadata", meta);
      v.removeEventListener("play", play);
      v.removeEventListener("pause", stop);
      v.removeEventListener("ended", stop);
      v.removeEventListener("timeupdate", time);
    };
  }, [p.directUrl, onTime, onReady, sendHeartbeat]);

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
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              playsInline
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="grid-bg absolute inset-0 grid place-items-center text-center text-white/80">
              <div>
                <PlayCircle className="mx-auto h-14 w-14 text-brand" />
                <p className="mt-3 text-lg">Video coming soon</p>
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
            <><CheckCircle2 className="h-5 w-5 text-ink" /> Video completed {p.hasQuiz && "· pass the quiz below to unlock the next module"}</>
          ) : (
            <span className="text-muted">Watch at least 90% of the video{p.hasQuiz ? ", then pass the quiz" : ""} to unlock the next module.</span>
          )}
        </div>
        {moduleDone && (
          <Link href={p.nextHref} className="btn-primary">{p.nextLabel} →</Link>
        )}
      </div>

      {p.hasQuiz && videoDone && (
        <Quiz
          moduleId={p.moduleId}
          passPercent={p.passPercent}
          bestScore={p.bestScore}
          alreadyPassed={moduleDone}
          onPassed={() => {
            setModuleDone(true);
            router.refresh();
          }}
          nextHref={p.nextHref}
          nextLabel={p.nextLabel}
        />
      )}

      {showPopup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl">
            {p.popup.type === "attention" ? (
              <>
                <h3 className="text-2xl font-bold">{p.popup.content.title || "Still with us? 👀"}</h3>
                <p className="mt-2 text-muted">{p.popup.content.body || "Click continue to keep watching. Your progress is being saved."}</p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold">{p.popup.content.title || "Quick note"}</h3>
                {p.popup.content.body && <p className="mt-2 whitespace-pre-line text-muted">{p.popup.content.body}</p>}
                {p.popup.content.button_url && (
                  <a href={p.popup.content.button_url} target="_blank" rel="noopener noreferrer" className="btn-dark mt-5 w-full">
                    {p.popup.content.button_text || "Learn more"}
                  </a>
                )}
              </>
            )}
            <button
              className="btn-primary mt-3 w-full"
              onClick={() => {
                setShowPopup(false);
                player.current?.play();
              }}
            >
              Continue watching
            </button>
          </div>
        </div>
      )}
    </>
  );
}

type Q = { id: string; position: number; question: string; options: string[] };
type Result = {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  pass_percent: number;
  results: { id: string; picked: number | null; correct_index: number; is_correct: boolean; explanation: string | null }[];
};

function Quiz(props: {
  moduleId: string;
  passPercent: number;
  bestScore: number | null;
  alreadyPassed: boolean;
  onPassed: () => void;
  nextHref: string;
  nextLabel: string;
}) {
  const supabase = useRef(createClient()).current;
  const [qs, setQs] = useState<Q[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("get_quiz", { p_module: props.moduleId }).then(({ data, error }) => {
      if (error) setErr(error.message);
      else setQs((data ?? []) as Q[]);
    });
  }, [supabase, props.moduleId]);

  async function submit() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("submit_quiz", { p_module: props.moduleId, p_answers: answers });
    setBusy(false);
    if (error) return setErr(error.message);
    const r = data as Result;
    setResult(r);
    if (r.passed) props.onPassed();
    window.scrollTo({ top: document.getElementById("quiz")!.offsetTop - 20, behavior: "smooth" });
  }

  if (!qs) return <div className="mt-8 flex items-center gap-2 text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading quiz…</div>;
  const byId = new Map(result?.results.map((r) => [r.id, r]));
  const allAnswered = qs.every((q) => answers[q.id] !== undefined);

  return (
    <section id="quiz" className="mt-10 rounded-[22px] border border-line p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Module quiz</p>
          <h2 className="mt-1 text-2xl font-bold">Test your understanding</h2>
        </div>
        <p className="text-sm text-muted">
          Pass mark {props.passPercent}%{props.bestScore != null && ` · Best score ${props.bestScore}%`}
        </p>
      </div>

      {result && (
        <div className={`mt-6 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between ${result.passed ? "bg-cream" : "bg-brand-soft"}`}>
          <p className="font-medium">
            {result.passed ? "🎉 Passed!" : "Not quite."} You scored {result.score}% ({result.correct}/{result.total}).
            {!result.passed && ` You need ${result.pass_percent}% to pass.`}
          </p>
          {result.passed ? (
            <Link href={props.nextHref} className="btn-primary">{props.nextLabel} →</Link>
          ) : (
            <button className="btn-dark" onClick={() => { setResult(null); setAnswers({}); }}>
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          )}
        </div>
      )}

      <ol className="mt-6 space-y-6">
        {qs.map((q, i) => {
          const r = byId.get(q.id);
          return (
            <li key={q.id}>
              <p className="font-semibold">{i + 1}. {q.question}</p>
              <div className="mt-3 grid gap-2">
                {q.options.map((opt, oi) => {
                  const picked = answers[q.id] === oi;
                  const isCorrect = r && oi === r.correct_index;
                  const isWrongPick = r && picked && !r.is_correct;
                  return (
                    <label
                      key={oi}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                        isCorrect ? "border-ink bg-cream" : isWrongPick ? "border-brand bg-brand-soft" : picked ? "border-ink" : "border-line hover:border-ink/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        className="accent-[#e11d2e]"
                        checked={picked}
                        disabled={!!result}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      />
                      <span className="flex-1">{opt}</span>
                      {isCorrect && <CheckCircle2 className="h-5 w-5 text-ink" />}
                      {isWrongPick && <XCircle className="h-5 w-5 text-brand" />}
                    </label>
                  );
                })}
              </div>
              {r?.explanation && <p className="mt-2 text-sm text-muted">💡 {r.explanation}</p>}
            </li>
          );
        })}
      </ol>

      {err && <p className="mt-4 rounded-lg bg-brand-soft px-3.5 py-2.5 text-sm text-brand-dark">{err}</p>}
      {!result && (
        <button onClick={submit} disabled={!allAnswered || busy} className="btn-primary mt-6 px-7 py-3">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit answers
        </button>
      )}
    </section>
  );
}
