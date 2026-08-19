-- Atomic Public Intake boundary.
-- PostgreSQL executes one function invocation in one transaction. Any exception
-- rolls back the request, child rows, and success audit together.
create or replace function public.submit_public_intake_atomic(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_client_request_id uuid := (p_payload->>'clientRequestId')::uuid;
  v_request_id uuid := (p_payload->>'requestId')::uuid;
  v_case_code text := p_payload->>'caseCode';
  v_tracking_token text := p_payload->>'trackingToken';
  v_received_at timestamptz := (p_payload->>'receivedAt')::timestamptz;
  v_audit_at timestamptz := (p_payload->>'auditAt')::timestamptz;
  v_inserted boolean := false;
begin
  if v_client_request_id is null or v_request_id is null then
    raise exception using message = 'clientRequestId and requestId are required';
  end if;
  if nullif(trim(v_case_code), '') is null or nullif(trim(v_tracking_token), '') is null then
    raise exception using message = 'caseCode and trackingToken are required';
  end if;

  insert into public.requests (
    id, case_code, client_request_id, tracking_token_hash, source,
    address_text, need_types, description, people_total_estimate,
    children_count, elderly_count, disabled_count, bedridden_count,
    urgent_medical_count, latitude, longitude, gps_accuracy_m,
    network_state, received_at
  ) values (
    v_request_id,
    v_case_code,
    v_client_request_id,
    p_payload->>'trackingTokenHash',
    (p_payload->>'source')::public.request_source,
    p_payload->>'addressText',
    array(select jsonb_array_elements_text(coalesce(p_payload->'needTypes', '[]'::jsonb))),
    nullif(p_payload->>'description', ''),
    nullif(p_payload->>'peopleTotal', '')::integer,
    nullif(p_payload->>'childrenCount', '')::integer,
    nullif(p_payload->>'elderlyCount', '')::integer,
    nullif(p_payload->>'disabledCount', '')::integer,
    nullif(p_payload->>'bedriddenCount', '')::integer,
    nullif(p_payload->>'urgentMedicalCount', '')::integer,
    nullif(p_payload->>'latitude', '')::numeric,
    nullif(p_payload->>'longitude', '')::numeric,
    nullif(p_payload->>'gpsAccuracyM', '')::numeric,
    p_payload->>'networkState',
    v_received_at
  )
  on conflict (client_request_id) do nothing
  returning * into v_request;

  if not found then
    select * into v_request
    from public.requests
    where client_request_id = v_client_request_id;
    if not found then
      raise exception using message = 'idempotency lookup failed after conflict';
    end if;
    return jsonb_build_object(
      'status', 'ALREADY_RECEIVED',
      'caseCode', v_request.case_code,
      'receivedAt', v_request.received_at
    );
  end if;
  v_inserted := true;

  insert into public.request_contacts (
    request_id, reporter_name, phone_primary, phone_normalized_hash,
    reporter_relation
  ) values (
    v_request.id,
    nullif(p_payload->>'contactName', ''),
    nullif(p_payload->>'phone', ''),
    nullif(p_payload->>'phoneNormalizedHash', ''),
    nullif(p_payload->>'reporterRelation', '')
  );

  insert into public.request_people_summary (
    request_id, total_is_approximate, vulnerable_unknown, notes
  ) values (
    v_request.id,
    coalesce((p_payload->>'peopleTotalApproximate')::boolean, true),
    coalesce((p_payload->>'vulnerableUnknown')::boolean, false),
    nullif(p_payload->>'vulnerableNotes', '')
  );

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id, metadata, created_at
  ) values (
    null,
    'REQUEST_CREATE',
    'REQUEST',
    v_request.id,
    jsonb_build_object(
      'source', p_payload->>'source',
      'clientRequestId', v_client_request_id,
      'atomic', true
    ),
    v_audit_at
  );

  return jsonb_build_object(
    'status', 'RECEIVED',
    'caseCode', v_request.case_code,
    'trackingToken', v_tracking_token,
    'receivedAt', v_request.received_at
  );
exception
  when others then
    raise;
end;
$$;

revoke all on function public.submit_public_intake_atomic(jsonb) from public, anon, authenticated;
grant execute on function public.submit_public_intake_atomic(jsonb) to service_role;

comment on function public.submit_public_intake_atomic(jsonb) is
  'Atomic public intake: request, contacts, people summary, and success audit are one transaction; duplicate client_request_id returns original case.';
