create index connector_claim_invitations_connector_idx
  on public.connector_claim_invitations (connector_person_id, created_at desc);

create index connector_claim_invitations_created_by_idx
  on public.connector_claim_invitations (created_by_person_id, created_at desc);

create policy "Connector claim invitations are server only"
  on public.connector_claim_invitations for all
  to anon, authenticated
  using (false)
  with check (false);
