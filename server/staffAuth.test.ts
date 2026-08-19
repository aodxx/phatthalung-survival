import { describe, expect, it } from "vitest";
import {
  assertActiveStaff,
  assertStaffRole,
  type StaffPrincipal,
} from "./staffAuth";

const principal: StaffPrincipal = {
  userId: "staff-1",
  role: "OPERATIONS",
  zoneId: "zone-1",
  active: true,
};

describe("staff authorization foundation", () => {
  it("accepts active staff with an allowed role", () => {
    expect(assertStaffRole(principal, ["OPERATIONS", "COMMANDER"])).toBe(
      principal
    );
  });

  it("rejects inactive staff", () => {
    expect(() => assertActiveStaff({ ...principal, active: false })).toThrow(
      "Staff account is inactive"
    );
  });

  it("rejects a role outside the policy", () => {
    expect(() => assertStaffRole(principal, ["FIELD"])).toThrow(
      "is not authorized for this action"
    );
  });
});
