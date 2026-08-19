-- Owner-action migration: create the private bucket required by the
-- server-side attachment boundary. Server uses the Supabase service role to
-- upload and issue short-lived signed URLs; anon/authenticated clients do not
-- receive direct storage object access.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do update set public = false;

-- No client storage policies are intentionally created. The application route
-- authorizes Case ID + tracking token before using the server storage boundary.
