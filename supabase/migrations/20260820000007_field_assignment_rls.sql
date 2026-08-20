-- Field access must be assignment-aware, not merely zone-aware.
-- This table contains only staff assignment metadata; it never stores citizen data.
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;

drop policy if exists team_members_staff_read on public.team_members;
create policy team_members_staff_read on public.team_members
  for select to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'COMMANDER', 'OPERATIONS')
    or user_id = auth.uid()
  );

drop policy if exists missions_authorized_read on public.missions;
create policy missions_authorized_read on public.missions
  for select to authenticated
  using (
    public.current_staff_role() in ('ADMIN', 'COMMANDER', 'OPERATIONS')
    or (
      public.current_staff_role() = 'FIELD'
      and exists (
        select 1
        from public.teams
        join public.team_members
          on team_members.team_id = teams.id
         and team_members.user_id = auth.uid()
         and team_members.active = true
        where teams.id = missions.team_id
          and teams.zone_id = public.current_staff_zone()
          and teams.active = true
      )
    )
  );

comment on table public.team_members is
  'Explicit staff-to-field-team assignment used by FIELD mission RLS; no citizen data.';
