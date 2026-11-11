"use client";
import { useEffect, useState } from "react";
import { pad2 } from "@/lib/format";

export function Countdown({ end }: { end?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = end ? new Date(end).getTime() : NaN;
  if (!end || Number.isNaN(target)) return null;
  const diff = Math.max(0, target - (now ?? target));
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const sec = Math.floor((diff / 1000) % 60);
  return (
    <span suppressHydrationWarning>
      {pad2(d)}d : {pad2(h)}h : {pad2(m)}m : {pad2(sec)}s
    </span>
  );
}
