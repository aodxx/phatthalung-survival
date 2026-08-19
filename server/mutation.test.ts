import { describe, expect, it, vi } from "vitest";
import { runAuditedMutation } from "./mutation";

const event = {
  actorUserId: "staff-1",
  actorType: "STAFF" as const,
  action: "CREATE",
  entityType: "REQUEST",
  entityId: "request-1",
  occurredAt: new Date("2026-08-20T00:00:00.000Z"),
};

describe("audited mutation wrapper", () => {
  it("audits before running the mutation", async () => {
    const order: string[] = [];
    const result = await runAuditedMutation({
      event,
      audit: async () => {
        order.push("audit");
      },
      mutation: async () => {
        order.push("mutation");
        return "ok";
      },
    });

    expect(result).toBe("ok");
    expect(order).toEqual(["audit", "mutation"]);
  });

  it("does not run the mutation when audit fails", async () => {
    const mutation = vi.fn(async () => "should-not-run");
    await expect(
      runAuditedMutation({
        event,
        audit: async () => {
          throw new Error("audit unavailable");
        },
        mutation,
      })
    ).rejects.toThrow("audit unavailable");
    expect(mutation).not.toHaveBeenCalled();
  });
});
