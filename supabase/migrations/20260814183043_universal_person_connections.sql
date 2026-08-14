-- Universal claimed-Person connections and reusable private claim links.
--
-- These records are intentionally separate from connector_relationships.
-- A connection is available to every claimed Person. A Connector relationship
-- remains an optional manager/coordinator relationship with its own tools.

create table public.person_connections (
  id uuid primary key default gen_random_uuid(),
  person_one_id uuid not null references public.people (id) on delete cascade,
  person_two_id uuid not null references public.people (id) on delete cascade,
  introduced_by_person_id uuid references public.people (id) on delete set null,
  connection_source text not null default 'personal_introduction'
    check (connection_source ~ '^[a-z][a-z0-9_]{0,63}$'),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  connected_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (person_one_id <> person_two_id),
  check (person_one_id::text < person_two_id::text),
  check ((status = 'active' and ended_at is null) or status = 'inactive')
);

create unique index person_connections_pair_idx
  on public.person_connections (person_one_id, person_two_id);

create index person_connections_person_one_idx
  on public.person_connections (person_one_id, status, connected_at desc);

create index person_connections_person_two_idx
  on public.person_connections (person_two_id, status, connected_at desc);

create index person_connections_introduced_by_idx
  on public.person_connections (introduced_by_person_id, connected_at desc)
  where introduced_by_person_id is not null;

create table public.person_claim_invitations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  referring_person_id uuid not null references public.people (id) on delete cascade,
  created_by_person_id uuid not null references public.people (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (person_id <> referring_person_id),
  check (claimed_at is null or revoked_at is null)
);

create index person_claim_invitations_person_idx
  on public.person_claim_invitations (person_id, created_at desc);

create index person_claim_invitations_referrer_idx
  on public.person_claim_invitations (referring_person_id, created_at desc);

create index person_claim_invitations_created_by_idx
  on public.person_claim_invitations (created_by_person_id, created_at desc);

create unique index person_claim_invitations_one_active_idx
  on public.person_claim_invitations (person_id, referring_person_id)
  where claimed_at is null and revoked_at is null;

alter table public.person_connections enable row level security;
alter table public.person_claim_invitations enable row level security;

revoke all on table public.person_connections from public, anon, authenticated;
revoke all on table public.person_claim_invitations from public, anon, authenticated;

grant all on table public.person_connections to service_role;
grant all on table public.person_claim_invitations to service_role;

create policy "Service role manages Person connections"
  on public.person_connections for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages Person claim invitations"
  on public.person_claim_invitations for all
  to service_role
  using (true)
  with check (true);

-- Preserve existing Connector relationships as ordinary connections too. The
-- Connector relationship itself remains unchanged and continues to power the
-- additional manager tools.
insert into public.person_connections (
  person_one_id,
  person_two_id,
  introduced_by_person_id,
  connection_source,
  connected_at,
  created_at,
  updated_at
)
select
  case
    when relationship.connector_person_id::text < relationship.person_id::text
      then relationship.connector_person_id
    else relationship.person_id
  end,
  case
    when relationship.connector_person_id::text < relationship.person_id::text
      then relationship.person_id
    else relationship.connector_person_id
  end,
  relationship.connector_person_id,
  'connector_relationship',
  relationship.started_at,
  relationship.created_at,
  relationship.updated_at
from public.connector_relationships relationship
where relationship.person_id is not null
  and relationship.status = 'active'
on conflict (person_one_id, person_two_id) do nothing;

comment on table public.person_connections is
  'Private Person-to-Person connections available to every claimed Localized.life account.';

comment on table public.person_claim_invitations is
  'Reusable private claim links created through personalized Person introductions.';
