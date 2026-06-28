alter table public.local_submissions
  drop constraint if exists local_submissions_submission_area_check;

alter table public.local_submissions
  add constraint local_submissions_submission_area_check
  check (submission_area in ('market', 'event', 'service', 'mentor'));
