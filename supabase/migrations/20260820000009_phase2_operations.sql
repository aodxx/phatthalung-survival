-- Phase 2 audited operations mutations.
-- Apply only after staff role/zone bootstrap and review of production policy.

create or replace function public.phase2_transition_request(
  p_request_id uuid,
  p_next_status public.verification_status,
  p_reason text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.requests%rowtype;
  actor_role text;
  result jsonb;
begin
  select role_code into actor_role from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN', 'COMMANDER', 'TRIAGE') then raise exception 'staff role is not authorized'; end if;
  select * into current_row from public.requests where id = p_request_id for update;
  if not found then raise exception 'request not found'; end if;
  update public.requests set verification_status = p_next_status, updated_at = now() where id = p_request_id returning to_jsonb(requests.*) into result;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, reason, metadata)
  values (p_actor_user_id, 'STATUS_TRANSITION', 'REQUEST', p_request_id, p_reason,
    jsonb_build_object('previous_status', current_row.verification_status, 'next_status', p_next_status));
  return result;
end;
$$;

create or replace function public.phase2_transition_incident(
  p_incident_id uuid,
  p_next_status public.incident_status,
  p_reason text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.incidents%rowtype;
  actor_role text;
  result jsonb;
begin
  select role_code into actor_role from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN', 'COMMANDER', 'TRIAGE') then raise exception 'staff role is not authorized'; end if;
  select * into current_row from public.incidents where id = p_incident_id for update;
  if not found then raise exception 'incident not found'; end if;
  update public.incidents set status = p_next_status, verified_at = case when p_next_status = 'VERIFIED' then now() else verified_at end where id = p_incident_id returning to_jsonb(incidents.*) into result;
  insert into public.incident_status_history(incident_id, previous_status, new_status, reason, changed_by)
  values (p_incident_id, current_row.status, p_next_status, p_reason, p_actor_user_id);
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, reason, metadata)
  values (p_actor_user_id, 'STATUS_TRANSITION', 'INCIDENT', p_incident_id, p_reason,
    jsonb_build_object('previous_status', current_row.status, 'next_status', p_next_status));
  return result;
end;
$$;

create or replace function public.phase2_assign_mission(
  p_incident_id uuid,
  p_team_id uuid,
  p_objective text,
  p_priority public.priority_level,
  p_reason text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  incident_row public.incidents%rowtype;
  team_row public.teams%rowtype;
  actor_role text;
  mission_row public.missions%rowtype;
begin
  select role_code into actor_role from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN', 'COMMANDER', 'OPERATIONS') then raise exception 'staff role is not authorized'; end if;
  select * into incident_row from public.incidents where id = p_incident_id for update;
  if not found then raise exception 'incident not found'; end if;
  select * into team_row from public.teams where id = p_team_id and active = true;
  if not found then raise exception 'team not found'; end if;
  if actor_role not in ('ADMIN', 'COMMANDER') and (select zone_id from public.user_profiles where id = p_actor_user_id) is distinct from team_row.zone_id then raise exception 'team zone is not authorized'; end if;
  insert into public.missions(incident_id, team_id, objective, priority, status, updated_by)
  values (p_incident_id, p_team_id, p_objective, p_priority, 'ASSIGNED', p_actor_user_id)
  returning * into mission_row;
  update public.incidents set status = 'ASSIGNED', primary_team_id = p_team_id where id = p_incident_id;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, reason, metadata)
  values (p_actor_user_id, 'ASSIGN_MISSION', 'MISSION', mission_row.id, p_reason,
    jsonb_build_object('incident_id', p_incident_id, 'team_id', p_team_id, 'priority', p_priority));
  return to_jsonb(mission_row);
end;
$$;

create or replace function public.phase2_transition_mission(
  p_mission_id uuid,
  p_next_status public.mission_status,
  p_reason text,
  p_result text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.missions%rowtype;
  actor_role text;
  actor_zone uuid;
  team_zone uuid;
  result jsonb;
begin
  select role_code, zone_id into actor_role, actor_zone from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN', 'COMMANDER', 'OPERATIONS', 'FIELD') then raise exception 'staff role is not authorized'; end if;
  select * into current_row from public.missions where id = p_mission_id for update;
  if not found then raise exception 'mission not found'; end if;
  select zone_id into team_zone from public.teams where id = current_row.team_id;
  if actor_role not in ('ADMIN', 'COMMANDER') and actor_zone is distinct from team_zone then raise exception 'mission zone is not authorized'; end if;
  if p_next_status = 'COMPLETED' and nullif(trim(coalesce(p_result, '')), '') is null then raise exception 'completion result is required'; end if;
  update public.missions set status = p_next_status, result = coalesce(p_result, result), updated_by = p_actor_user_id,
    accepted_at = case when p_next_status = 'ACCEPTED' then now() else accepted_at end,
    en_route_at = case when p_next_status = 'EN_ROUTE' then now() else en_route_at end,
    on_scene_at = case when p_next_status = 'ON_SCENE' then now() else on_scene_at end,
    completed_at = case when p_next_status = 'COMPLETED' then now() else completed_at end,
    updated_at = now()
  where id = p_mission_id returning to_jsonb(missions.*) into result;
  insert into public.mission_status_history(mission_id, previous_status, new_status, reason, changed_by)
  values (p_mission_id, current_row.status, p_next_status, p_reason, p_actor_user_id);
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, reason, metadata)
  values (p_actor_user_id, 'STATUS_TRANSITION', 'MISSION', p_mission_id, p_reason,
    jsonb_build_object('previous_status', current_row.status, 'next_status', p_next_status));
  return result;
end;
$$;

revoke execute on function public.phase2_transition_request(uuid, public.verification_status, text, uuid) from public, anon, authenticated;
revoke execute on function public.phase2_transition_incident(uuid, public.incident_status, text, uuid) from public, anon, authenticated;
revoke execute on function public.phase2_assign_mission(uuid, uuid, text, public.priority_level, text, uuid) from public, anon, authenticated;
grant execute on function public.phase2_transition_request(uuid, public.verification_status, text, uuid) to service_role;
grant execute on function public.phase2_transition_incident(uuid, public.incident_status, text, uuid) to service_role;
grant execute on function public.phase2_assign_mission(uuid, uuid, text, public.priority_level, text, uuid) to service_role;
revoke execute on function public.phase2_transition_mission(uuid, public.mission_status, text, text, uuid) from public, anon, authenticated;
grant execute on function public.phase2_transition_mission(uuid, public.mission_status, text, text, uuid) to service_role;

create or replace function public.phase2_override_incident_priority(
  p_incident_id uuid,
  p_priority public.priority_level,
  p_reason text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.incidents%rowtype;
  actor_role text;
  result jsonb;
begin
  select role_code into actor_role from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN', 'COMMANDER', 'TRIAGE') then raise exception 'staff role is not authorized'; end if;
  select * into current_row from public.incidents where id = p_incident_id for update;
  if not found then raise exception 'incident not found'; end if;
  update public.incidents set priority_level = p_priority, priority_reason = p_reason where id = p_incident_id returning to_jsonb(incidents.*) into result;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, reason, metadata)
  values (p_actor_user_id, 'PRIORITY_OVERRIDE', 'INCIDENT', p_incident_id, p_reason,
    jsonb_build_object('previous_priority', current_row.priority_level, 'next_priority', p_priority));
  return result;
end;
$$;
revoke execute on function public.phase2_override_incident_priority(uuid, public.priority_level, text, uuid) from public, anon, authenticated;
grant execute on function public.phase2_override_incident_priority(uuid, public.priority_level, text, uuid) to service_role;
