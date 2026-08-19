alter table public.people
  add column services_wanted text[] not null default '{}';

grant select (services_wanted) on public.people to authenticated;

comment on column public.people.services_wanted is
  'Operational service tags a Person may want help with. A Person may offer and want the same service.';
