-- Zone-aware staff read policy. Production role and zone are resolved from
-- auth.uid() -> public.user_profiles; client-supplied role/zone is never trusted.
create or replace function public.current_staff_zone()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select zone_id
  from public.user_profiles
  where id = auth.uid() and active = true
  limit 1;
$$;

revoke execute on function public.current_staff_zone() from public, anon;
grant execute on function public.current_staff_zone() to authenticated, service_role;

drop policy if exists requests_staff_read on public.requests;
create policy requests_staff_read on public.requests
  for select to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'COMMANDER')
    or zone_id = public.current_staff_zone()
  );

drop policy if exists incidents_staff_read on public.incidents;
create policy incidents_staff_read on public.incidents
  for select to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'COMMANDER')
    or zone_id = public.current_staff_zone()
  );

drop policy if exists missions_authorized_read on public.missions;
create policy missions_authorized_read on public.missions
  for select to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'COMMANDER')
    or exists (
      select 1
      from public.teams
      where teams.id = missions.team_id
        and teams.zone_id = public.current_staff_zone()
    )
  );

comment on function public.current_staff_zone() is
  'Returns the active authenticated staff profile zone; used only by zone-aware RLS.';
