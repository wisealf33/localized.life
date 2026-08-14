create index exchange_accounts_person_fk_idx
  on public.exchange_accounts (person_id)
  where person_id is not null;

create index exchange_entries_transaction_program_fk_idx
  on public.exchange_entries (transaction_id, program_id);

create index exchange_entries_account_program_fk_idx
  on public.exchange_entries (account_id, program_id);
