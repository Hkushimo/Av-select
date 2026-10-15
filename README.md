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
4. Job creation, matching, and individual/bulk email offers.

## Cloudflare deployment
The Cloudflare Worker uses OpenNext. The build and runtime environments both require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. After adding or changing build variables, start a new GitHub-triggered build so Next.js includes them.

## Invitation deployment
Cloudflare auto-deploys changes from the main branch. The invitation API requires the server-side `SUPABASE_SECRET_KEY` Worker secret and an allowed Supabase Auth redirect URL ending in `/invite`.
