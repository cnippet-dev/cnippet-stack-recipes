alter table posts enable row level security;
alter table tags enable row level security;
alter table post_tags enable row level security;

create policy "public_crud_posts" on posts
  for all to anon, authenticated using (true) with check (true);

create policy "public_crud_tags" on tags
  for all to anon, authenticated using (true) with check (true);

create policy "public_crud_post_tags" on post_tags
  for all to anon, authenticated using (true) with check (true);

create or replace function create_post_with_tags(
  p_title    text,
  p_slug     text,
  p_content  text,
  p_metadata jsonb default null,
  p_tags     text[] default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_post posts;
  v_tag  record;
  tag_name text;
  v_tags jsonb := '[]'::jsonb;
begin
  insert into posts (title, slug, content, metadata)
  values (p_title, p_slug, p_content, p_metadata)
  returning * into v_post;

  if p_tags is not null then 
    foreach tag_name in array p_tags loop

      insert into tags (name)
      values (tag_name)
      on conflict (name) do update set name = excluded.name
      returning id, name into v_tag;

      insert into post_tags (post_id, tag_id)
      values (v_post.id, v_tag.id);

      v_tags := v_tags || jsonb_build_object('id', v_tag.id, 'name', v_tag.name);
    end loop;
  end if;

  return to_jsonb(v_post) || jsonb_build_object('tags', v_tags);
end;
$$;

grant execute on function create_post_with_tags(text, text, text, jsonb, text[])
  to anon, authenticated;