-- RLS expressions need table privilege to evaluate team assignment membership.
grant select on public.team_members to authenticated;
