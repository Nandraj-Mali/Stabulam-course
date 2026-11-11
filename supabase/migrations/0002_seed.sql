-- Seed: site settings + the first course with 10 modules (edit everything later from /admin)

insert into public.site_settings (id, brand_name, brand_tagline, hero, whatsapp_number, whatsapp_message, footer_text, certificate)
values (
  1,
  'Stabulam',
  'School',
  jsonb_build_object(
    'eyebrow', 'SELF-PACED ◆ 10 MODULES ◆ 2 HOURS',
    'title', 'Digital Marketing for Schools',
    'subtitle', 'Learn how to fill your admissions with Google, Instagram, WhatsApp and smart content. Built for principals, owners and school marketing teams. Free certificate on completion.',
    'badges', jsonb_build_array('10 VIDEO MODULES', '~2 HOURS OF TRAINING', 'FREE CERTIFICATE'),
    'cta_text', 'Claim your spot for',
    'value_price', '₹4,999',
    'offer_title', 'Final Call: Limited Free Seats!',
    'slots_total', 11,
    'slots_filled', 9,
    'countdown_end', (now() + interval '7 days')::text,
    'certificate_note', '🎓 Get a free certificate after completing the course'
  ),
  '919999999999',
  'Hi! I have a question about the Digital Marketing for Schools course.',
  '© Stabulam. All rights reserved.',
  jsonb_build_object('signatory_name', 'Course Director', 'signatory_title', 'Stabulam')
)
on conflict (id) do nothing;

with c as (
  insert into public.courses (slug, title, description)
  values (
    'digital-marketing-for-schools',
    'Digital Marketing for Schools',
    'A practical, 10-module course that shows schools how to attract more parents, build trust online and grow admissions.'
  )
  on conflict (slug) do update set title = excluded.title
  returning id
)
insert into public.modules (course_id, position, title, subtitle, summary, popup_enabled, popup_interval_minutes)
select c.id, v.position, v.title, v.subtitle, v.summary, v.popup, 15
from c, (values
  (1,  'Digital Marketing Foundations', 'Why every school needs it in 2026', 'How parents search for and choose schools today, and the core channels that matter.', false),
  (2,  'Your School Brand Identity', 'Positioning, story & visuals', 'Define what makes your school different and present it consistently everywhere.', false),
  (3,  'Websites That Convert Parents', 'Landing pages & enquiry forms', 'Turn your website into an admissions machine with clear pages and strong calls to action.', true),
  (4,  'Google Business & Local SEO', 'Show up when parents search nearby', 'Set up and optimise your Google Business Profile, reviews and local search ranking.', false),
  (5,  'Social Media Strategy', 'Instagram, Facebook & YouTube', 'Plan a simple, consistent posting system that builds trust with parents.', true),
  (6,  'Content Parents Love', 'Reels, stories & testimonials', 'Create high-performing content from everyday school life with just a phone.', false),
  (7,  'Paid Ads for Admissions', 'Meta & Google ads made simple', 'Run small-budget ad campaigns that bring real admission enquiries.', true),
  (8,  'WhatsApp Marketing', 'Broadcasts, follow-ups & automation', 'Use WhatsApp to nurture leads and stay connected with parents.', false),
  (9,  'Admission Funnel & CRM', 'From enquiry to enrolment', 'Track every lead, follow up on time and improve your conversion rate.', false),
  (10, 'Measure & Your 90-Day Plan', 'Metrics that matter + action plan', 'Read the numbers, double down on what works and leave with a 90-day plan.', false)
) as v(position, title, subtitle, summary, popup)
on conflict (course_id, position) do nothing;

-- Sample quiz for Module 1 (edit / add more in /admin)
insert into public.quiz_questions (module_id, position, question, options, correct_index, explanation)
select m.id, q.position, q.question, q.options::jsonb, q.correct_index, q.explanation
from public.modules m
join public.courses c on c.id = m.course_id and c.slug = 'digital-marketing-for-schools'
cross join (values
  (1, 'Where do most parents start their search for a new school today?', '["Newspaper ads","Google search & maps","Radio","Pamphlets"]', 1, 'Most parents begin with a Google search or Google Maps for schools near them.'),
  (2, 'Which of these builds the most trust with new parents?', '["Stock photos","Genuine parent testimonials","Long brochures","Discount offers"]', 1, 'Real stories from current parents are the strongest trust signal.'),
  (3, 'What is a "lead" in school marketing?', '["A teacher","A parent who has shown interest / enquired","A school bus route","A newspaper"]', 1, 'A lead is any parent who has enquired or shown interest in admission.')
) as q(position, question, options, correct_index, explanation)
where m.position = 1
  and not exists (select 1 from public.quiz_questions qq where qq.module_id = m.id);
