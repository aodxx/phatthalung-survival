import type { SupabaseClient } from "@supabase/supabase-js";
import type { StaffRole } from "../shared/emergency";
import { assertActiveStaff, type StaffPrincipal } from "./staffAuth";

const STAFF_ROLES: readonly StaffRole[] = [
  "ADMIN",
  "COMMANDER",
  "INTAKE",
  "TRIAGE",
  "OPERATIONS",
  "FIELD",
  "LOGISTICS",
  "INFORMATION",
  "VIEWER",
];

function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

export async function resolveSupabaseStaffPrincipal(
  supabase: SupabaseClient,
  userId: string
): Promise<StaffPrincipal | null> {
  if (!userId.trim()) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, role_code, zone_id, active")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Staff profile lookup failed: ${error.message}`);
  if (!data || !data.active || !isStaffRole(data.role_code)) return null;
  return assertActiveStaff({
    userId: data.id,
    role: data.role_code,
    zoneId: data.zone_id,
    active: data.active,
  });
}

export function assertZoneAccess(
  principal: StaffPrincipal,
  requestedZoneId: string | null,
  globalRoles: readonly StaffRole[] = ["ADMIN", "COMMANDER"]
): boolean {
  if (globalRoles.includes(principal.role)) return true;
  return Boolean(
    principal.zoneId && requestedZoneId && principal.zoneId === requestedZoneId
  );
}
