import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getSupabaseAdmin } from "./supabase";

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === "true";

describe.skipIf(!runIntegration)("Supabase atomic public intake", () => {
  it("returns one original acknowledgement and one tokenless duplicate under concurrent submissions", async () => {
    const supabase = getSupabaseAdmin();
    expect(supabase, "Supabase server credentials are required").toBeTruthy();
    const clientRequestId = randomUUID();
    const payload = (suffix: string) => ({
      requestId: randomUUID(),
      clientRequestId,
      caseCode: `PTL-RACE-${suffix}-${clientRequestId.slice(0, 8).toUpperCase()}`,
      trackingToken: `race-token-${suffix}`,
      trackingTokenHash: `race-hash-${suffix}`,
      source: "WEB",
      receivedAt: new Date().toISOString(),
      auditAt: new Date().toISOString(),
      addressText: "isolated concurrency boundary",
      needTypes: ["OTHER"],
      phone: "0812345678",
      phoneNormalizedHash: `race-phone-${suffix}`,
      peopleTotal: "1",
      contactName: "isolated",
    });
    try {
      const results = await Promise.all(
        ["A", "B"].map(suffix =>
          supabase!.rpc("submit_public_intake_atomic", {
            p_payload: payload(suffix),
          })
        )
      );
      const values = results
        .map(result => result.data)
        .filter(Boolean) as Array<{
        status: string;
        caseCode: string;
        trackingToken?: string;
      }>;
      expect(values).toHaveLength(2);
      expect(values.filter(value => value.status === "RECEIVED")).toHaveLength(
        1
      );
      expect(
        values.filter(value => value.status === "ALREADY_RECEIVED")
      ).toHaveLength(1);
      const received = values.find(value => value.status === "RECEIVED")!;
      const duplicate = values.find(
        value => value.status === "ALREADY_RECEIVED"
      )!;
      expect(duplicate.caseCode).toBe(received.caseCode);
      expect(duplicate.trackingToken).toBeUndefined();
    } finally {
      const { data: rows } = await supabase!
        .from("requests")
        .select("id")
        .eq("client_request_id", clientRequestId)
        .limit(2);
      for (const row of rows ?? []) {
        await supabase!.from("audit_logs").delete().eq("entity_id", row.id);
        await supabase!
          .from("request_contacts")
          .delete()
          .eq("request_id", row.id);
        await supabase!
          .from("request_people_summary")
          .delete()
          .eq("request_id", row.id);
        await supabase!.from("requests").delete().eq("id", row.id);
      }
    }
  }, 30_000);

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
