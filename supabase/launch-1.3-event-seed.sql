insert into public.local_events (
  slug,
  title,
  event_type,
  description,
  address_line,
  city,
  state,
  zip,
  county,
  starts_at,
  ends_at,
  event_schedule,
  source_url,
  source_platform,
  source_notes
) values
(
  'peotone-city-wide-garage-sale-days-2026',
  'Peotone City-Wide Garage Sale Days',
  'city_wide_garage_sale',
  'Official community garage sale days for Peotone. Individual household sale times and details may vary.',
  '208 E Main St',
  'Peotone',
  'IL',
  '60468',
  'Will County',
  '2026-06-12T08:00:00-05:00',
  '2026-06-13T16:00:00-05:00',
  'Friday, June 12 8 AM-4 PM
Saturday, June 13 8 AM-4 PM',
  'https://villageofpeotone.com/event/peotone-community-garage-sale-days-3/',
  'Village website',
  'Seeded from official Village of Peotone event page.'
),
(
  'monee-city-wide-garage-sale-june-2026',
  'Monee City-Wide Garage Sale - June',
  'city_wide_garage_sale',
  'City-wide garage sale dates listed by the Village of Monee. Individual household sale times and details may vary.',
  '5130 W Court St',
  'Monee',
  'IL',
  '60449',
  'Will County',
  '2026-06-05T08:00:00-05:00',
  '2026-06-06T17:00:00-05:00',
  'Friday, June 5 8 AM-5 PM
Saturday, June 6 8 AM-5 PM',
  'https://villageofmonee.org/447/Garage-Sale',
  'Village website',
  'Seeded from official Village of Monee garage sale page.'
),
(
  'monee-city-wide-garage-sale-july-2026',
  'Monee City-Wide Garage Sale - July',
  'city_wide_garage_sale',
  'City-wide garage sale dates listed by the Village of Monee. Individual household sale times and details may vary.',
  '5130 W Court St',
  'Monee',
  'IL',
  '60449',
  'Will County',
  '2026-07-24T08:00:00-05:00',
  '2026-07-25T17:00:00-05:00',
  'Friday, July 24 8 AM-5 PM
Saturday, July 25 8 AM-5 PM',
  'https://villageofmonee.org/447/Garage-Sale',
  'Village website',
  'Seeded from official Village of Monee garage sale page.'
),
(
  'henry-city-wide-garage-sales-2026',
  'City of Henry City-Wide Garage Sales',
  'city_wide_garage_sale',
  'City-wide garage sales in Henry. Maps may be available through city/local pickup spots.',
  '101 Oak Ln',
  'Henry',
  'IL',
  '61537',
  'Marshall County',
  '2026-05-22T08:00:00-05:00',
  '2026-05-23T15:00:00-05:00',
  'Friday, May 22 8 AM-3 PM
Saturday, May 23 8 AM-3 PM',
  null,
  'Public Facebook post screenshot',
  'Seeded from manually reviewed public post screenshot.'
)
on conflict (slug) do update set
  title = excluded.title,
  event_type = excluded.event_type,
  description = excluded.description,
  address_line = excluded.address_line,
  city = excluded.city,
  state = excluded.state,
  zip = excluded.zip,
  county = excluded.county,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  event_schedule = excluded.event_schedule,
  source_url = excluded.source_url,
  source_platform = excluded.source_platform,
  source_notes = excluded.source_notes,
  updated_at = now();

update public.sales
set event_id = event.id
from public.local_events event
where event.slug = 'peotone-city-wide-garage-sale-days-2026'
  and public.sales.title ilike '%peotone%city-wide%';

update public.sales
set event_id = event.id
from public.local_events event
where event.slug = 'monee-city-wide-garage-sale-june-2026'
  and public.sales.title ilike '%monee%city-wide%june%';

update public.sales
set event_id = event.id
from public.local_events event
where event.slug = 'monee-city-wide-garage-sale-july-2026'
  and public.sales.title ilike '%monee%city-wide%july%';

update public.sales
set event_id = event.id
from public.local_events event
where event.slug = 'henry-city-wide-garage-sales-2026'
  and public.sales.title ilike '%henry%city-wide%';
