-- Supabase grants EXECUTE to PUBLIC by default for functions; revoke explicitly.
revoke execute on function public.current_staff_role() from public;
revoke execute on function public.is_staff_role(text[]) from public;
