alter table public.people
  add column first_name text check (first_name is null or char_length(trim(first_name)) between 1 and 80),
  add column middle_name text check (middle_name is null or char_length(trim(middle_name)) between 1 and 80),
  add column last_name text check (last_name is null or char_length(trim(last_name)) between 1 and 120),
  add column preferred_name text check (preferred_name is null or char_length(trim(preferred_name)) between 1 and 120),
  add column pronouns text check (pronouns is null or char_length(trim(pronouns)) <= 60),
  add column birth_date date,
  add column secondary_email text check (secondary_email is null or char_length(trim(secondary_email)) <= 320),
  add column secondary_phone text check (secondary_phone is null or char_length(trim(secondary_phone)) <= 60),
  add column preferred_contact_method text not null default 'no_preference'
    check (preferred_contact_method in ('no_preference', 'email', 'phone', 'text')),
  add column contact_time_preferences text check (contact_time_preferences is null or char_length(trim(contact_time_preferences)) <= 500),
  add column address_line1 text check (address_line1 is null or char_length(trim(address_line1)) <= 240),
  add column address_line2 text check (address_line2 is null or char_length(trim(address_line2)) <= 240),
  add column postal_code text check (postal_code is null or char_length(trim(postal_code)) <= 20),
  add column county text check (county is null or char_length(trim(county)) <= 120),
  add column country_code text not null default 'US'
    check (country_code ~ '^[A-Z]{2}$'),
  add column latitude numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  add column longitude numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  add column location_precision text not null default 'none'
    check (location_precision in ('none', 'postal_code', 'city', 'address')),
  add column geocoded_at timestamptz,
  add column timezone text check (timezone is null or char_length(trim(timezone)) <= 100),
  add column service_radius_miles integer check (service_radius_miles is null or service_radius_miles between 0 and 500),
  add column headline text check (headline is null or char_length(trim(headline)) <= 180),
  add column bio text check (bio is null or char_length(trim(bio)) <= 4000),
  add column occupation text check (occupation is null or char_length(trim(occupation)) <= 180),
  add column organization text check (organization is null or char_length(trim(organization)) <= 180),
  add column website_url text check (website_url is null or char_length(trim(website_url)) <= 1000),
  add column languages text[] not null default '{}',
  add column skills text[] not null default '{}',
  add column interests text[] not null default '{}',
  add column community_roles text[] not null default '{}',
  add column certifications text[] not null default '{}',
  add column services_offered text check (services_offered is null or char_length(trim(services_offered)) <= 4000),
  add column help_wanted text check (help_wanted is null or char_length(trim(help_wanted)) <= 4000),
  add column availability_notes text check (availability_notes is null or char_length(trim(availability_notes)) <= 2000),
  add column transportation_notes text check (transportation_notes is null or char_length(trim(transportation_notes)) <= 2000),
  add column accessibility_notes text check (accessibility_notes is null or char_length(trim(accessibility_notes)) <= 2000),
  add column profile_visibility text not null default 'connections'
    check (profile_visibility in ('private', 'connections', 'public')),
  add column contact_visibility text not null default 'private'
    check (contact_visibility in ('private', 'connections')),
  add column location_visibility text not null default 'town_state'
    check (location_visibility in ('hidden', 'town_state', 'postal_code', 'exact')),
  add column directory_opt_in boolean not null default false,
  add column matching_opt_in boolean not null default true;

update public.people
set first_name = case
      when position(' ' in trim(display_name)) > 0 then split_part(trim(display_name), ' ', 1)
      else trim(display_name)
    end,
    last_name = case
      when position(' ' in trim(display_name)) > 0 then substring(trim(display_name) from position(' ' in trim(display_name)) + 1)
      else null
    end,
    preferred_name = trim(display_name)
where first_name is null
  and trim(display_name) <> '';

create index people_matching_location_idx
  on public.people (country_code, state, postal_code, town)
  where matching_opt_in;

grant select (
  first_name,
  middle_name,
  last_name,
  preferred_name,
  pronouns,
  birth_date,
  secondary_email,
  secondary_phone,
  preferred_contact_method,
  contact_time_preferences,
  address_line1,
  address_line2,
  postal_code,
  county,
  country_code,
  latitude,
  longitude,
  location_precision,
  geocoded_at,
  timezone,
  service_radius_miles,
  headline,
  bio,
  occupation,
  organization,
  website_url,
  languages,
  skills,
  interests,
  community_roles,
  certifications,
  services_offered,
  help_wanted,
  availability_notes,
  transportation_notes,
  accessibility_notes,
  profile_visibility,
  contact_visibility,
  location_visibility,
  directory_opt_in,
  matching_opt_in
) on public.people to authenticated;

comment on column public.people.address_line1 is
  'Private base/home address. Public presentation must honor location_visibility.';
comment on column public.people.latitude is
  'Derived private map coordinate. Do not expose directly without explicit location visibility.';
comment on column public.people.profile_visibility is
  'User preference for future profile discovery; no public access is granted by this migration.';
comment on column public.people.directory_opt_in is
  'Explicit opt-in required before a person may appear in a future people directory.';
