-- Attachments are optional and always uploaded after the parent Request exists.
-- Keep direct table access default-deny; controlled server routes own upload/read authorization.

alter table public.attachments
  add column if not exists client_attachment_id uuid,
  add column if not exists checksum_sha256 text,
  add column if not exists error_code text,
  add column if not exists uploaded_at timestamptz;

create unique index if not exists attachments_client_attachment_id_uidx
  on public.attachments (client_attachment_id)
  where client_attachment_id is not null;

create index if not exists attachments_request_status_idx
  on public.attachments (request_id, status, created_at desc);

alter table public.attachments
  drop constraint if exists attachments_byte_size_check;

alter table public.attachments
  add constraint attachments_byte_size_check check (byte_size > 0 and byte_size <= 10485760);

alter table public.attachments
  add constraint attachments_checksum_sha256_check
  check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$');

comment on table public.attachments is 'Private request attachments; access only through controlled server/storage boundary.';
comment on column public.attachments.client_attachment_id is 'Client-generated UUID for idempotent upload retries.';
comment on column public.attachments.checksum_sha256 is 'SHA-256 checksum of uploaded bytes, calculated server-side.';
