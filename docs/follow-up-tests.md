# Localized.life Follow-up Tests

Use this file for things that should not get lost between Codex threads.

## Needs Attention

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
