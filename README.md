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

## Phase 1 safety upgrades

### Supabase migrations (required before using the changes)
Apply the following files in this order, after 001–015:
1. `supabase/migrations/016_prevent_double_bookings.sql`
2. `supabase/migrations/017_retain_invoice_records.sql`

Migration 016 prevents overlapping **confirmed** technician bookings, including conflicting job schedule edits. It leaves overlapping offers and accepted-but-unconfirmed offers available. It also reports existing conflicts without deleting them. Confirmed jobs with no end time are treated as 24 hours long; admins should set accurate end times.

Migration 017 retains submitted invoice snapshots if technician accounts are later removed. Sensitive billing contact fields remain accessible to admins; set a documented record-retention policy and handle legal deletion requests appropriately.

### Password recovery
The sign-in screen links to `/forgot-password`; Supabase emails an account recovery link that returns to `/reset-password`. Add `https://app.avselect.tech/reset-password` (and any alternate production domains) to the Supabase Auth **Redirect URLs** allowlist. Configure and test email delivery in Supabase before inviting a larger crew. Password recovery sends email, never SMS.

### CI, deployment and hands-on verification
The GitHub Actions `Verify AV Select` workflow runs unit tests, a Next.js build, and an OpenNext packaging build on pushes and pull requests. It does **not** inspect or confirm the live Cloudflare deployment. Check Cloudflare's deployment status separately.

Before using these changes with real paid jobs, run a two-account pilot:
- Create two overlapping job offers for the same technician and accept both.
- Confirm the first; confirm the second and verify Supabase rejects it.
- Move an already-confirmed job to overlap another booked shift; verify Supabase rejects the edit.
- Try adjacent shifts where one ends exactly when another begins; verify both can be confirmed.
- Request a password reset via email and verify it works on iPhone and Android.
- Submit a test invoice, then delete the test technician and verify the admin invoice remains available.

### Still to complete
Admin MFA enforcement, verified automated database backups, email/push job notifications, invoice approval/corrections/payment states, and multi-day call times are separate follow-up phases. No SMS is planned.
