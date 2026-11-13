export function fmtDuration(sec: number) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m} min`;
}
export function fmtMinutes(sec: number) {
  return `${Math.round((sec || 0) / 60)} min`;
}
export function pad2(n: number) {
  return String(n).padStart(2, "0");
}
export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Certificate PDF link; the timestamp makes every click fetch the latest design. */
export function certHref(id: string) {
  return `/api/certificate/${encodeURIComponent(id)}?v=${Date.now()}`;
}
