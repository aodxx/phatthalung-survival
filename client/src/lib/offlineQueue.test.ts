import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createClientRequestId,
  drainQueue,
  enqueueCitizenRequest,
  listQueueItems,
  nextRetryAt,
} from "./offlineQueue";

const payload = {
  clientRequestId: "request-test-1",
  createdAt: "2026-08-20T00:00:00.000Z",
  locationMode: "text" as const,
  locationText: "ตลาดเมืองพัทลุง",
  incidentType: "น้ำท่วม/น้ำป่า",
  peopleTotal: 3,
  vulnerableNotes: "ผู้สูงอายุ 1 คน",
  contactName: "ผู้แจ้ง",
  phone: "0812345678",
};

describe("offline request queue", () => {
  beforeEach(async () => {
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase("phatthalung-survival");
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  });

  it("creates a stable client request ID", () => {
    expect(createClientRequestId()).toMatch(/^.+/);
  });

  it("persists a request before any server acknowledgement", async () => {
    const item = await enqueueCitizenRequest(payload);
    expect(item.status).toBe("PENDING");
    expect((await listQueueItems())[0]).toMatchObject({
      clientRequestId: payload.clientRequestId,
      status: "PENDING",
      attempts: 0,
    });
  });

  it("uses bounded exponential retry with deterministic jitter input", () => {
    expect(nextRetryAt(1, 1000, 0)).toBe(3000);
    expect(nextRetryAt(10, 1000, 1)).toBe(1081000);
    expect(nextRetryAt(20, 1000, 1)).toBe(1081000);
  });

  it("marks an item SENT only after acknowledgement", async () => {
    await enqueueCitizenRequest(payload);
    const results = await drainQueue(async item => {
      expect(item.status).toBe("SENDING");
      return { acknowledged: true, caseCode: "PTL-0001" };
    });

    expect(results[0]).toMatchObject({ status: "SENT", attempts: 1 });
    expect((await listQueueItems())[0]?.status).toBe("SENT");
  });

  it("keeps failed items retryable and never claims success", async () => {
    await enqueueCitizenRequest(payload);
    const results = await drainQueue(async () => {
      throw new Error("offline");
    });

    expect(results[0]?.status).toBe("FAILED");
    expect(results[0]?.lastError).toBe("offline");
    expect((await listQueueItems())[0]?.status).toBe("FAILED");
  });
});
