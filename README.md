# AV Select

Private, invite-only AV technician roster and job dispatch platform.

## Stack
Next.js, TypeScript, Tailwind CSS, Supabase Auth/Postgres/RLS, and Resend for job-offer emails.

## Confirmed product decisions
- Invite-only technician onboarding.
- Four-step, 3–5 minute questionnaire: contact/location, positions, equipment familiarity, travel preferences.
- Only admins assign official skill proficiency ratings.
- Technician roster is private to admins.
- Technicians accept or decline job offers; admins manage final staffing.

## Supabase
Project URL: `https://jgkfpdqywmpxrititttl.supabase.co`

Keep all secret keys out of Git. Configure environment variables in deployment settings or a local `.env.local` file.

## Planned phases
1. Application scaffold, authentication, database schema, and row-level security.
2. Invitations and technician onboarding.
3. Admin roster, equipment skills, and ratings.
4. Job creation, matching, and individual/bulk job offers.

## Cloudflare deployment
The Cloudflare Worker uses OpenNext. The build and runtime environments both require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. After adding or changing build variables, start a new GitHub-triggered build so Next.js includes them.

## Invitation deployment
Cloudflare auto-deploys changes from the main branch. The admin dashboard generates a 7-day, single-use link with no email address required. Android's native share sheet lets the admin choose any messaging app. The recipient enters their own email/password on `/invite` and completes onboarding. Run `supabase/migrations/002_share_invites.sql` in Supabase SQL Editor before testing. The server API requires the `SUPABASE_SECRET_KEY` Cloudflare runtime secret. Supabase Auth email/password sign-in must be enabled; the platform still does not expose public technician registration.

## Technician profiles and photos
The mobile account navigation provides Sign in / Log out and a My profile page for technicians. Returning technicians can edit their earlier onboarding selections. Profile photos are optional and are stored in the private Supabase Storage bucket `technician-avatars`; uploads are limited to JPG, PNG, or WebP of at most 5 MB. Technicians and administrators can access photos under storage policies. **Run `supabase/migrations/003_technician_avatars.sql` in Supabase SQL Editor before using the updated roster/profile features.**

Cloudflare rebuild trigger: technician profile navigation and optional private avatar upload feature.
