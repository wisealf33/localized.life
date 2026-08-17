alter table public.people
  add column avatar_url text check (avatar_url is null or char_length(trim(avatar_url)) <= 1000),
  add column facebook_url text check (facebook_url is null or char_length(trim(facebook_url)) <= 1000),
  add column instagram_url text check (instagram_url is null or char_length(trim(instagram_url)) <= 1000),
  add column linkedin_url text check (linkedin_url is null or char_length(trim(linkedin_url)) <= 1000);

grant select (avatar_url, facebook_url, instagram_url, linkedin_url)
  on public.people to authenticated;

comment on column public.people.avatar_url is
  'Optional profile image reference. Upload authorization and visibility must be enforced separately.';
