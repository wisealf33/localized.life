-- Preserve whole-day availability while allowing several precise windows on a day.
alter table public.account_calendar_availability
  drop constraint account_calendar_availability_status_check;

alter table public.account_calendar_availability
  add column time_windows jsonb not null default '[]'::jsonb,
  add constraint account_calendar_availability_status_check
    check (status in ('open', 'custom', 'closed')),
  add constraint account_calendar_availability_time_windows_array_check
    check (
      jsonb_typeof(time_windows) = 'array'
      and jsonb_array_length(time_windows) <= 12
    ),
  add constraint account_calendar_availability_status_windows_check
    check (
      (status = 'custom' and jsonb_array_length(time_windows) > 0)
      or (status in ('open', 'closed') and time_windows = '[]'::jsonb)
    );

comment on column public.account_calendar_availability.time_windows is
  'Local-time availability periods represented as [{"start":"09:00","end":"12:00"}].';

comment on table public.account_calendar_availability is
  'Private per-person daily availability: all day, specific local-time periods, or unavailable.';
