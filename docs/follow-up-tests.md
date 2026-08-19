# Localized.life Follow-up Tests

Use this file for things that should not get lost between Codex threads.

## Needs Attention

- [ ] Apply the Localized.life Person/referral/Connector foundation migration to the live database before deploying the matching application code.
  - File: `supabase/migrations/20260819140656_person_referral_connector_foundation.sql`
  - Why: the account and referral APIs now use Personal Numbers, normalized phones, private Connector profiles, and the internal SR/AR fields introduced by this migration.
  - Test after applying: create one sponsored referral and one founder-approved assigned referral; confirm their internal numbers advance independently and the assigned Person sees only their private Connector inside the account.

- [ ] Apply the Local Mentors Supabase migration to the live submissions database.
  - File: `supabase/add-local-mentors-submissions.sql`
  - Why: mentor submissions use `submission_area = 'mentor'`, and the live database must allow that value.
  - Test after applying: submit a test Local Mentors listing, confirm it appears in admin review, then remove the test entry.

## Standard Pre-Push Test

- [ ] Run lint.
- [ ] Run production build.
- [ ] Check homepage on mobile and desktop.
- [ ] Check the changed public page on mobile and desktop.
- [ ] Confirm the live URL after deployment.
- [ ] Confirm the sitemap includes any new public page.

## Live URLs To Check

- Homepage: https://www.localized.life/
- Local Mentors: https://www.localized.life/local-mentors
- Sitemap: https://www.localized.life/sitemap.xml
