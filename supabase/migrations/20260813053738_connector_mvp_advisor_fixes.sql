drop index if exists public.people_auth_user_idx;

create index if not exists needs_household_idx
  on public.needs (household_id)
  where household_id is not null;

create index if not exists needs_assigned_person_idx
  on public.needs (assigned_person_id)
  where assigned_person_id is not null;

create index if not exists needs_connection_made_by_idx
  on public.needs (connection_made_by_person_id)
  where connection_made_by_person_id is not null;

create index if not exists connector_interactions_connector_idx
  on public.connector_interactions (connector_person_id, occurred_at desc);

create index if not exists connector_interactions_need_idx
  on public.connector_interactions (need_id)
  where need_id is not null;

drop policy if exists "People can read their own identity" on public.people;
create policy "People can read their own identity"
  on public.people for select
  to authenticated
  using (
    (select auth.uid()) = auth_user_id
    or (
      auth_user_id is null
      and email is not null
      and lower(email) = lower(coalesce((select (auth.jwt() ->> 'email')), ''))
    )
  );

drop policy if exists "People can link an invited identity" on public.people;
create policy "People can link an invited identity"
  on public.people for update
  to authenticated
  using (
    auth_user_id is null
    and email is not null
    and lower(email) = lower(coalesce((select (auth.jwt() ->> 'email')), ''))
  )
  with check (
    auth_user_id = (select auth.uid())
    and email is not null
    and lower(email) = lower(coalesce((select (auth.jwt() ->> 'email')), ''))
  );

create policy "Members cannot read private connector interaction notes"
  on public.connector_interactions for select
  to authenticated
  using (false);
