alter table public.sales
  add column if not exists outreach_private_done boolean not null default false,
  add column if not exists outreach_private_done_at timestamptz,
  add column if not exists outreach_group_done boolean not null default false,
  add column if not exists outreach_group_done_at timestamptz,
  add column if not exists event_id uuid;

alter table public.sales
  drop constraint if exists sales_outreach_status_check;

alter table public.sales
  add constraint sales_outreach_status_check check (
    outreach_status in (
      'not_contacted',
      'message_sent',
      'comment_posted',
      'localized_group_posted',
      'follow_up_needed',
      'outreach_complete',
      'claimed',
      'do_not_contact',
      'removed'
    )
  );
