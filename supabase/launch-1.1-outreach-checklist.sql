alter table public.sales
  add column if not exists outreach_private_done boolean not null default false,
  add column if not exists outreach_private_done_at timestamptz,
  add column if not exists outreach_group_done boolean not null default false,
  add column if not exists outreach_group_done_at timestamptz;
