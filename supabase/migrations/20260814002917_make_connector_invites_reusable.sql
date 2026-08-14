alter table public.connector_claim_invitations
  alter column expires_at drop not null;

-- Active invitations use their random UUID as the private bearer token. This lets
-- the Connector retrieve the same link without storing a second plaintext secret.
update public.connector_claim_invitations
set
  token_hash = encode(sha256(convert_to(id::text, 'UTF8')), 'hex'),
  expires_at = null
where claimed_at is null
  and revoked_at is null;
