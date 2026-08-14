-- One account-owned library for services, goods, events, mentoring, and
-- requests. Moderation status remains separate from the owner's lifecycle so
-- a Person can pause or close a post without losing its history.

create table if not exists public.local_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_area text not null
    check (submission_area in ('market', 'event', 'service', 'mentor')),
  post_type text not null
    check (post_type in ('service', 'goods', 'event', 'mentoring', 'request')),
  owner_person_id uuid references public.people (id) on delete set null,
  owner_state text not null default 'active'
    check (owner_state in ('active', 'paused', 'closed', 'removed')),
  title text not null,
  category text,
  name text,
  contact text,
  submitter_email text,
  city text,
  state text,
  website_url text,
  description text not null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'approved', 'rejected')),
  admin_notes text,
  manage_token_hash text,
  manage_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.local_submissions
  add column if not exists post_type text
    check (post_type in ('service', 'goods', 'event', 'mentoring', 'request')),
  add column if not exists owner_person_id uuid references public.people (id) on delete set null,
  add column if not exists owner_state text not null default 'active'
    check (owner_state in ('active', 'paused', 'closed', 'removed'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.local_submissions'::regclass
      and conname = 'local_submissions_owner_person_id_fkey'
  ) then
    alter table public.local_submissions
      add constraint local_submissions_owner_person_id_fkey
      foreign key (owner_person_id) references public.people (id) on delete set null;
  end if;
end
$$;

update public.local_submissions
set post_type = case
  when submission_area = 'market' then 'goods'
  when submission_area = 'event' then 'event'
  when submission_area = 'mentor' then 'mentoring'
  when submission_area = 'service' and title ilike 'Request:%' then 'request'
  else 'service'
end
where post_type is null;

alter table public.local_submissions
  alter column post_type set not null;

create index if not exists local_submissions_status_idx
  on public.local_submissions (submission_area, status, created_at desc);

create unique index if not exists local_submissions_manage_token_hash_idx
  on public.local_submissions (manage_token_hash)
  where manage_token_hash is not null;

create index if not exists local_submissions_owner_idx
  on public.local_submissions (owner_person_id, owner_state, updated_at desc)
  where owner_person_id is not null;

alter table public.local_submissions enable row level security;

revoke all on table public.local_submissions from public, anon, authenticated;
grant all on table public.local_submissions to service_role;

comment on column public.local_submissions.owner_person_id is
  'Claimed Person who owns and manages this post through the private account API.';

comment on column public.local_submissions.owner_state is
  'Owner-controlled lifecycle, intentionally separate from moderation status.';
