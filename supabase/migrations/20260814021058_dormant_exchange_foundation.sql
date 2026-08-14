-- Dormant community exchange foundation.
--
-- This migration intentionally creates no program, balance, reward, or public UI.
-- It preserves facts, rules, and value movements as separate layers so the
-- eventual product name and operating rules can change without rewriting history.

create schema exchange_private;

revoke all on schema exchange_private from public, anon, authenticated;
grant usage on schema exchange_private to service_role;

create table public.person_referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referred_person_id uuid not null references public.people (id) on delete restrict,
  referrer_person_id uuid not null references public.people (id) on delete restrict,
  source_type text not null default 'direct'
    check (source_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  source_reference text check (source_reference is null or char_length(source_reference) <= 240),
  status text not null default 'captured'
    check (status in ('captured', 'confirmed', 'voided')),
  supersedes_attribution_id uuid references public.person_referral_attributions (id) on delete restrict,
  captured_at timestamptz not null default now(),
  confirmed_at timestamptz,
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(void_reason) <= 1000),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (referred_person_id <> referrer_person_id),
  check (supersedes_attribution_id is null or supersedes_attribution_id <> id),
  check (
    (status = 'captured' and confirmed_at is null and voided_at is null)
    or (status = 'confirmed' and confirmed_at is not null and voided_at is null)
    or (status = 'voided' and voided_at is not null)
  )
);

create unique index person_referral_attributions_one_current_idx
  on public.person_referral_attributions (referred_person_id)
  where status in ('captured', 'confirmed');

create index person_referral_attributions_referred_idx
  on public.person_referral_attributions (referred_person_id);

create index person_referral_attributions_referrer_idx
  on public.person_referral_attributions (referrer_person_id, status, captured_at desc);

create index person_referral_attributions_supersedes_idx
  on public.person_referral_attributions (supersedes_attribution_id);

create table public.community_activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_.]{0,95}$'),
  event_version smallint not null default 1 check (event_version > 0),
  actor_person_id uuid references public.people (id) on delete restrict,
  beneficiary_person_id uuid references public.people (id) on delete restrict,
  source_type text not null check (source_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  source_reference text not null check (char_length(source_reference) between 1 and 240),
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 240),
  reverses_event_id uuid references public.community_activity_events (id) on delete restrict,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  recorded_by_person_id uuid references public.people (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  check (actor_person_id is not null or beneficiary_person_id is not null),
  check (reverses_event_id is null or reverses_event_id <> id)
);

create index community_activity_events_actor_idx
  on public.community_activity_events (actor_person_id, occurred_at desc)
  where actor_person_id is not null;

create index community_activity_events_beneficiary_idx
  on public.community_activity_events (beneficiary_person_id, occurred_at desc)
  where beneficiary_person_id is not null;

create index community_activity_events_source_idx
  on public.community_activity_events (source_type, source_reference);

create index community_activity_events_reversal_idx
  on public.community_activity_events (reverses_event_id)
  where reverses_event_id is not null;

create index community_activity_events_recorded_by_idx
  on public.community_activity_events (recorded_by_person_id)
  where recorded_by_person_id is not null;

create table public.exchange_programs (
  id uuid primary key default gen_random_uuid(),
  internal_key text not null unique check (internal_key ~ '^[a-z][a-z0-9_-]{0,63}$'),
  status text not null default 'draft'
    check (status in ('draft', 'configured', 'active', 'paused', 'retired')),
  display_name text check (display_name is null or char_length(trim(display_name)) between 1 and 80),
  unit_singular text check (unit_singular is null or char_length(trim(unit_singular)) between 1 and 40),
  unit_plural text check (unit_plural is null or char_length(trim(unit_plural)) between 1 and 40),
  unit_symbol text check (unit_symbol is null or char_length(trim(unit_symbol)) between 1 and 12),
  decimal_places smallint not null default 0 check (decimal_places between 0 and 6),
  community_scope jsonb not null default '{}'::jsonb
    check (jsonb_typeof(community_scope) = 'object'),
  configuration jsonb not null default '{}'::jsonb
    check (jsonb_typeof(configuration) = 'object'),
  activated_at timestamptz,
  paused_at timestamptz,
  retired_at timestamptz,
  created_by_person_id uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status not in ('active', 'paused', 'retired')
    or (display_name is not null and unit_singular is not null and unit_plural is not null)
  ),
  check (status <> 'active' or activated_at is not null),
  check (status <> 'paused' or paused_at is not null),
  check (status <> 'retired' or retired_at is not null)
);

create table public.exchange_accounts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.exchange_programs (id) on delete restrict,
  person_id uuid references public.people (id) on delete restrict,
  account_kind text not null
    check (account_kind in ('person', 'treasury', 'escrow', 'clearing', 'adjustment')),
  system_key text check (system_key is null or system_key ~ '^[a-z][a-z0-9_-]{0,63}$'),
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'held', 'closed')),
  opened_at timestamptz,
  held_at timestamptz,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, program_id),
  check (
    (account_kind = 'person' and person_id is not null and system_key is null)
    or (account_kind <> 'person' and person_id is null and system_key is not null)
  ),
  check (status <> 'active' or opened_at is not null),
  check (status <> 'held' or held_at is not null),
  check (status <> 'closed' or closed_at is not null)
);

create index exchange_programs_created_by_idx
  on public.exchange_programs (created_by_person_id)
  where created_by_person_id is not null;

create index exchange_accounts_program_idx
  on public.exchange_accounts (program_id);

create unique index exchange_accounts_person_idx
  on public.exchange_accounts (program_id, person_id)
  where person_id is not null;

create unique index exchange_accounts_system_idx
  on public.exchange_accounts (program_id, system_key)
  where system_key is not null;

create table public.exchange_rule_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.exchange_programs (id) on delete cascade,
  rule_key text not null check (rule_key ~ '^[a-z][a-z0-9_.-]{0,95}$'),
  version integer not null check (version > 0),
  rule_kind text not null check (rule_kind ~ '^[a-z][a-z0-9_]{0,63}$'),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'active', 'retired')),
  configuration jsonb not null default '{}'::jsonb
    check (jsonb_typeof(configuration) = 'object'),
  effective_from timestamptz,
  effective_until timestamptz,
  created_by_person_id uuid references public.people (id) on delete set null,
  approved_by_person_id uuid references public.people (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (program_id, rule_key, version),
  check (effective_until is null or effective_from is null or effective_until > effective_from),
  check (status not in ('approved', 'active', 'retired') or approved_at is not null),
  check (status <> 'active' or effective_from is not null)
);

create unique index exchange_rule_versions_one_active_idx
  on public.exchange_rule_versions (program_id, rule_key)
  where status = 'active';

create index exchange_rule_versions_program_status_idx
  on public.exchange_rule_versions (program_id, status, effective_from desc);

create index exchange_rule_versions_created_by_idx
  on public.exchange_rule_versions (created_by_person_id)
  where created_by_person_id is not null;

create index exchange_rule_versions_approved_by_idx
  on public.exchange_rule_versions (approved_by_person_id)
  where approved_by_person_id is not null;

create table public.exchange_transactions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.exchange_programs (id) on delete restrict,
  transaction_kind text not null check (transaction_kind ~ '^[a-z][a-z0-9_]{0,63}$'),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'posted', 'void')),
  source_event_id uuid references public.community_activity_events (id) on delete restrict,
  source_type text check (source_type is null or source_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  source_reference text check (source_reference is null or char_length(source_reference) between 1 and 240),
  idempotency_key text check (idempotency_key is null or char_length(idempotency_key) between 1 and 240),
  reverses_transaction_id uuid references public.exchange_transactions (id) on delete restrict,
  fair_value_amount_minor bigint check (fair_value_amount_minor is null or fair_value_amount_minor >= 0),
  fair_value_currency text check (fair_value_currency is null or fair_value_currency ~ '^[A-Z]{3}$'),
  effective_at timestamptz not null default now(),
  posted_at timestamptz,
  voided_at timestamptz,
  created_by_person_id uuid references public.people (id) on delete set null,
  approved_by_person_id uuid references public.people (id) on delete set null,
  description text check (description is null or char_length(description) <= 1000),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, program_id),
  check ((source_type is null) = (source_reference is null)),
  check ((fair_value_amount_minor is null) = (fair_value_currency is null)),
  check (reverses_transaction_id is null or reverses_transaction_id <> id),
  check ((status = 'posted') = (posted_at is not null)),
  check ((status = 'void') = (voided_at is not null))
);

create unique index exchange_transactions_idempotency_idx
  on public.exchange_transactions (program_id, idempotency_key)
  where idempotency_key is not null;

create index exchange_transactions_program_status_idx
  on public.exchange_transactions (program_id, status, effective_at desc);

create index exchange_transactions_source_event_idx
  on public.exchange_transactions (source_event_id)
  where source_event_id is not null;

create index exchange_transactions_reversal_idx
  on public.exchange_transactions (reverses_transaction_id)
  where reverses_transaction_id is not null;

create index exchange_transactions_created_by_idx
  on public.exchange_transactions (created_by_person_id)
  where created_by_person_id is not null;

create index exchange_transactions_approved_by_idx
  on public.exchange_transactions (approved_by_person_id)
  where approved_by_person_id is not null;

create table public.exchange_entries (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  transaction_id uuid not null,
  account_id uuid not null,
  amount_minor bigint not null check (amount_minor <> 0),
  entry_role text not null default 'principal'
    check (entry_role ~ '^[a-z][a-z0-9_]{0,63}$'),
  description text check (description is null or char_length(description) <= 500),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (transaction_id, program_id)
    references public.exchange_transactions (id, program_id) on delete restrict,
  foreign key (account_id, program_id)
    references public.exchange_accounts (id, program_id) on delete restrict
);

create index exchange_entries_transaction_idx
  on public.exchange_entries (transaction_id);

create index exchange_entries_account_idx
  on public.exchange_entries (account_id, created_at desc);

create function exchange_private.prevent_community_activity_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Community activity events are immutable; record a reversal event instead.';
end;
$$;

create trigger community_activity_events_immutable
  before update or delete on public.community_activity_events
  for each row execute function exchange_private.prevent_community_activity_event_mutation();

create function exchange_private.guard_exchange_entry_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status text;
  parent_transaction_id uuid;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Exchange entries are immutable; replace entries only by deleting a draft transaction.';
  end if;

  if tg_op = 'DELETE' then
    parent_transaction_id := old.transaction_id;
  else
    parent_transaction_id := new.transaction_id;
  end if;

  select txn.status
  into parent_status
  from public.exchange_transactions txn
  where txn.id = parent_transaction_id;

  if parent_status is null then
    raise exception 'Exchange transaction was not found.';
  end if;

  if tg_op = 'INSERT' and parent_status <> 'draft' then
    raise exception 'Entries can only be added to a draft exchange transaction.';
  end if;

  if tg_op = 'DELETE' and parent_status <> 'draft' then
    raise exception 'Entries can only be removed from a draft exchange transaction.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger exchange_entries_guard
  before insert or update or delete on public.exchange_entries
  for each row execute function exchange_private.guard_exchange_entry_mutation();

create function exchange_private.guard_exchange_transaction_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  entry_count integer;
  account_count integer;
  entry_total numeric;
  inactive_account_count integer;
  program_status text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'Exchange transactions must be created as drafts.';
    end if;
    new.posted_at := null;
    new.voided_at := null;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Only draft exchange transactions can be deleted.';
    end if;
    return old;
  end if;

  if old.status in ('posted', 'void') then
    raise exception 'Posted and void exchange transactions are immutable; record a reversal transaction instead.';
  end if;

  if old.status = 'pending' and new.status not in ('posted', 'void') then
    raise exception 'A pending exchange transaction can only be posted or voided.';
  end if;

  if old.status = 'draft' and new.status not in ('draft', 'pending', 'void') then
    raise exception 'A draft exchange transaction must be reviewed before it can be posted.';
  end if;

  if new.status in ('pending', 'posted') and new.status is distinct from old.status then
    select count(*), count(distinct entry.account_id), coalesce(sum(entry.amount_minor), 0)
    into entry_count, account_count, entry_total
    from public.exchange_entries entry
    where entry.transaction_id = new.id;

    if entry_count < 2 or account_count < 2 or entry_total <> 0 then
      raise exception 'An exchange transaction requires at least two accounts and balanced entries.';
    end if;
  end if;

  if new.status = 'posted' and old.status is distinct from 'posted' then
    select program.status
    into program_status
    from public.exchange_programs program
    where program.id = new.program_id;

    if program_status is distinct from 'active' then
      raise exception 'The exchange program must be active before transactions can be posted.';
    end if;

    select count(*)
    into inactive_account_count
    from public.exchange_entries entry
    join public.exchange_accounts account on account.id = entry.account_id
    where entry.transaction_id = new.id
      and account.status <> 'active';

    if inactive_account_count > 0 then
      raise exception 'All exchange accounts must be active before a transaction can be posted.';
    end if;

    new.posted_at := coalesce(new.posted_at, now());
    new.voided_at := null;
  elsif new.status = 'void' and old.status is distinct from 'void' then
    new.voided_at := coalesce(new.voided_at, now());
    new.posted_at := null;
  else
    new.posted_at := null;
    new.voided_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger exchange_transactions_guard
  before insert or update or delete on public.exchange_transactions
  for each row execute function exchange_private.guard_exchange_transaction_mutation();

alter table public.person_referral_attributions enable row level security;
alter table public.community_activity_events enable row level security;
alter table public.exchange_programs enable row level security;
alter table public.exchange_accounts enable row level security;
alter table public.exchange_rule_versions enable row level security;
alter table public.exchange_transactions enable row level security;
alter table public.exchange_entries enable row level security;

revoke all on table public.person_referral_attributions from public, anon, authenticated;
revoke all on table public.community_activity_events from public, anon, authenticated;
revoke all on table public.exchange_programs from public, anon, authenticated;
revoke all on table public.exchange_accounts from public, anon, authenticated;
revoke all on table public.exchange_rule_versions from public, anon, authenticated;
revoke all on table public.exchange_transactions from public, anon, authenticated;
revoke all on table public.exchange_entries from public, anon, authenticated;

grant all on table public.person_referral_attributions to service_role;
grant all on table public.community_activity_events to service_role;
grant all on table public.exchange_programs to service_role;
grant all on table public.exchange_accounts to service_role;
grant all on table public.exchange_rule_versions to service_role;
grant all on table public.exchange_transactions to service_role;
grant all on table public.exchange_entries to service_role;

create policy "Referral attributions are dormant and server only"
  on public.person_referral_attributions for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Community activity events are dormant and server only"
  on public.community_activity_events for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Exchange programs are dormant and server only"
  on public.exchange_programs for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Exchange accounts are dormant and server only"
  on public.exchange_accounts for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Exchange rules are dormant and server only"
  on public.exchange_rule_versions for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Exchange transactions are dormant and server only"
  on public.exchange_transactions for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Exchange entries are dormant and server only"
  on public.exchange_entries for all
  to anon, authenticated
  using (false)
  with check (false);

revoke execute on function exchange_private.prevent_community_activity_event_mutation()
  from public, anon, authenticated;
revoke execute on function exchange_private.guard_exchange_entry_mutation()
  from public, anon, authenticated;
revoke execute on function exchange_private.guard_exchange_transaction_mutation()
  from public, anon, authenticated;

grant execute on function exchange_private.prevent_community_activity_event_mutation()
  to service_role;
grant execute on function exchange_private.guard_exchange_entry_mutation()
  to service_role;
grant execute on function exchange_private.guard_exchange_transaction_mutation()
  to service_role;

comment on table public.person_referral_attributions is
  'Private direct-referral provenance. It is separate from who created a Person record.';
comment on table public.community_activity_events is
  'Immutable real-world activity facts that may later be evaluated by versioned exchange rules.';
comment on table public.exchange_programs is
  'Configurable closed-loop community exchange programs. No program is created by this migration.';
comment on table public.exchange_accounts is
  'Program accounts for people and system functions. Balances are derived from posted ledger entries.';
comment on table public.exchange_rule_versions is
  'Versioned earning, spending, eligibility, limit, and settlement rules.';
comment on table public.exchange_transactions is
  'Exchange transaction headers. Posted transactions are immutable and corrected by reversals.';
comment on table public.exchange_entries is
  'Signed, balanced, smallest-unit ledger entries. Their sum per transaction must be zero.';
