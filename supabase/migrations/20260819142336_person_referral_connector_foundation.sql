-- Localized.life Version 1 identity and referral foundation.
--
-- Personal Numbers identify the universal Person record. SR and AR numbers are
-- private operational ledger references used to distinguish organic sponsored
-- referrals from founder-approved assigned referrals.

create sequence public.people_personal_number_seq as bigint;

alter table public.people
  add column personal_number bigint;

with ordered_people as (
  select
    id,
    row_number() over (order by created_at, id)::bigint as personal_number
  from public.people
)
update public.people person
set personal_number = ordered.personal_number
from ordered_people ordered
where ordered.id = person.id;

select setval(
  'public.people_personal_number_seq',
  greatest(coalesce((select max(personal_number) from public.people), 1), 1),
  exists (select 1 from public.people)
);

alter sequence public.people_personal_number_seq
  owned by public.people.personal_number;

alter table public.people
  alter column personal_number set default nextval('public.people_personal_number_seq'),
  alter column personal_number set not null;

create unique index people_personal_number_idx
  on public.people (personal_number);

revoke all on sequence public.people_personal_number_seq from public, anon, authenticated;
grant usage, select on sequence public.people_personal_number_seq to service_role;

comment on column public.people.personal_number is
  'Permanent universal Person sequence. Display as PN- plus a zero-padded number when an authorized interface needs it.';

-- Phone is the primary human lookup and deduplication field. The UUID remains
-- the permanent database identity because phone numbers may change or be
-- reassigned by a carrier.
create or replace function exchange_private.normalize_person_phone(input_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  digits text := regexp_replace(coalesce(input_phone, ''), '[^0-9]', '', 'g');
begin
  if digits = '' then
    return null;
  elsif char_length(digits) = 10 then
    return '+1' || digits;
  elsif char_length(digits) = 11 and left(digits, 1) = '1' then
    return '+' || digits;
  elsif char_length(digits) between 8 and 15 then
    return '+' || digits;
  end if;

  return null;
end;
$$;

alter table public.people
  add column phone_normalized text;

update public.people
set phone_normalized = exchange_private.normalize_person_phone(phone);

create index people_phone_normalized_lookup_idx
  on public.people (phone_normalized)
  where phone_normalized is not null;

create unique index people_claimed_phone_normalized_idx
  on public.people (phone_normalized)
  where phone_normalized is not null and claim_status = 'claimed';

create or replace function exchange_private.set_person_phone_normalized()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone_normalized := exchange_private.normalize_person_phone(new.phone);
  return new;
end;
$$;

create trigger people_set_phone_normalized
before insert or update of phone on public.people
for each row execute function exchange_private.set_person_phone_normalized();

revoke execute on function exchange_private.normalize_person_phone(text)
  from public, anon, authenticated;
revoke execute on function exchange_private.set_person_phone_normalized()
  from public, anon, authenticated;
grant execute on function exchange_private.normalize_person_phone(text) to service_role;
grant execute on function exchange_private.set_person_phone_normalized() to service_role;

comment on column public.people.phone_normalized is
  'Private canonical phone used for Person lookup and duplicate detection; not a permanent database identifier.';

-- Independent internal SR and AR sequences. Existing direct attributions are
-- classified from their recorded source and numbered in captured order.
create sequence public.sponsored_referral_number_seq as bigint;
create sequence public.assigned_referral_number_seq as bigint;

alter table public.person_referral_attributions
  add column referral_type text,
  add column internal_sequence_number bigint,
  add column assigned_by_person_id uuid references public.people (id) on delete set null,
  add column assignment_reason text check (
    assignment_reason is null or char_length(assignment_reason) <= 1000
  );

update public.person_referral_attributions
set
  referral_type = case
    when source_type in ('manual_assignment', 'assigned_referral') then 'assigned'
    else 'sponsored'
  end,
  assigned_by_person_id = case
    when source_type in ('manual_assignment', 'assigned_referral')
      and coalesce(metadata ->> 'assigned_by_person_id', '') ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
      then (metadata ->> 'assigned_by_person_id')::uuid
    else null
  end;

with numbered_referrals as (
  select
    id,
    row_number() over (
      partition by referral_type
      order by captured_at, created_at, id
    )::bigint as internal_sequence_number
  from public.person_referral_attributions
)
update public.person_referral_attributions attribution
set internal_sequence_number = numbered.internal_sequence_number
from numbered_referrals numbered
where numbered.id = attribution.id;

select setval(
  'public.sponsored_referral_number_seq',
  greatest(coalesce((
    select max(internal_sequence_number)
    from public.person_referral_attributions
    where referral_type = 'sponsored'
  ), 1), 1),
  exists (
    select 1 from public.person_referral_attributions where referral_type = 'sponsored'
  )
);

select setval(
  'public.assigned_referral_number_seq',
  greatest(coalesce((
    select max(internal_sequence_number)
    from public.person_referral_attributions
    where referral_type = 'assigned'
  ), 1), 1),
  exists (
    select 1 from public.person_referral_attributions where referral_type = 'assigned'
  )
);

alter table public.person_referral_attributions
  alter column referral_type set not null,
  alter column internal_sequence_number set not null,
  add constraint person_referral_attributions_type_check
    check (referral_type in ('sponsored', 'assigned'));

create unique index person_referral_attributions_internal_number_idx
  on public.person_referral_attributions (referral_type, internal_sequence_number);

create index person_referral_attributions_assigned_fairness_idx
  on public.person_referral_attributions (
    referrer_person_id,
    captured_at desc,
    internal_sequence_number desc
  )
  where referral_type = 'assigned' and status in ('captured', 'confirmed');

create index person_referral_attributions_assigned_by_idx
  on public.person_referral_attributions (assigned_by_person_id, captured_at desc)
  where assigned_by_person_id is not null;

create or replace function exchange_private.set_referral_internal_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.internal_sequence_number is null then
    new.internal_sequence_number := case new.referral_type
      when 'assigned' then nextval('public.assigned_referral_number_seq')
      else nextval('public.sponsored_referral_number_seq')
    end;
  end if;
  return new;
end;
$$;

create trigger person_referral_set_internal_number
before insert on public.person_referral_attributions
for each row execute function exchange_private.set_referral_internal_number();

revoke all on sequence public.sponsored_referral_number_seq from public, anon, authenticated;
revoke all on sequence public.assigned_referral_number_seq from public, anon, authenticated;
grant usage, select on sequence public.sponsored_referral_number_seq to service_role;
grant usage, select on sequence public.assigned_referral_number_seq to service_role;
revoke execute on function exchange_private.set_referral_internal_number()
  from public, anon, authenticated;
grant execute on function exchange_private.set_referral_internal_number() to service_role;

comment on column public.person_referral_attributions.referral_type is
  'Internal route: sponsored for a real direct introduction, assigned for a founder-approved system allocation.';
comment on column public.person_referral_attributions.internal_sequence_number is
  'Private immutable order within the SR or AR ledger. Never expose as a public or member-facing identifier.';
comment on column public.person_referral_attributions.assigned_by_person_id is
  'Founder or authorized operator who made the final assigned-referral decision.';

-- Connector profiles are private capability records. Public intake uses Local
-- Services, and an assigned Connector is shown only inside an authorized account.
drop policy if exists "Active connector profiles are public" on public.connector_profiles;
revoke select on table public.connector_profiles from anon, authenticated;

comment on table public.connector_profiles is
  'Private Connector capability and operational profile. Connector discovery is not a public directory.';

-- Version 1 keeps household collaboration simple while allowing a designated
-- owner alongside the existing manager/member roles.
alter table public.household_memberships
  drop constraint if exists household_memberships_role_check;

alter table public.household_memberships
  add constraint household_memberships_role_check
  check (role in ('owner', 'manager', 'member'));
