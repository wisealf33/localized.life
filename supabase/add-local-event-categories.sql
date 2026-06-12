alter table public.local_events
  drop constraint if exists local_events_event_type_check;

alter table public.local_events
  add constraint local_events_event_type_check
  check (
    event_type in (
      'city_wide_garage_sale',
      'community_sale',
      'festival',
      'vendor_market',
      'craft_fair',
      'flea_market',
      'swap_meet',
      'farmers_market',
      'local_market',
      'workshop_class',
      'plant_swap',
      'community_day'
    )
  );

update public.local_events
set event_type = 'festival',
    updated_at = now()
where event_type = 'local_market'
  and title ilike '%festival%';
