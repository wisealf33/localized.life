drop policy if exists "People can read their own identity" on public.people;
create policy "People can read their own identity"
  on public.people for select
  to authenticated
  using (
    (select auth.uid()) = auth_user_id
    or (
      auth_user_id is null
      and email is not null
      and lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
    )
  );

drop policy if exists "People can link an invited identity" on public.people;
create policy "People can link an invited identity"
  on public.people for update
  to authenticated
  using (
    auth_user_id is null
    and email is not null
    and lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
  )
  with check (
    auth_user_id = (select auth.uid())
    and email is not null
    and lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
  );
