create index referral_coordinators_created_by_idx
  on public.referral_coordinators (created_by_person_id)
  where created_by_person_id is not null;
