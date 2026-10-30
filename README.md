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

Cloudflare Workers Builds should use `npm run build`. This runs OpenNext, which calls `npm run build:next` for the framework build and then produces `.open-next/worker.js` and `.open-next/assets`. The separate `buildCommand` in `open-next.config.ts` prevents recursion. Use `npm run build:next` only when you specifically need the plain Next.js output.

PR builds can use `npx wrangler preview` as their deploy command; the required empty `previews` block is included in `wrangler.jsonc`. Configure preview runtime variables/secrets in Cloudflare's Previews Base settings using staging resources; production settings are not automatically inherited. Validate packaging locally with `npm run build` followed by `npx wrangler deploy --dry-run` (no upload). Production deployment remains a separate action.

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

## Venue time zones, invoice dates, and agreed pay terms

Apply `supabase/migrations/018_job_time_and_pay_terms.sql` after 017 **before deploying this version**. The migration runs in a transaction. Test it against a staging copy first. Do not merge to the auto-deploying main branch until the database is ready.

- New jobs require an explicit venue IANA time zone. Job entry, admin lists, technician schedules/calendars, and new invoice snapshots use that zone. Midnight end times do not add an extra calendar/work day. Missing end times retain the existing 24-hour booking window.
- Existing job timestamps are not shifted or assigned a guessed zone. They display in UTC with a confirmation notice. Open **Job schedule → Edit**, choose the venue zone, verify the redisplayed call times, and save. Changing the selector redisplays the saved instants; edit the times separately if the original call was wrong. New offers and invoices are blocked until the venue zone is confirmed. Historic invoices remain unchanged and identify their original zone as unrecorded.
- Local call times in daylight-saving gaps or repeated hours are rejected with an explanation rather than silently choosing an instant. Invoice duration continues to use the established wall-clock billing policy (including overnight shifts), not elapsed DST-adjusted hours.
- The database derives each new offer's numeric amount and billing basis from the saved job and offered rate. Existing parsable rates are backfilled; ambiguous legacy rates stay unresolved and require release/reissue. Offer identity, position, rate, amount, and basis are immutable. To change terms, release and reissue the offer for technician acceptance. Active offers prevent changing the job's billing basis; cancelled offers cannot be revived. Job-row locks serialize offer creation with billing-basis changes.
- Invoice submission verifies venue-local work dates are inside the job's date window, rejects future work/unfinished clock-outs, sets the issue date on the server, and requires the due date to be on or after it. Billing uses the frozen offer rate and basis. Additional work dates require an admin to extend the schedule first; overtime on a valid date remains supported. Existing duplicate-date, clock-time, ownership, completion, and one-invoice-per-offer checks remain in force.

Validation: `npm ci`, `npm test`, `npm run build`, and `npx opennextjs-cloudflare build`. Tests run the actual scheduling/billing migrations in embedded PostgreSQL (PGlite), using a minimal Auth fixture and excluding the unrelated Storage migration. They do not access production Supabase. PGlite is single-session: before rollout, also exercise two concurrent admin sessions against staging (send offer while changing pay basis; confirm while editing dates). Verify no committed offer has terms inconsistent with the job and that one conflicting operation fails. Test technician invoice submission and calendar dates with browsers in different device zones.

## Split shifts and approved return-call payments (migration 019)

Apply `supabase/migrations/019_split_shift_return_calls.sql` in Supabase SQL Editor after migration 018 **before** deploying the related app code. This migration does not change previously saved invoices.

The technician invoice form supports multiple on-clock work periods per venue-local job date, including an overnight return call. Off-clock gaps are not paid work. The existing 1-hour lunch deduction applies only if explicitly selected and actual worked hours exceed 10; off-clock breaks between separate periods are not a lunch deduction.

By default, split work periods share the same daily 10-hour threshold: day-rate jobs pay one full day minimum plus 1.5× overtime after 10 worked billable hours; hourly jobs bill normal hours then 1.5× overtime. The day rate is **never applied twice** for a split shift on the same date.

An administrator may approve an optional **one-time flat return-call amount** on an offer, or add it to an existing booking before invoice submission. The tech can then mark one *additional* work period as a flat return call. This replaces ordinary pay/OT for that period, rather than stacking with it. The server calculates invoice totals from frozen agreed terms. The admin cannot edit a return-call agreement after its invoice is saved.

Example: `10:00–18:00` (8 hours, $400 guaranteed day rate) and `21:00–02:00` (5 hours, $240 approved return call) = **13 worked hours, $640 total**. Without a flat return-call agreement, the same shifts yield $400 + 3 OT hours × $60 = $580. Actual pay terms must match what the parties agreed and applicable laws; use this setting only for legitimately agreed fixed return-call compensation.

### Important limits

- One flat return-call work period per invoice. Additional periods use ordinary shared daily rate/overtime rules.
- Up to 8 work periods per work date; no overlapping time ranges, including when a period ends the next day.
- New invoices validate work dates against the event dates in the **venue's saved time zone**.
- Older single-period invoices remain readable with their original amounts and historical overtime rules.
- This does not automatically infer off-clock breaks from a job's overall start/end time. For multi-period jobs, the estimated payout is shown as pending until actual work periods are recorded.

### Regression testing

`npm test` includes split-shift pay calculations and Postgres-based SQL tests, including tampered client totals, unapproved return-call amounts, overlapping periods, and historical single-shift invoices.

