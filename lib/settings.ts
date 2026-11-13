import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { SiteSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: "Stabulam",
  brand_tagline: "School",
  logo_url: null,
  hero: {
    eyebrow: "SELF-PACED ◆ 4 MODULES ◆ FREE CERTIFICATE",
    title: "Digital Marketing for Schools",
    subtitle:
      "Learn how to fill your admissions with Google, Instagram, WhatsApp and smart content.",
    badges: ["4 VIDEO MODULES", "SELF-PACED", "FREE CERTIFICATE"],
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
  footer_text_2: "Made for schools across India",
  certificate: { signatory_name: "Course Director", signatory_title: "Stabulam" },
};

/** Site settings change rarely: cached across requests, refreshed instantly when admin saves (tag "site"). */
const loadSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const { data, error } = await createPublicClient().from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    if (!data) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      hero: { ...DEFAULT_SETTINGS.hero, ...(data.hero ?? {}) },
      certificate: { ...DEFAULT_SETTINGS.certificate, ...(data.certificate ?? {}) },
    };
  },
  ["site-settings-v1"],
  { tags: ["site"], revalidate: 600 }
);

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await loadSettings();
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export function whatsappLink(s: SiteSettings, extra?: string) {
  const num = (s.whatsapp_number ?? "").replace(/\D/g, "");
  const text = [s.whatsapp_message, extra].filter(Boolean).join("\n");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
