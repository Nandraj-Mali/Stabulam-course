import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: "Stabulam",
  brand_tagline: "School",
  logo_url: null,
  hero: {
    eyebrow: "SELF-PACED ◆ 10 MODULES ◆ 2 HOURS",
    title: "Digital Marketing for Schools",
    subtitle:
      "Learn how to fill your admissions with Google, Instagram, WhatsApp and smart content.",
    badges: ["10 VIDEO MODULES", "~2 HOURS OF TRAINING", "FREE CERTIFICATE"],
    cta_text: "Claim your spot for",
    value_price: "₹4,999",
    offer_title: "Final Call: Limited Free Seats!",
    slots_total: 11,
    slots_filled: 9,
    certificate_note: "🎓 Get a free certificate after completing the course",
  },
  whatsapp_number: "919999999999",
  whatsapp_message: "Hi! I have a question about the course.",
  footer_text: "© Stabulam. All rights reserved.",
  certificate: { signatory_name: "Course Director", signatory_title: "Stabulam" },
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      hero: { ...DEFAULT_SETTINGS.hero, ...(data.hero ?? {}) },
      certificate: { ...DEFAULT_SETTINGS.certificate, ...(data.certificate ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export function whatsappLink(s: SiteSettings, extra?: string) {
  const num = (s.whatsapp_number ?? "").replace(/\D/g, "");
  const text = [s.whatsapp_message, extra].filter(Boolean).join("\n");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
