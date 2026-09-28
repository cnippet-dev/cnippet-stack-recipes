-- ⚠️ DEMO ONLY — lets ANYONE with your publishable key create, edit and
-- delete posts, tags and uploaded media. Never apply this to a project with
-- real data. To use it for a local demo, copy it into supabase/migrations/
-- and run `supabase db push`. For production, write policies scoped to
-- auth.uid() instead.

create policy "demo_public_write_posts" on posts
  for all to anon, authenticated using (true) with check (true);

create policy "demo_public_write_tags" on tags
  for all to anon, authenticated using (true) with check (true);

create policy "demo_public_write_post_tags" on post_tags
  for all to anon, authenticated using (true) with check (true);

create policy "Public upload to post-media"
on storage.objects for insert
to anon
with check ( bucket_id = 'post-media' );

create policy "Public update post-media"
on storage.objects for update
to anon
using ( bucket_id = 'post-media' )
with check ( bucket_id = 'post-media' );

create policy "Public delete post-media"
on storage.objects for delete
to anon
using ( bucket_id = 'post-media' );

drop policy "Authenticated insert" on post_media;

create policy "Public insert"
on post_media for insert
to public
with check ( true );

create policy "Public update"
on post_media for update
to public
using ( true )
with check ( true );

create policy "Public delete"
on post_media for delete
to public
using ( true );
