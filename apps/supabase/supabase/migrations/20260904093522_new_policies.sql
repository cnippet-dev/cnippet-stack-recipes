create policy "Public upload to post-media"
on storage.objects for insert
to anon
with check ( bucket_id = 'post-media' );

create policy "Public read access to post-media"
on storage.objects for select
to anon
using ( bucket_id = 'post-media' );

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