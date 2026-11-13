export type Hero = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  badges?: string[];
  cta_text?: string;
  value_price?: string;
  offer_title?: string;
  slots_total?: number;
  slots_filled?: number;
  countdown_end?: string;
  certificate_note?: string;
  image_url?: string;
  auth_title?: string;
};

export type SiteSettings = {
  brand_name: string;
  brand_tagline: string | null;
  logo_url: string | null;
  hero: Hero;
  whatsapp_number: string | null;
  whatsapp_message: string | null;
  footer_text: string | null;
  footer_text_2: string | null;
  certificate: { signatory_name?: string; signatory_title?: string };
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "student" | "admin";
  school_name: string | null;
  designation: string | null;
  city: string | null;
  state: string | null;
  school_board: string | null;
  institution_type: string | null;
  student_count: string | null;
  whatsapp: string | null;
  onboarded_at: string | null;
  created_at: string;
  last_active_at: string | null;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
};

export type Module = {
  id: string;
  course_id: string;
  position: number;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  duration_seconds: number;
  summary: string | null;
  takeaways: string[];
  resources: Resource[];
  pass_percent: number;
  popup_enabled: boolean;
  popup_interval_minutes: number;
  popup_type: "attention" | "message";
  popup_content: { title?: string; body?: string; button_text?: string; button_url?: string };
  is_published: boolean;
};

export type Resource = {
  label: string;
  /** external link */
  url?: string;
  /** path inside the private "resources" bucket */
  path?: string;
  type?: string;
  size?: number;
};

export type Progress = {
  module_id: string;
  watched_seconds: number;
  max_position: number;
  last_position: number;
  video_completed: boolean;
  quiz_passed: boolean;
  best_score: number | null;
  completed_at: string | null;
};

export const MODULE_COLUMNS =
  "id, course_id, position, title, subtitle, cover_url, duration_seconds, summary, takeaways, resources, pass_percent, popup_enabled, popup_interval_minutes, popup_type, popup_content, is_published";
