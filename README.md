# NextGen Portal

A free course platform for schools (digital marketing), built with **Next.js 15 + Supabase + Bunny Stream** and deployed on **Vercel**.
See [`PLAN.md`](./PLAN.md) for the full product plan.

## Features
- Landing page in the Growth School style (white / red / black). The hero is fully editable from the admin panel.
- Sign up with name, email, phone and password, with no OTP. Users log in with **email or phone** plus password.
- One-time onboarding form (school name, designation, city, board…) before Module 1.
- Large module image cards. Modules **unlock one by one**: the user must watch ≥90% of the video and pass the quiz.
- Video player with watch-time tracking, **no skipping ahead**, resume, a viewer watermark and **timed popups** on chosen modules.
- MCQ quizzes, graded on the server (answers never reach the browser).
- Free **PDF certificate** with a QR code and a public `/verify/[id]` page.
- Floating **WhatsApp "Contact the team"** button.
- **Admin panel** (`/admin`): overview funnel, every user's progress (minutes watched, modules done, quiz scores), CSV export, course/module editor with image upload, popup settings, quiz builder, site settings and certificates.

## Setup

### 1. Supabase
1. Create a project (Mumbai `ap-south-1` region recommended).
2. **SQL Editor** → run `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_seed.sql`.
3. **Authentication → Sign In / Providers → Email**: turn **OFF "Confirm email"**. This removes the email verification code.
4. **Project Settings → API**: copy the URL, anon key and service_role key into `.env.local`.

### 2. Environment
```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000
```

### 3. Make yourself admin
Sign up on the site, then run this in the Supabase SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
Then open `/admin`.

### 4. Videos (Bunny Stream)
1. bunny.net → **Stream** → create a Video Library.
2. Upload each module video and copy its **Video ID**.
3. Library → **Security**: enable **Token authentication**, enable **Block direct URL file access**, and add your domain to **Allowed domains**.
4. Put the Library ID and Token Authentication Key in `.env.local`.
5. In `/admin/modules/<module>`, paste the Video ID and save.

For quick testing without Bunny, you can paste a direct `.mp4` URL in the module editor instead.

### 5. Deploy to Vercel
Push to GitHub → import the repo in Vercel → add the same env variables (set `NEXT_PUBLIC_SITE_URL` to your live domain) → deploy.

## Project structure
```
app/
  page.tsx                     landing
  (auth)/login, signup         auth pages + server actions
  onboarding/                  school details form
  dashboard/                   learner dashboard
  course/[slug]/               module grid
  course/[slug]/module/[n]/    video + popups + quiz
  certificate/, verify/[id]/   certificate download + public verification
  admin/                       admin panel
  api/certificate/[id]         PDF generation
  api/admin/export             users CSV
lib/                           supabase clients, auth guards, bunny signing, certificate PDF
supabase/migrations/           database schema, RLS, functions, seed data
```

## Security notes
- All progress, unlock and quiz logic runs in Postgres functions (`record_heartbeat`, `submit_quiz`, `is_module_unlocked`). It can't be faked from the browser, and watch time is capped by real elapsed time.
- Raw video IDs are hidden from browsers (column-level grants). Students only receive a signed embed URL that expires.
- `SUPABASE_SERVICE_ROLE_KEY` is used only on the server. Never expose it.
