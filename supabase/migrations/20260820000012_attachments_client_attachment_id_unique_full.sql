-- The upload route uses upsert(..., { onConflict: 'client_attachment_id' }).
-- A partial unique index cannot be inferred by PostgreSQL for that conflict target.
-- Use a full unique index; PostgreSQL permits multiple NULL values, preserving legacy rows.

drop index if exists public.attachments_client_attachment_id_uidx;

create unique index if not exists attachments_client_attachment_id_uidx
  on public.attachments (client_attachment_id);
