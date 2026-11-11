# NextGen Portal: Full Build Plan

**Product:** A free digital-marketing course for schools (1 course, 10 modules, about 2 hours of video) with locked progression, quizzes, timed popups, a free certificate and an admin panel.
**Design:** Clean and minimal, in the style of growthschool.io (see the reference screenshot). Colors are **white, red and black**.
**Stack:** Next.js + Supabase + Vercel + Bunny Stream (video).

---

## 1. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | **Next.js 15 (App Router) + TypeScript** | One codebase for the site, dashboard and admin. Server Actions handle the backend logic. Deploys to Vercel without extra setup. |
| Styling | **Tailwind CSS + shadcn/ui** | Fast and clean, and it makes the Growth School look easy to reproduce. |
| Hosting | **Vercel (Hobby, free, to start)** | Your choice is the right one. Move to Pro ($20/mo) only if you go commercial. |
| Database + Auth + Storage | **Supabase (Free tier, to start)** | Covers Postgres, auth, row-level security and file storage for module images and certificates. |
| Video | **Bunny Stream** (recommended) | It's the cheapest option, uses signed (token) URLs and lets you whitelist your domain. See section 9. |
| Certificate PDF | `pdf-lib` or `@react-pdf/renderer` (server-side) | Builds the PDF with no extra service. |
| Forms / validation | `react-hook-form` + `zod` | |
| Video player | Bunny's embed player (iframe + player.js API), or `hls.js` with a custom player | Lets the site track watch time and control seeking. |
| Charts (admin) | `recharts` | |

> **Note on Vercel Hobby:** its terms say Hobby is for non-commercial use. A free course is fine for now. If you start charging or running ads, upgrade to Pro.

---

## 2. Design System (based on the screenshot and Growth School)

**Font:** `IBM Plex Sans` (Growth School uses a similar clean grotesk). Use 600–700 for headings and 400–500 for body text.

**Colors**
```
--white:      #FFFFFF   page background
--cream:      #FAF7F2   soft card background (like the "FREE" card)
--black:      #0B0B0C   hero block, headings
--ink-2:      #2A2A2E   body text
--muted:      #6B6B73   secondary text
--red:        #E11D2E   primary CTA, accents, badges
--red-dark:   #B91524   CTA hover
--border:     #E7E5E4
--grid-line:  rgba(255,255,255,0.05)  faint grid pattern on the black hero
```

**Patterns taken from the reference**
- Navbar: logo on the left, links in the middle, outlined **Login** and **Sign up** buttons on the right.
- Hero: a big **black rounded card** (radius about 28px) with a faint grid pattern.
  - Small red uppercase eyebrow text (e.g. "SELF-PACED ◆ 10 MODULES")
  - Large white headline (48–60px)
  - Subtitle paragraph
  - White pill badges (date, hours of training, rating)
  - **Red CTA: "Claim your spot – FREE"**, which goes to `/signup`
  - Right side: a cream dotted card with "Total value ₹X → FREE", the seats/slots visual, a countdown and a line saying **"🎓 Free certificate on completion"**
- Module cards: **big image cards in a grid, not a list.** Each card has a large cover image, a large module number ("MODULE 01"), a bold title, the duration, and a lock or completion badge.
- Lots of white space, thin borders, soft shadows only on hover.

**Everything in the hero is editable from the admin panel** (eyebrow, title, subtitle, badges, CTA text, value price, countdown end date, slots number). See the `site_settings` table.

---

## 3. User Flow

```
Landing page (/)
   └─ "Claim your spot" ─► /signup
          └─ Sign up (name, email, phone, password) ─ no OTP, no email verification
                 └─ /onboarding  (school details, asked once before Module 1)
                        └─ /dashboard  (enrolled course card + WhatsApp contact button)
                               └─ /course/[slug]  (10 big module image cards)
                                      └─ /course/[slug]/module/[n]
                                             ├─ Video (tracked, no skipping ahead)
                                             ├─ Timed popups (if enabled for this module)
                                             ├─ Summary / notes
                                             └─ Quiz (MCQ) ─► pass ─► next module unlocks
                                                    ...
                               └─ After all 10 modules are done ─► /certificate ─► Download PDF
```

### 3.1 Auth (no OTP, simple)
- **Sign up:** full name, email, phone number, password.
- **Login:** email **or** phone number, plus password.
  - Supabase phone auth requires SMS OTP, so it isn't used. Instead, every user is created with **email + password**, and the phone number is saved in `profiles`.
  - When someone logs in with a phone number, a server action looks up the matching email (`get_email_by_phone` RPC, security definer) and then calls `signInWithPassword`.
- In Supabase, go to Auth → Providers → Email and **turn off "Confirm email"** so no verification code is sent.
- Optional later: a "Continue with Google" button (free and easy to add in Supabase).
- Forgot password: Supabase's reset-password email (optional; this is the one email that does get sent).

### 3.2 Onboarding (before Module 1)
Required fields, asked once and used on the certificate:
- Full name (as it should appear on the certificate)
- School name
- Designation (Principal / Teacher / Admin / Marketing head / Owner / Other)
- City, State
- School board (CBSE / ICSE / State / IB / Other)
- Approximate number of students
- WhatsApp number (pre-filled from the phone number)

### 3.3 Module unlock rule
- Module 1 is unlocked once onboarding is complete.
- Module N+1 unlocks when **both** of these are true for Module N:
  1. At least **90%** of the video has been watched (based on actual watched seconds, not just the seek position).
  2. The quiz is **passed** (default pass mark 60%, set per module; unlimited retries). If a module has no quiz, condition 1 alone is enough.
- The check runs **on the server** (a Postgres function), so nobody can unlock modules by editing the browser.

### 3.4 Video progress tracking
- The player sends a **heartbeat every 15 seconds** with `{module_id, position, seconds_watched_delta}`.
- **Seeking ahead is blocked:** the user can't seek past `max_position_reached`. Rewatching is allowed.
- Stored values: `watched_seconds`, `max_position`, `last_position` (for "Resume where you left off"), `completed_at`.
- Watch time only counts while the tab is visible and the video is playing.

### 3.5 Timed popups (only on modules you choose)
Admin settings per module:
- `popup_enabled` (on/off)
- `popup_interval_minutes` (5 / 10 / 15 / 20, or a custom value)
- `popup_type`:
  - **Attention check:** "Are you still watching? ✅ Continue". The video pauses until the user clicks. This keeps watch-time data honest.
  - **Message / CTA:** custom title + text + button (e.g. "Talk to our team on WhatsApp").
  - **Quick question:** one MCQ shown mid-video.
- The timer runs only while the video is playing.

### 3.6 Quiz (MCQ)
- Each module can have 0–N questions with 2–5 options each and one correct answer, plus an optional explanation.
- The admin sets the pass percentage per module.
- After submitting, the user sees their score and the correct answers (with explanations).
- All attempts are stored, so the admin can see scores.

### 3.7 Certificate
- Becomes available when all 10 modules are completed.
- The PDF is generated on the server and includes: name, school name, designation, course name, completion date, a unique certificate ID, and a QR code that links to `/verify/[certificate_id]`.
- It's stored in Supabase Storage and can be downloaded again at any time.
- The public `/verify/[id]` page lets anyone confirm the certificate is real, which helps with sharing on LinkedIn.
- The landing page, dashboard and course page all mention **"Get a free certificate after completing the course"**.

### 3.8 Contact the team
- A floating **WhatsApp button** on the dashboard and the course/module pages.
- It opens `https://wa.me/<number>?text=<prefilled message with user name + module>`.
- The number and the prefilled message are editable in the admin panel.

---

## 4. Admin Panel (`/admin`, role-protected)

| Section | Features |
|---|---|
| **Overview** | Total sign-ups, onboarded users, active in the last 7 days, certificates issued, average modules completed, a funnel chart (signup → onboarding → M1 → … → M10 → certificate) |
| **Users** | Searchable table: name, email, phone, school, designation, city, signup date, modules completed (e.g. 4/10), total minutes watched, last active, certificate yes/no. **Export CSV.** |
| **User detail** | Per-module breakdown: watched minutes / video minutes, % watched, quiz score and attempts, completed date. Admin can reset progress or manually unlock a module. |
| **Courses** | Create and edit courses: title, slug, description, cover image, published toggle. (Built for multiple courses even though there's one for now.) |
| **Modules** | Create, edit and reorder modules: number, title, subtitle, **cover image upload**, Bunny video ID, duration, summary (rich text), key takeaways, downloadable resources, **popup settings**, pass %, published toggle. |
| **Quiz builder** | Add, edit and reorder questions and options for each module, and mark the correct option. |
| **Site settings (CMS)** | Hero eyebrow, headline, subtitle, badges, CTA text, value price, countdown end, slots text, brand name, logo upload, WhatsApp number and message, footer text, certificate signatory name and signature image. |
| **Certificates** | List of issued certificates, with options to revoke or regenerate. |

Admin access: `profiles.role = 'admin'`, enforced by RLS policies and middleware.

---

## 5. Database Schema (Supabase / Postgres)

```sql
-- PROFILES (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text unique not null,
  phone text unique not null,
  role text not null default 'student' check (role in ('student','admin')),
  school_name text,
  designation text,
  city text,
  state text,
  school_board text,
  student_count text,
  whatsapp text,
  onboarded_at timestamptz,
  created_at timestamptz default now(),
  last_active_at timestamptz
);

-- SITE SETTINGS (single row of editable content)
create table site_settings (
  id int primary key default 1 check (id = 1),
  brand_name text,
  logo_url text,
  hero jsonb,            -- {eyebrow, title, subtitle, badges[], cta_text, value_price, countdown_end, slots_total, slots_left}
  whatsapp_number text,
  whatsapp_message text,
  footer jsonb,
  certificate jsonb,     -- {signatory_name, signatory_title, signature_url}
  updated_at timestamptz default now()
);

-- COURSES
create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  cover_url text,
  is_free boolean default true,
  is_published boolean default false,
  created_at timestamptz default now()
);

-- MODULES
create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses on delete cascade,
  position int not null,                 -- 1..10
  title text not null,
  subtitle text,
  cover_url text,
  video_provider_id text,                -- Bunny video GUID
  duration_seconds int not null default 0,
  summary text,                          -- rich text / markdown
  takeaways jsonb default '[]',
  resources jsonb default '[]',          -- [{label, url}]
  pass_percent int default 60,
  popup_enabled boolean default false,
  popup_interval_minutes int default 15,
  popup_type text default 'attention' check (popup_type in ('attention','message','question')),
  popup_content jsonb,                   -- {title, body, button_text, button_url} or question
  is_published boolean default true,
  unique (course_id, position)
);

-- ENROLLMENTS
create table enrollments (
  user_id uuid references profiles on delete cascade,
  course_id uuid references courses on delete cascade,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  primary key (user_id, course_id)
);

-- MODULE PROGRESS
create table module_progress (
  user_id uuid references profiles on delete cascade,
  module_id uuid references modules on delete cascade,
  watched_seconds int default 0,
  max_position int default 0,
  last_position int default 0,
  video_completed boolean default false,
  quiz_passed boolean default false,
  best_score int,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  primary key (user_id, module_id)
);

-- QUIZ
create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules on delete cascade,
  position int,
  question text not null,
  options jsonb not null,          -- ["A","B","C","D"]
  correct_index int not null,      -- never sent to the client before submission
  explanation text
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  module_id uuid references modules on delete cascade,
  answers jsonb,
  score int,
  passed boolean,
  created_at timestamptz default now()
);

-- CERTIFICATES
create table certificates (
  id text primary key,                   -- e.g. NGP-2026-7F3K9Q
  user_id uuid references profiles on delete cascade,
  course_id uuid references courses,
  pdf_url text,
  issued_at timestamptz default now(),
  revoked boolean default false,
  unique (user_id, course_id)
);
```

**RLS rules (summary)**
- `profiles`, `module_progress`, `quiz_attempts`, `enrollments`, `certificates`: a user can read and update **only their own rows**. Admins can read everything.
- `courses`, `modules`, `site_settings`: anyone can read published rows. Only admins can write.
- `quiz_questions`: **no direct client read** (to protect `correct_index`). Questions are served without answers through an RPC or server action, and grading happens on the server.
- Progress writes go through RPCs (`record_heartbeat`, `submit_quiz`) that check the unlock rules.

**Storage buckets:** `public-assets` (logo, module covers, public) and `certificates` (private, signed URLs).

---

## 6. Pages / Routes

```
/                         Landing (hero + course highlights + 10 module preview + FAQ + certificate note)
/login                    Email-or-phone + password
/signup                   Name, email, phone, password
/onboarding               School details (one time)
/dashboard                My course card, progress %, continue button, WhatsApp button
/course/[slug]            10 module image cards (locked / unlocked / completed)
/course/[slug]/module/[n] Video + popups + summary + quiz
/certificate              Generate / download
/verify/[id]              Public verification
/admin                    Overview
/admin/users, /admin/users/[id]
/admin/courses, /admin/courses/[id]/modules, /admin/modules/[id] (incl. quiz + popup settings)
/admin/settings           Site CMS
/admin/certificates
```

---

## 7. Folder Structure

```
nextgen-portal/
├─ app/
│  ├─ (marketing)/page.tsx
│  ├─ (auth)/login, signup
│  ├─ (student)/onboarding, dashboard, course/[slug]/..., certificate
│  ├─ verify/[id]
│  ├─ admin/...
│  └─ api/
│     ├─ video-token/route.ts     # returns signed Bunny embed URL (only if module unlocked)
│     └─ certificate/route.ts     # generates PDF
├─ components/ (ui/, hero/, module-card/, video-player/, quiz/, popup/, whatsapp-fab/)
├─ lib/ (supabase/server.ts, supabase/client.ts, bunny.ts, certificate.ts, validations.ts)
├─ supabase/migrations/*.sql
├─ middleware.ts                   # auth + admin route guard
└─ .env.local
```

**Environment variables**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_TOKEN_KEY=           # server only, for signed embed URLs
BUNNY_STREAM_API_KEY=             # server only, for admin uploads
NEXT_PUBLIC_SITE_URL=
```

---

## 8. Build Phases

| Phase | Scope | Est. |
|---|---|---|
| **1. Setup** | Next.js, Tailwind, shadcn, Supabase project, migrations, RLS, Vercel deploy | 1 day |
| **2. Landing + Auth** | Hero (CMS-driven), sign up, login with email or phone, middleware | 2 days |
| **3. Onboarding + Dashboard** | School form, dashboard, WhatsApp button | 1 day |
| **4. Course + Modules UI** | Image card grid, lock states, module page, summary | 2 days |
| **5. Video + Tracking** | Bunny signed embed, heartbeat, seek block, resume, popups | 2–3 days |
| **6. Quiz + Unlock logic** | Quiz UI, server grading, unlock RPC | 1–2 days |
| **7. Certificate** | PDF generation, storage, verify page | 1 day |
| **8. Admin panel** | Users and progress, course/module CRUD, quiz builder, popup settings, site CMS, CSV export | 3–4 days |
| **9. Polish + QA** | Mobile responsiveness, SEO, OG image, analytics, load test | 1–2 days |
| **Total** | | **about 2.5–3 weeks** |

---

## 9. Video Hosting: Cheap and Hidden

**What you need:** a cheap host where viewers can't find the source or copy a link and share it.

| Option | Cost for your case (2 hrs of video) | Link protection | Verdict |
|---|---|---|---|
| **Bunny Stream** ⭐ | Storage about **$0.01/GB/mo** (2 hrs ≈ 3–5 GB with all resolutions ≈ **$0.05/mo**). Delivery about **$0.005–0.01/GB**. One learner watching all 2 hrs at 720p ≈ 1 GB, so **1,000 learners ≈ $5–10.** Free encoding. | Token-signed embed URLs that expire, domain allow-list, hidden direct-play URLs, optional basic DRM (MediaCage), watermark option | **Recommended.** It's the cheapest by far and has good protection. |
| Cloudflare Stream | $5 per 1,000 min stored + $1 per 1,000 min delivered. 1,000 learners × 120 min = **about $125** | Signed URLs, domain restriction | Good, but much more expensive at scale |
| Mux | Pay per minute encoded, stored and streamed; similar to or higher than Cloudflare | Signed playback | Developer-friendly, but costs more |
| Vimeo (Starter/Standard) | $12–25+/month, flat | Domain-level privacy | Shows Vimeo branding and source hints, and has a monthly fee |
| YouTube Unlisted | Free | ❌ The link is easy to extract and share, and it shows YouTube branding | **Not recommended** |
| Supabase Storage (raw MP4) | Cheap storage, but egress is billed and there's no adaptive streaming | Weak (the MP4 URL can be downloaded) | Not recommended |

*(Prices are approximate. Check the current pricing pages before you buy.)*

**How the protection works in this plan**
1. Videos are uploaded to Bunny Stream, and the video GUID is saved in `modules.video_provider_id`.
2. The browser **never stores** a permanent link. When a module page opens, the server checks login and unlock status, then creates a **signed embed URL that expires in about 2 hours** (`/api/video-token`).
3. In Bunny, turn on **Allowed Domains** (only your domain) and **Block direct URL access**, and enable **token authentication**.
4. Optionally, show a light **watermark overlay** with the user's email or phone number to discourage screen recording.
5. Bunny's player uses no Bunny branding, so viewers don't see which platform hosts the video.

> No web video is 100% copy-proof, because anyone can screen-record. These steps stop link sharing, hotlinking and casual downloading, which covers what you need for a free course.

---

## 10. Other Suggestions

1. **Analytics:** Vercel Analytics (free) + Microsoft Clarity (free heatmaps) to see where people drop off on the landing page.
2. **Lead value:** you're collecting school leads, so add a **"Book a free consultation"** popup type and a CSV export for sales follow-up.
3. **Anti-spam:** Cloudflare Turnstile (free) on sign-up, since there's no OTP. It stops bot sign-ups.
4. **Domain + email:** a custom domain on Vercel, plus Resend (free tier) if you later want welcome or "certificate ready" emails.
5. **Backups:** Supabase Free tier has no daily backups and pauses after 7 days of inactivity. Move to **Supabase Pro ($25/mo)** once real users arrive.
6. **Multi-course ready:** the schema already supports multiple courses and paid courses (`is_free`). Payments (Razorpay) can be added later without a rewrite.
7. **Certificate shareability:** add an "Add to LinkedIn" button on the certificate page for free marketing.
8. **Mobile first:** most school staff will watch on phones. Module cards stack to one column, and the video is full-width.

---

## 11. Monthly Cost Estimate (launch stage)

| Item | Cost |
|---|---|
| Vercel Hobby | $0 (Pro $20 if commercial) |
| Supabase Free | $0 (Pro $25 when you scale) |
| Bunny Stream (up to about 1,000 full watch-throughs) | about $5–10 |
| Domain | about ₹800–1,000/year |
| **Total** | **about $5–10/month to start** |

---

## 12. Open Questions for You

1. Exact **brand name and logo** file (to replace the placeholder).
2. The **10 module titles** and cover images, or should placeholder designs be generated?
3. Should the quiz pass mark be **60%**, or should passing be required at all?
4. Which modules need popups, and which popup type (attention check or WhatsApp CTA)?
5. The WhatsApp number for "Contact the team".
6. Certificate signatory name, title and signature image.
7. Should sign-up also offer **Google login**?
