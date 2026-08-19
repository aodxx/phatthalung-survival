import { describe, expect, it } from "vitest";
import { recordAuditEvent } from "./audit";

describe("audit foundation", () => {
  it("rejects staff events without an actor", async () => {
    await expect(
      recordAuditEvent({
        actorUserId: null,
        actorType: "STAFF",
        action: "CREATE",
        entityType: "REQUEST",
        entityId: "request-1",
        occurredAt: new Date(),
      })
    ).rejects.toThrow("Audit actorUserId is required for staff events");
  });

  it("accepts a public citizen actor without exposing an auth user ID", async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(
      recordAuditEvent({
        actorUserId: null,
        actorType: "PUBLIC_CITIZEN",
        action: "CREATE",
        entityType: "REQUEST",
        entityId: "request-1",
        occurredAt: new Date(),
      })
    ).rejects.toThrow("Supabase is not configured");

    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("rejects mutations without an entity ID", async () => {
    await expect(
      recordAuditEvent({
        actorUserId: "staff-1",
        actorType: "STAFF",
        action: "CREATE",
        entityType: "REQUEST",
        entityId: "",
        occurredAt: new Date(),
      })
    ).rejects.toThrow("Audit entityId is required");
  });

  it("rejects mutations with an invalid timestamp", async () => {
    await expect(
      recordAuditEvent({
        actorUserId: "staff-1",
        actorType: "STAFF",
        action: "CREATE",
        entityType: "REQUEST",
        entityId: "request-1",
        occurredAt: new Date("invalid"),
      })
    ).rejects.toThrow("Audit occurredAt is invalid");
  });
});
