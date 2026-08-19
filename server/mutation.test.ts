import { describe, expect, it, vi } from "vitest";
import {
  runAuditedMutation,
  runTransactionalAuditedMutation,
} from "./mutation";

const event = {
  actorUserId: "staff-1",
  actorType: "STAFF" as const,
  action: "CREATE",
  entityType: "REQUEST",
  entityId: "request-1",
  occurredAt: new Date("2026-08-20T00:00:00.000Z"),
};

describe("audited mutation wrapper", () => {
  it("commits mutation and success audit through the supplied transaction boundary", async () => {
    const order: string[] = [];
    const result = await runTransactionalAuditedMutation({
      event,
      transaction: async work => {
        order.push("transaction:start");
        const value = await work();
        order.push("transaction:commit");
        return value;
      },
      mutation: async () => {
        order.push("mutation");
        return "committed";
      },
      audit: async () => {
        order.push("audit");
      },
    });
    expect(result).toBe("committed");
    expect(order).toEqual([
      "transaction:start",
      "mutation",
      "audit",
      "transaction:commit",
    ]);
  });

  it("rolls back the supplied transaction before any success audit can remain", async () => {
    const order: string[] = [];
    await expect(
      runTransactionalAuditedMutation({
        event,
        transaction: async work => {
          order.push("transaction:start");
          try {
            return await work();
          } catch (error) {
            order.push("transaction:rollback");
            throw error;
          }
        },
        mutation: async () => {
          order.push("mutation");
          throw new Error("business failed");
        },
        audit: async () => {
          order.push("audit");
        },
      })
    ).rejects.toThrow("business failed");
    expect(order).toEqual([
      "transaction:start",
      "mutation",
      "transaction:rollback",
    ]);
  });
  it("audits only after the business mutation succeeds", async () => {
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
    expect(order).toEqual(["mutation", "audit"]);
  });

  it("does not run the success audit when the mutation fails", async () => {
    const audit = vi.fn(async () => undefined);
    await expect(
      runAuditedMutation({
        event,
        audit,
        mutation: async () => {
          throw new Error("business mutation failed");
        },
      })
    ).rejects.toThrow("business mutation failed");
    expect(audit).not.toHaveBeenCalled();
  });

  it("propagates an audit failure after the business mutation result exists", async () => {
    const mutation = vi.fn(async () => "created");
    await expect(
      runAuditedMutation({
        event,
        audit: async () => {
          throw new Error("audit unavailable");
        },
        mutation,
      })
    ).rejects.toThrow("audit unavailable");
    expect(mutation).toHaveBeenCalledOnce();
  });
});
