create table if not exists public.monetization_leads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'other' check (
    category in (
      'local_sponsor',
      'print_partner',
      'estate_sale_company',
      'citywide_partner',
      'affiliate',
      'local_business',
      'grant',
      'other'
    )
  ),
  status text not null default 'idea' check (
    status in (
      'idea',
      'researching',
      'contacted',
      'interested',
      'not_fit',
      'active'
    )
  ),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  area text,
  company_name text,
  contact_name text,
  contact_email text,
  contact_url text,
  estimated_value text,
  fit_notes text,
  next_step text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists monetization_leads_status_idx
  on public.monetization_leads (status, priority, updated_at desc);

alter table public.monetization_leads enable row level security;
