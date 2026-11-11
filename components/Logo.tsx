import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

export function Logo({ s, href = "/" }: { s: SiteSettings; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      {s.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo_url} alt={s.brand_name} className="h-10 w-auto" />
      ) : (
        <>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 18 18 6M9 6h9v9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="leading-[1.05]">
            <span className="block text-[17px] font-bold text-ink">{s.brand_name}</span>
            {s.brand_tagline && (
              <span className="block text-[15px] tracking-[0.12em] text-ink-2">{s.brand_tagline}</span>
            )}
          </span>
        </>
      )}
    </Link>
  );
}
