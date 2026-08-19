import type { StaffRole } from "../shared/emergency";

export type StaffPrincipal = {
  userId: string;
  role: StaffRole;
  zoneId?: string | null;
  active: boolean;
};

export function staffPrincipalFromManusUser(user: {
  id: number;
  role: "user" | "admin";
}): StaffPrincipal {
  return {
    userId: String(user.id),
    role: user.role === "admin" ? "ADMIN" : "VIEWER",
    active: true,
  };
}

export function assertActiveStaff(principal: StaffPrincipal): StaffPrincipal {
  if (!principal.active) throw new Error("Staff account is inactive");
  if (!principal.userId.trim()) throw new Error("Staff userId is required");
  return principal;
}

export function assertStaffRole(
  principal: StaffPrincipal,
  allowedRoles: readonly StaffRole[]
): StaffPrincipal {
  assertActiveStaff(principal);
  if (!allowedRoles.includes(principal.role)) {
    throw new Error(
      `Staff role ${principal.role} is not authorized for this action`
    );
  }
  return principal;
}
