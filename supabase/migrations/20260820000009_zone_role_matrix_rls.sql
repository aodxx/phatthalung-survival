-- Keep field staff on mission/team scope; request and incident intake views are
-- reserved for intake/triage/operations/viewer plus global command roles.
drop policy if exists requests_staff_read on public.requests;
create policy requests_staff_read on public.requests
  for select to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'COMMANDER')
    or (
      public.current_staff_role() in ('INTAKE', 'TRIAGE', 'OPERATIONS', 'VIEWER')
      and zone_id = public.current_staff_zone()
    )
  );

drop policy if exists incidents_staff_read on public.incidents;
create policy incidents_staff_read on public.incidents
  for select to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'COMMANDER')
    or (
      public.current_staff_role() in ('TRIAGE', 'OPERATIONS', 'VIEWER')
      and zone_id = public.current_staff_zone()
    )
  );
