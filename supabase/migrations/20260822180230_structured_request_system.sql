-- Extend the existing moderated submission record with a structured request
-- envelope. Legacy submissions remain valid because every new field is
-- nullable (or has a safe default) unless request_schema_version is set.

alter table public.local_submissions
  add column if not exists request_schema_version smallint,
  add column if not exists request_broad_type text,
  add column if not exists request_category_id text,
  add column if not exists request_subcategory_id text,
  add column if not exists request_answers jsonb not null default '{}'::jsonb,
  add column if not exists service_intent text,
  add column if not exists timing_preference text,
  add column if not exists requested_date date,
  add column if not exists requested_date_end date,
  add column if not exists time_windows text[] not null default '{}'::text[],
  add column if not exists cadence_frequency text,
  add column if not exists cadence_days text[] not null default '{}'::text[],
  add column if not exists cadence_time_windows text[] not null default '{}'::text[],
  add column if not exists desired_start_period text,
  add column if not exists schedule_flexibility text,
  add column if not exists generated_summary text,
  add column if not exists request_status text,
  add column if not exists workflow_status text;

alter table public.local_submissions
  drop constraint if exists local_submissions_request_schema_version_check,
  add constraint local_submissions_request_schema_version_check
    check (request_schema_version is null or request_schema_version >= 1),
  drop constraint if exists local_submissions_request_broad_type_check,
  add constraint local_submissions_request_broad_type_check
    check (request_broad_type is null or request_broad_type in ('meals', 'home_help', 'items', 'information', 'other_request')),
  drop constraint if exists local_submissions_service_intent_check,
  add constraint local_submissions_service_intent_check
    check (service_intent is null or service_intent in ('one_time', 'ongoing')),
  drop constraint if exists local_submissions_timing_preference_check,
  add constraint local_submissions_timing_preference_check
    check (timing_preference is null or timing_preference in ('specific_date', 'date_range', 'within_week', 'as_soon_as_possible', 'flexible')),
  drop constraint if exists local_submissions_request_status_check,
  add constraint local_submissions_request_status_check
    check (request_status is null or request_status in ('open', 'fulfilled', 'closed', 'cancelled')),
  drop constraint if exists local_submissions_workflow_status_check,
  add constraint local_submissions_workflow_status_check
    check (workflow_status is null or workflow_status in (
      'finding_right_person',
      'first_service_scheduled',
      'waiting_compatibility_decision',
      'trying_another_provider',
      'ongoing_relationship_established',
      'closed',
      'cancelled'
    )),
  drop constraint if exists local_submissions_structured_request_shape_check,
  add constraint local_submissions_structured_request_shape_check
    check (
      request_schema_version is null
      or (
        post_type = 'request'
        and request_broad_type is not null
        and request_category_id is not null
        and generated_summary is not null
        and request_status is not null
        and workflow_status is not null
      )
    ),
  drop constraint if exists local_submissions_request_date_order_check,
  add constraint local_submissions_request_date_order_check
    check (requested_date_end is null or requested_date is null or requested_date_end >= requested_date);

create index if not exists local_submissions_owner_requests_idx
  on public.local_submissions (owner_person_id, updated_at desc)
  where post_type = 'request' and owner_person_id is not null;

create index if not exists local_submissions_request_category_idx
  on public.local_submissions (request_broad_type, request_category_id, owner_state, updated_at desc)
  where post_type = 'request';

create index if not exists local_submissions_request_timing_idx
  on public.local_submissions (service_intent, requested_date, cadence_frequency)
  where post_type = 'request' and owner_state = 'active';

create index if not exists local_submissions_request_workflow_idx
  on public.local_submissions (workflow_status, request_status, updated_at desc)
  where post_type = 'request' and owner_state = 'active';

create index if not exists local_submissions_request_answers_gin_idx
  on public.local_submissions using gin (request_answers jsonb_path_ops)
  where post_type = 'request' and request_schema_version is not null;

comment on column public.local_submissions.request_schema_version is
  'Null identifies a legacy generic request; version 2 identifies the progressive structured request shape.';

comment on column public.local_submissions.request_answers is
  'Category-specific answers. Broad type, category, intent, timing, location, lifecycle, and summary remain typed columns.';

comment on column public.local_submissions.workflow_status is
  'Request-level compatibility workflow. It does not select, rank, or score a provider.';
