create or replace function public.phase2_operations_queue(
  p_actor_user_id uuid,
  p_statuses public.verification_status[] default null,
  p_priority public.priority_level default null,
  p_zone_id uuid default null,
  p_unassigned boolean default false,
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  case_code text,
  source public.request_source,
  source_reference text,
  verification_status public.verification_status,
  priority public.priority_level,
  received_at timestamptz,
  created_at timestamptz,
  zone_id uuid,
  assigned_incident_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_zone uuid;
  effective_zone uuid;
begin
  select role_code, zone_id into actor_role, actor_zone from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN','COMMANDER','INTAKE','TRIAGE','OPERATIONS','VIEWER') then raise exception 'staff role is not authorized'; end if;
  effective_zone := p_zone_id;
  if actor_role not in ('ADMIN','COMMANDER') then
    if actor_zone is null then raise exception 'staff zone is required'; end if;
    if effective_zone is not null and effective_zone is distinct from actor_zone then raise exception 'staff zone is not authorized'; end if;
    effective_zone := actor_zone;
  end if;
  return query
  select r.id, r.case_code, r.source, r.source_reference, r.verification_status,
    coalesce(r.priority_hint, 'P4'::public.priority_level), r.received_at, r.created_at, r.zone_id,
    ir.incident_id
  from public.requests r
  left join lateral (
    select incident_id from public.incident_requests x where x.request_id = r.id order by x.linked_at asc limit 1
  ) ir on true
  where (effective_zone is null or r.zone_id = effective_zone)
    and (p_statuses is null or r.verification_status = any(p_statuses))
    and (p_priority is null or coalesce(r.priority_hint, 'P4'::public.priority_level) = p_priority)
    and (not p_unassigned or ir.incident_id is null)
    and (p_search is null or r.case_code ilike '%' || p_search || '%' or coalesce(r.source_reference, '') ilike '%' || p_search || '%')
  order by case coalesce(r.priority_hint, 'P4'::public.priority_level)
      when 'P1' then 1 when 'P2' then 2 when 'P3' then 3 else 4 end,
    r.received_at asc,
    r.created_at asc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke execute on function public.phase2_operations_queue(uuid, public.verification_status[], public.priority_level, uuid, boolean, text, integer, integer) from public, anon, authenticated;
grant execute on function public.phase2_operations_queue(uuid, public.verification_status[], public.priority_level, uuid, boolean, text, integer, integer) to service_role;
