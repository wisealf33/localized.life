create policy "Service role manages local submissions"
  on public.local_submissions for all
  to service_role
  using (true)
  with check (true);
