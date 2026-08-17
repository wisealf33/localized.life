-- Calendar contacts are relationships to universal People, not a separate
-- customer identity. Keep only provider-private scheduling details here.

alter table public.account_customers rename to account_calendar_people;
alter table public.account_appointments rename column customer_id to calendar_person_id;

alter index public.account_customers_owner_idx rename to account_calendar_people_owner_idx;
alter index public.account_appointments_customer_idx rename to account_appointments_calendar_person_idx;

alter table public.account_calendar_people
  add column person_id uuid,
  add column service_address_line1 text
    check (service_address_line1 is null or char_length(service_address_line1) <= 240),
  add column service_address_line2 text
    check (service_address_line2 is null or char_length(service_address_line2) <= 240),
  add column service_city text
    check (service_city is null or char_length(service_city) <= 120),
  add column service_state text
    check (service_state is null or service_state ~ '^[A-Z]{2}$'),
  add column service_postal_code text
    check (service_postal_code is null or char_length(service_postal_code) <= 20),
  add column service_country_code text not null default 'US'
    check (service_country_code ~ '^[A-Z]{2}$');

-- Preserve any calendar contacts created before this migration. Reuse a
-- matching Person when contact information identifies one; otherwise create
-- a universal unclaimed Person using the calendar row's UUID.
update public.account_calendar_people calendar_person
set person_id = (
  select person.id
  from public.people person
  where (
    calendar_person.email is not null
    and person.email is not null
    and lower(person.email) = lower(calendar_person.email)
  ) or (
    calendar_person.phone is not null
    and person.phone = calendar_person.phone
  )
  order by
    case when calendar_person.email is not null and lower(person.email) = lower(calendar_person.email) then 0 else 1 end,
    person.created_at
  limit 1
)
where calendar_person.person_id is null;

insert into public.people (
  id,
  display_name,
  email,
  phone,
  created_by_person_id,
  claim_status,
  created_at,
  updated_at
)
select
  calendar_person.id,
  calendar_person.display_name,
  calendar_person.email,
  calendar_person.phone,
  calendar_person.owner_person_id,
  'unclaimed',
  calendar_person.created_at,
  calendar_person.updated_at
from public.account_calendar_people calendar_person
where calendar_person.person_id is null;

update public.account_calendar_people
set person_id = id
where person_id is null;

update public.account_calendar_people
set service_address_line1 = address
where address is not null;

alter table public.account_calendar_people
  alter column person_id set not null,
  add constraint account_calendar_people_person_id_fkey
    foreign key (person_id) references public.people (id) on delete restrict;

alter table public.account_calendar_people rename column notes to private_notes;

drop index public.account_calendar_people_owner_idx;

create unique index account_calendar_people_owner_person_idx
  on public.account_calendar_people (owner_person_id, person_id);

create index account_calendar_people_owner_status_idx
  on public.account_calendar_people (owner_person_id, status, person_id);

alter table public.account_calendar_people
  drop column display_name,
  drop column email,
  drop column phone,
  drop column address;

alter policy "Service role manages private account customers"
  on public.account_calendar_people
  rename to "Service role manages private account calendar people";

comment on table public.account_calendar_people is
  'Provider-private scheduling details for a universal Person; roles such as provider and customer are contextual, not identity types.';

comment on column public.account_calendar_people.service_address_line1 is
  'Street address used for this provider relationship; geocoding coordinates are derived separately.';

comment on column public.account_appointments.calendar_person_id is
  'Provider-private calendar relationship whose Person is attending this appointment.';
