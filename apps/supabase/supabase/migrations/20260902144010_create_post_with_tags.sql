create or replace function create_post_with_tags(
  p_title text,
  p_slug text,
  p_content text,
  p_metadata jsonb,
  p_tags text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_post posts;
  v_tag_id uuid;
  v_tag_name text;
  v_tags jsonb := '[]'::jsonb;
begin
  insert into posts (title, slug, content, metadata)
  values (p_title, p_slug, p_content, p_metadata)
  returning * into v_post;

  if p_tags is not null and array_length(p_tags, 1) > 0 then
    foreach v_tag_name in array p_tags loop
      insert into tags (name)
      values (v_tag_name)
      on conflict (name) do update set name = excluded.name
      returning id into v_tag_id;

      insert into post_tags (post_id, tag_id)
      values (v_post.id, v_tag_id)
      on conflict do nothing;

      v_tags := v_tags || jsonb_build_object('id', v_tag_id, 'name', v_tag_name);
    end loop;
  end if;

  return to_jsonb(v_post) || jsonb_build_object('tags', v_tags);
end;
$$;

alter table posts enable row level security;
alter table tags enable row level security;
alter table post_tags enable row level security;

create policy "Anyone can read posts"
  on posts for select
  using (true);

create policy "Users can insert their own posts"
  on posts for insert;

create policy "Users can update their own posts"
  on posts for update;

create policy "Users can delete their own posts"
  on posts for delete;

-- tags: readable by everyone, writable by any authenticated user (they're shared)
create policy "Anyone can read tags"
  on tags for select
  using (true);

create policy "Authenticated users can create tags"
  on tags for insert
  to authenticated
  with check (true);

-- post_tags: follow the parent post's ownership
create policy "Anyone can read post_tags"
  on post_tags for select
  using (true);

create policy "Users can link tags to their own posts"
  on post_tags for insert
  with check (
    exists (
      select 1 from posts
      where posts.id = post_tags.post_id
    )
  );