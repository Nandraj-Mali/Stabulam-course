import { getSettings } from "@/lib/settings";

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
        <span>{s.footer_text}</span>
        <span>Made for schools across India</span>
      </div>
    </footer>
  );
}
