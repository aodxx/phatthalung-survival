-- Phase 0 Foundation migration for แอปพัทลุงต้องรอด
-- Apply only to the selected Supabase project after OWNER_ACTION_REQUIRED is complete.

create extension if not exists pgcrypto;

create type public.request_source as enum (
  'WEB', 'ADMIN_PHONE', 'ADMIN_RADIO', 'WALK_IN', 'FIELD_TEAM', 'LINE', 'FACEBOOK', 'OTHER'
);
create type public.verification_status as enum (
  'UNVERIFIED', 'CONTACTED', 'CONFIRMED', 'DUPLICATE', 'UNREACHABLE', 'FALSE_REPORT', 'NEEDS_RECHECK'
);
create type public.priority_level as enum ('P1', 'P2', 'P3', 'P4');
create type public.incident_status as enum (
  'NEW', 'NEEDS_REVIEW', 'VERIFIED', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED', 'CLOSED',
  'DUPLICATE', 'UNREACHABLE', 'CANCELLED', 'NEEDS_RECHECK'
);
create type public.mission_status as enum (
  'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED', 'FAILED', 'CANCELLED'
);
create type public.attachment_status as enum ('PENDING', 'UPLOADING', 'READY', 'FAILED');

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  code text primary key,
  label_th text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

insert into public.roles (code, label_th, description) values
  ('ADMIN', 'ผู้ดูแลระบบ', 'จัดการสิทธิ์และการตั้งค่าระบบ'),
  ('COMMANDER', 'ผู้บัญชาการเหตุการณ์', 'เห็นภาพรวมและควบคุมการปฏิบัติการ'),
  ('INTAKE', 'เจ้าหน้าที่รับแจ้ง', 'รับเรื่องจากประชาชนและช่องทางภาคสนาม'),
  ('TRIAGE', 'เจ้าหน้าที่คัดกรอง', 'ตรวจสอบ เคสซ้ำ และจัดลำดับความเร่งด่วน'),
  ('OPERATIONS', 'ฝ่ายปฏิบัติการ', 'จัดภารกิจและติดตามการช่วยเหลือ'),
  ('FIELD', 'ทีมภาคสนาม', 'รับและอัปเดต Mission หน้างาน'),
  ('LOGISTICS', 'ฝ่ายโลจิสติกส์', 'ดูแลทรัพยากรและทีมสนับสนุน'),
  ('INFORMATION', 'ฝ่ายข้อมูลข่าวสาร', 'ดูแลข้อมูลสาธารณะที่ผ่านการยืนยัน'),
  ('VIEWER', 'ผู้ดูข้อมูล', 'อ่านข้อมูลตามขอบเขตที่ได้รับสิทธิ์')
 on conflict (code) do nothing;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role_code text not null references public.roles(code) default 'VIEWER',
  zone_id uuid references public.zones(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  client_request_id uuid not null unique,
  tracking_token_hash text not null,
  source public.request_source not null,
  source_reference text,
  reporter_type text,
  operator_id uuid references auth.users(id),
  verification_status public.verification_status not null default 'UNVERIFIED',
  received_at timestamptz not null default now(),
  latitude numeric(9,6),
  longitude numeric(9,6),
  gps_accuracy_m numeric(8,2),
  address_text text,
  village_no text,
  subdistrict text,
  landmark text,
  zone_id uuid references public.zones(id),
  need_types text[] not null default '{}',
  description text,
  water_level text,
  danger_note text,
  people_total_estimate integer,
  children_count integer,
  elderly_count integer,
  disabled_count integer,
  bedridden_count integer,
  urgent_medical_count integer,
  priority_hint public.priority_level,
  network_state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180),
  check (people_total_estimate is null or people_total_estimate >= 0)
);

create table public.request_contacts (
  request_id uuid primary key references public.requests(id) on delete restrict,
  reporter_name text,
  phone_primary text,
  phone_secondary text,
  phone_normalized_hash text,
  reporter_relation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_people_summary (
  request_id uuid primary key references public.requests(id) on delete restrict,
  total_is_approximate boolean not null default true,
  vulnerable_unknown boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  incident_code text not null unique,
  title text not null,
  summary text,
  zone_id uuid references public.zones(id),
  primary_latitude numeric(9,6),
  primary_longitude numeric(9,6),
  severity text,
  priority_score integer not null default 0,
  priority_level public.priority_level not null default 'P4',
  priority_reason text,
  status public.incident_status not null default 'NEW',
  owner_user_id uuid references auth.users(id),
  primary_team_id uuid,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz
);

create table public.incident_requests (
  incident_id uuid not null references public.incidents(id) on delete restrict,
  request_id uuid not null references public.requests(id) on delete restrict,
  linked_by uuid references auth.users(id),
  linked_at timestamptz not null default now(),
  primary key (incident_id, request_id)
);

create table public.incident_status_history (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete restrict,
  previous_status public.incident_status,
  new_status public.incident_status not null,
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create table public.duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete restrict,
  candidate_request_id uuid not null references public.requests(id) on delete restrict,
  score numeric(5,2) not null default 0,
  signals jsonb not null default '{}'::jsonb,
  decision text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, candidate_request_id),
  check (request_id <> candidate_request_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_type text not null,
  coordination_phone text,
  zone_id uuid references public.zones(id),
  active boolean not null default true,
  operational_status text not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incidents
  add constraint incidents_primary_team_fk foreign key (primary_team_id) references public.teams(id);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  objective text not null,
  priority public.priority_level not null default 'P4',
  status public.mission_status not null default 'ASSIGNED',
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  en_route_at timestamptz,
  on_scene_at timestamptz,
  completed_at timestamptz,
  result text,
  field_note text,
  last_latitude numeric(9,6),
  last_longitude numeric(9,6),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'COMPLETED' or nullif(trim(result), '') is not null)
);

create table public.mission_status_history (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete restrict,
  previous_status public.mission_status,
  new_status public.mission_status not null,
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete restrict,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  byte_size integer not null,
  status public.attachment_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (byte_size > 0)
);

create index requests_status_created_idx on public.requests (verification_status, created_at desc);
create index requests_zone_idx on public.requests (zone_id, created_at desc);
create index incidents_queue_idx on public.incidents (priority_level, status, created_at asc);
create index missions_status_idx on public.missions (status, assigned_at asc);
create index audit_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_code from public.user_profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = any(allowed_roles), false);
$$;

alter table public.zones enable row level security;
alter table public.roles enable row level security;
alter table public.user_profiles enable row level security;
alter table public.requests enable row level security;
alter table public.request_contacts enable row level security;
alter table public.request_people_summary enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_requests enable row level security;
alter table public.incident_status_history enable row level security;
alter table public.duplicate_candidates enable row level security;
alter table public.teams enable row level security;
alter table public.missions enable row level security;
alter table public.mission_status_history enable row level security;
alter table public.audit_logs enable row level security;
alter table public.attachments enable row level security;

-- Default deny: no public policies are created for operational or PII tables.
-- Public intake and tracking must use controlled server/Edge Function boundaries.
create policy user_profiles_self_read on public.user_profiles
  for select to authenticated using (id = auth.uid() or public.is_staff_role(array['ADMIN', 'COMMANDER']));

create policy roles_authenticated_read on public.roles
  for select to authenticated using (public.current_staff_role() is not null);

create policy zones_staff_read on public.zones
  for select to authenticated using (public.current_staff_role() is not null);

create policy requests_staff_read on public.requests
  for select to authenticated using (public.is_staff_role(array['ADMIN', 'COMMANDER', 'INTAKE', 'TRIAGE', 'OPERATIONS', 'VIEWER']));

create policy incidents_staff_read on public.incidents
  for select to authenticated using (public.is_staff_role(array['ADMIN', 'COMMANDER', 'TRIAGE', 'OPERATIONS', 'VIEWER']));

create policy missions_authorized_read on public.missions
  for select to authenticated using (public.is_staff_role(array['ADMIN', 'COMMANDER', 'OPERATIONS', 'FIELD', 'VIEWER']));

create policy teams_authorized_read on public.teams
  for select to authenticated using (public.is_staff_role(array['ADMIN', 'COMMANDER', 'OPERATIONS', 'FIELD', 'LOGISTICS', 'VIEWER']));

create policy audit_authorized_read on public.audit_logs
  for select to authenticated using (public.is_staff_role(array['ADMIN', 'COMMANDER']));

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.roles, public.zones to authenticated;
grant select on public.user_profiles, public.requests, public.incidents, public.missions, public.teams to authenticated;
grant select on public.audit_logs to authenticated;
