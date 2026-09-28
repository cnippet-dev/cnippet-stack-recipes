create table post_media (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null,
  path       text not null,
  type       text not null check (type in ('image', 'video')),
  created_at timestamptz not null default now()
);

-- enable RLS
alter table post_media enable row level security;

-- adjust these policies to your actual auth needs
create policy "Public read access"
on post_media for select
using ( true );

create policy "Authenticated insert"
on post_media for insert
to authenticated
with check ( true );