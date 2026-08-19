import { describe, expect, it } from "vitest";
import {
  assertZoneAccess,
  resolveSupabaseStaffPrincipal,
} from "./supabaseStaffAuth";

function profileSupabase(
  data: unknown,
  error: { message: string } | null = null
) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data, error }),
  };
  return { from: () => chain } as never;
}

describe("Supabase production staff auth adapter", () => {
  it("takes role and zone only from active user_profiles", async () => {
    const principal = await resolveSupabaseStaffPrincipal(
      profileSupabase({
        id: "staff-1",
        role_code: "TRIAGE",
        zone_id: "zone-a",
        active: true,
      }),
      "staff-1"
    );
    expect(principal).toEqual({
      userId: "staff-1",
      role: "TRIAGE",
      zoneId: "zone-a",
      active: true,
    });
  });

  it("denies inactive or unknown-role profiles", async () => {
    await expect(
      resolveSupabaseStaffPrincipal(
        profileSupabase({
          id: "staff-2",
          role_code: "ROOT",
          zone_id: "zone-a",
          active: true,
        }),
        "staff-2"
      )
    ).resolves.toBeNull();
    await expect(
      resolveSupabaseStaffPrincipal(
        profileSupabase({
          id: "staff-3",
          role_code: "FIELD",
          zone_id: "zone-a",
          active: false,
        }),
        "staff-3"
      )
    ).resolves.toBeNull();
  });

  it("allows same-zone staff, denies other-zone staff, and permits global override", () => {
    const triage = {
      userId: "staff-1",
      role: "TRIAGE" as const,
      zoneId: "zone-a",
      active: true,
    };
    const admin = {
      userId: "staff-2",
      role: "ADMIN" as const,
      zoneId: null,
      active: true,
    };
    expect(assertZoneAccess(triage, "zone-a")).toBe(true);
    expect(assertZoneAccess(triage, "zone-b")).toBe(false);
    expect(assertZoneAccess(admin, "zone-b")).toBe(true);
  });
});
