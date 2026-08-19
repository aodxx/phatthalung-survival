import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getSupabaseAdmin } from "./supabase";

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === "true";

describe.skipIf(!runIntegration)("Supabase atomic public intake", () => {
  it("rolls back the request and audit when a child insert fails", async () => {
    const supabase = getSupabaseAdmin();
    expect(supabase, "Supabase server credentials are required").toBeTruthy();
    const clientRequestId = randomUUID();
    const requestId = randomUUID();
    const { error } = await supabase!.rpc("submit_public_intake_atomic", {
      p_payload: {
        requestId,
        clientRequestId,
        caseCode: `PTL-ROLLBACK-${clientRequestId.slice(0, 8).toUpperCase()}`,
        trackingToken: "integration-token",
        trackingTokenHash: "integration-hash",
        source: "WEB",
        receivedAt: new Date().toISOString(),
        auditAt: new Date().toISOString(),
        addressText: "integration rollback boundary",
        needTypes: ["OTHER"],
        phone: "081 234 5678",
        phoneNormalizedHash: "integration-phone-hash",
        peopleTotal: "1",
        contactName: "integration",
      },
    });
    expect(error).toBeTruthy();

    const [{ data: requests }, { data: audits }] = await Promise.all([
      supabase!.from("requests").select("id").eq("id", requestId).limit(1),
      supabase!
        .from("audit_logs")
        .select("id")
        .eq("entity_id", requestId)
        .limit(1),
    ]);
    expect(requests).toEqual([]);
    expect(audits).toEqual([]);
  }, 30_000);
});
