import { CheckCircle2 } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const s = await getSettings();
  const h = s.hero;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Site settings</h1>
        {saved && <span className="inline-flex items-center gap-1.5 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-brand" /> Saved</span>}
      </div>
      <p className="text-muted">Everything on the home page hero, branding and contact button.</p>

      <form action={saveSettings} className="mt-6 space-y-6">
        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Branding</legend>
          <div><label className="label">Brand name</label><input name="brand_name" defaultValue={s.brand_name} className="input" /></div>
          <div><label className="label">Tagline (second line of logo)</label><input name="brand_tagline" defaultValue={s.brand_tagline ?? ""} className="input" /></div>
          <div className="sm:col-span-2">
            <label className="label">Logo image (replaces the text logo)</label>
            <div className="flex flex-wrap items-center gap-4">
              {s.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo_url} alt="" className="h-10 w-auto" />
              )}
              <input type="file" name="logo" accept="image/*" className="text-sm" />
              {s.logo_url && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="remove_logo" /> Remove logo</label>}
            </div>
          </div>
          <div><label className="label">Footer line 1 (left)</label><input name="footer_text" defaultValue={s.footer_text ?? ""} className="input" /></div>
          <div><label className="label">Footer line 2 (right)</label><input name="footer_text_2" defaultValue={s.footer_text_2 ?? ""} className="input" placeholder="Leave empty to hide" /></div>
        </fieldset>

        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Home page hero</legend>
          <div className="sm:col-span-2"><label className="label">Small red text above title</label><input name="eyebrow" defaultValue={h.eyebrow} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Big title</label><input name="title" defaultValue={h.title} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Subtitle</label><textarea name="subtitle" rows={3} defaultValue={h.subtitle} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">White badges (one per line)</label><textarea name="badges" rows={3} defaultValue={(h.badges ?? []).join("\n")} className="input" /></div>
          <div><label className="label">Button text</label><input name="cta_text" defaultValue={h.cta_text} className="input" placeholder="Claim your spot for" /></div>
          <div><label className="label">Crossed-out value (e.g. ₹4,999)</label><input name="value_price" defaultValue={h.value_price} className="input" /></div>
          <div className="sm:col-span-2">
            <label className="label">Hero image (right side of the black hero, 4:3 recommended)</label>
            <div className="flex flex-wrap items-center gap-4">
              {h.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.image_url} alt="" className="h-20 w-28 rounded-lg object-cover" />
              )}
              <input type="file" name="hero_image" accept="image/*" className="text-sm" />
              {h.image_url && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="remove_hero_image" /> Remove image</label>}
            </div>
          </div>
          <div className="sm:col-span-2"><label className="label">Seats strip title (below the hero)</label><input name="offer_title" defaultValue={h.offer_title} className="input" /></div>
          <div><label className="label">Total seats shown</label><input name="slots_total" type="number" min={0} max={20} defaultValue={h.slots_total} className="input" /></div>
          <div><label className="label">Seats filled</label><input name="slots_filled" type="number" min={0} max={20} defaultValue={h.slots_filled} className="input" /></div>
          <div><label className="label">Offer countdown ends at</label><input name="countdown_end" type="datetime-local" defaultValue={toLocalInput(h.countdown_end)} className="input" /></div>
          <div><label className="label">Certificate line</label><input name="certificate_note" defaultValue={h.certificate_note} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Login / sign-up page heading (right side)</label><input name="auth_title" defaultValue={h.auth_title ?? ""} className="input" placeholder="Leave empty to use the big title" /></div>
        </fieldset>

        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">WhatsApp &amp; certificate</legend>
          <div><label className="label">WhatsApp number (with country code)</label><input name="whatsapp_number" defaultValue={s.whatsapp_number ?? ""} className="input" placeholder="919876543210" /></div>
          <div><label className="label">Pre-filled message</label><input name="whatsapp_message" defaultValue={s.whatsapp_message ?? ""} className="input" /></div>
          <div><label className="label">Certificate signatory name</label><input name="signatory_name" defaultValue={s.certificate.signatory_name ?? ""} className="input" /></div>
          <div><label className="label">Signatory title</label><input name="signatory_title" defaultValue={s.certificate.signatory_title ?? ""} className="input" /></div>
        </fieldset>

        <div className="flex justify-end">
          <SubmitButton className="btn-primary px-8 py-3">Save settings</SubmitButton>
        </div>
      </form>
    </div>
  );
}
