create extension if not exists pgcrypto;

create table posts (
  id         uuid primary key default gen_random_uuid(),
  title      varchar(200) not null,
  slug       varchar(200) not null,
  content    text not null,
  metadata   jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint posts_slug_key unique (slug)
);

create index posts_created_at_idx on posts (created_at);

create table tags (
  id   uuid primary key default gen_random_uuid(),
  name varchar(200) not null,

  constraint tags_name_key unique (name)
);

create table post_tags (
  post_id uuid not null references posts (id) on delete cascade,
  tag_id  uuid not null references tags (id) on delete cascade,

  primary key (post_id, tag_id)
);

create index post_tags_tag_id_idx on post_tags (tag_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_set_updated_at
before update on posts
for each row
execute function set_updated_at();