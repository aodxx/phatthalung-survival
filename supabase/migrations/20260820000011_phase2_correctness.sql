create or replace function public.phase2_transition_allowed(p_kind text, p_previous text, p_next text)
returns boolean
language sql
immutable
as $$
  select case p_kind
    when 'request' then case p_previous
      when 'UNVERIFIED' then p_next in ('CONTACTED','DUPLICATE','UNREACHABLE','NEEDS_RECHECK')
      when 'CONTACTED' then p_next in ('CONFIRMED','DUPLICATE','UNREACHABLE','NEEDS_RECHECK')
      when 'CONFIRMED' then p_next in ('NEEDS_RECHECK','DUPLICATE')
      when 'NEEDS_RECHECK' then p_next in ('CONTACTED','CONFIRMED','DUPLICATE','UNREACHABLE')
      when 'UNREACHABLE' then p_next = 'NEEDS_RECHECK'
      when 'FALSE_REPORT' then p_next = 'NEEDS_RECHECK'
      else false end
    when 'incident' then case p_previous
      when 'NEW' then p_next in ('NEEDS_REVIEW','DUPLICATE','CANCELLED')
      when 'NEEDS_REVIEW' then p_next in ('VERIFIED','DUPLICATE','UNREACHABLE','NEEDS_RECHECK')
      when 'VERIFIED' then p_next in ('ASSIGNED','NEEDS_RECHECK','CANCELLED')
      when 'ASSIGNED' then p_next in ('EN_ROUTE','ON_SCENE','CANCELLED')
      when 'EN_ROUTE' then p_next in ('ON_SCENE','CANCELLED')
      when 'ON_SCENE' then p_next in ('RESOLVED','CANCELLED')
      when 'RESOLVED' then p_next in ('CLOSED','NEEDS_RECHECK')
      when 'UNREACHABLE' then p_next = 'NEEDS_RECHECK'
      when 'CANCELLED' then p_next = 'NEEDS_RECHECK'
      when 'NEEDS_RECHECK' then p_next in ('NEEDS_REVIEW','VERIFIED','CANCELLED')
      else false end
    when 'mission' then case p_previous
      when 'ASSIGNED' then p_next in ('ACCEPTED','CANCELLED')
      when 'ACCEPTED' then p_next in ('EN_ROUTE','CANCELLED')
      when 'EN_ROUTE' then p_next in ('ON_SCENE','FAILED','CANCELLED')
      when 'ON_SCENE' then p_next in ('COMPLETED','FAILED','CANCELLED')
      when 'FAILED' then p_next = 'ASSIGNED'
      else false end
    else false end;
$$;

create or replace function public.phase2_transition_request(p_request_id uuid, p_next_status public.verification_status, p_reason text, p_actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_row public.requests%rowtype; actor_role text; result jsonb;
begin
  select role_code into actor_role from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN','COMMANDER','TRIAGE') then raise exception 'staff role is not authorized'; end if;
  select * into current_row from public.requests where id = p_request_id for update;
  if not found then raise exception 'request not found'; end if;
  if not public.phase2_transition_allowed('request', current_row.verification_status::text, p_next_status::text) then raise exception 'invalid request transition'; end if;
  update public.requests set verification_status = p_next_status, updated_at = now() where id = p_request_id returning to_jsonb(requests.*) into result;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, reason, metadata) values (p_actor_user_id,'STATUS_TRANSITION','REQUEST',p_request_id,p_reason,jsonb_build_object('previous_status',current_row.verification_status,'next_status',p_next_status));
  return result;
end; $$;

create or replace function public.phase2_transition_incident(p_incident_id uuid, p_next_status public.incident_status, p_reason text, p_actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_row public.incidents%rowtype; actor_role text; result jsonb;
begin
  select role_code into actor_role from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN','COMMANDER','TRIAGE') then raise exception 'staff role is not authorized'; end if;
  select * into current_row from public.incidents where id = p_incident_id for update;
  if not found then raise exception 'incident not found'; end if;
  if not public.phase2_transition_allowed('incident', current_row.status::text, p_next_status::text) then raise exception 'invalid incident transition'; end if;
  update public.incidents set status = p_next_status, verified_at = case when p_next_status = 'VERIFIED' then now() else verified_at end where id = p_incident_id returning to_jsonb(incidents.*) into result;
  insert into public.incident_status_history(incident_id,previous_status,new_status,reason,changed_by) values (p_incident_id,current_row.status,p_next_status,p_reason,p_actor_user_id);
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,reason,metadata) values (p_actor_user_id,'STATUS_TRANSITION','INCIDENT',p_incident_id,p_reason,jsonb_build_object('previous_status',current_row.status,'next_status',p_next_status));
  return result;
end; $$;

create or replace function public.phase2_transition_mission(p_mission_id uuid, p_next_status public.mission_status, p_reason text, p_result text, p_actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_row public.missions%rowtype; actor_role text; actor_zone uuid; team_zone uuid; result jsonb;
begin
  select role_code,zone_id into actor_role,actor_zone from public.user_profiles where id = p_actor_user_id and active = true;
  if actor_role is null or actor_role not in ('ADMIN','COMMANDER','OPERATIONS','FIELD') then raise exception 'staff role is not authorized'; end if;
  select * into current_row from public.missions where id = p_mission_id for update;
  if not found then raise exception 'mission not found'; end if;
  select zone_id into team_zone from public.teams where id = current_row.team_id;
  if actor_role not in ('ADMIN','COMMANDER') and actor_zone is distinct from team_zone then raise exception 'mission zone is not authorized'; end if;
  if not public.phase2_transition_allowed('mission', current_row.status::text, p_next_status::text) then raise exception 'invalid mission transition'; end if;
  if p_next_status = 'COMPLETED' and nullif(trim(coalesce(p_result,'')),'') is null then raise exception 'completion result is required'; end if;
  update public.missions set status=p_next_status,result=coalesce(p_result,result),updated_by=p_actor_user_id,accepted_at=case when p_next_status='ACCEPTED' then now() else accepted_at end,en_route_at=case when p_next_status='EN_ROUTE' then now() else en_route_at end,on_scene_at=case when p_next_status='ON_SCENE' then now() else on_scene_at end,completed_at=case when p_next_status='COMPLETED' then now() else completed_at end,updated_at=now() where id=p_mission_id returning to_jsonb(missions.*) into result;
  insert into public.mission_status_history(mission_id,previous_status,new_status,reason,changed_by) values (p_mission_id,current_row.status,p_next_status,p_reason,p_actor_user_id);
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,reason,metadata) values (p_actor_user_id,'STATUS_TRANSITION','MISSION',p_mission_id,p_reason,jsonb_build_object('previous_status',current_row.status,'next_status',p_next_status));
  return result;
end; $$;

create or replace function public.phase2_decide_duplicate_candidate(p_candidate_id uuid, p_decision text, p_reason text, p_actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare actor_role text; candidate_row public.duplicate_candidates%rowtype; result jsonb;
begin
  select role_code into actor_role from public.user_profiles where id=p_actor_user_id and active=true;
  if actor_role is null or actor_role not in ('ADMIN','COMMANDER','TRIAGE') then raise exception 'staff role is not authorized'; end if;
  if p_decision not in ('CONFIRMED','REJECTED','IGNORED') or nullif(trim(p_reason),'') is null then raise exception 'decision and reason are required'; end if;
  select * into candidate_row from public.duplicate_candidates where id=p_candidate_id for update;
  if not found then raise exception 'duplicate candidate not found'; end if;
  update public.duplicate_candidates set decision=p_decision,decided_by=p_actor_user_id,decided_at=now() where id=p_candidate_id returning to_jsonb(duplicate_candidates.*) into result;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,reason,metadata) values (p_actor_user_id,'LINK_DUPLICATE','DUPLICATE_CANDIDATE',p_candidate_id,p_reason,jsonb_build_object('decision',p_decision,'request_id',candidate_row.request_id,'candidate_request_id',candidate_row.candidate_request_id));
  return result;
end; $$;

revoke execute on function public.phase2_transition_allowed(text,text,text) from public,anon,authenticated;
grant execute on function public.phase2_transition_allowed(text,text,text) to service_role;
revoke execute on function public.phase2_decide_duplicate_candidate(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.phase2_decide_duplicate_candidate(uuid,text,text,uuid) to service_role;
