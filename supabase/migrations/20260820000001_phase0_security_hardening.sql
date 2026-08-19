-- Phase 0 security hardening: helper functions are internal RLS helpers, not public RPC APIs.
revoke execute on function public.current_staff_role() from anon, authenticated;
revoke execute on function public.is_staff_role(text[]) from anon, authenticated;
