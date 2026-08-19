-- RLS policy expressions invoke these SECURITY DEFINER helpers as the
-- authenticated caller. They return only the caller's own role/boolean and
-- remain unavailable to anon/public.
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_staff_role(text[]) to authenticated;
revoke execute on function public.current_staff_role() from anon, public;
revoke execute on function public.is_staff_role(text[]) from anon, public;
