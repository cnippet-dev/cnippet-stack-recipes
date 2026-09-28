create policy "Public read access to post-media"
on storage.objects for select
to anon
using ( bucket_id = 'post-media' );
