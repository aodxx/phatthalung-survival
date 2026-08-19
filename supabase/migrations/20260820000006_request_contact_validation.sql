-- Database-level defense-in-depth for the controlled public intake boundary.
-- The server normalizes and validates before the RPC; this check prevents a
-- direct/bypassed write from persisting a malformed primary phone.
alter table public.request_contacts
  add constraint request_contacts_phone_primary_thai_format
  check (
    phone_primary is null
    or phone_primary ~ '^0[0-9]{8,9}$'
  );
