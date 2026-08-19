import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  drainAttachmentQueue,
  enqueueAttachment,
  listAttachmentQueueItems,
} from "./attachmentQueue";
import { enqueueCitizenRequest, listQueueItems } from "./offlineQueue";

const item = {
  clientAttachmentId: "11111111-1111-4111-8111-111111111111",
  caseCode: "PTL-2026-TEST",
  trackingToken: "token-for-test-only",
  fileName: "evidence.pdf",
  mimeType: "application/pdf",
  byteSize: 4,
  blob: new Blob(["test"], { type: "application/pdf" }),
};

describe("offline attachment queue", () => {
  beforeEach(async () => {
    await new Promise<void>(resolve => {
      const request = indexedDB.deleteDatabase("phatthalung-survival");
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  });

  it("coordinates the shared schema when attachment opens before request queue", async () => {
    await enqueueAttachment(item);
    await enqueueCitizenRequest({
      clientRequestId: "request-shared-db-1",
      createdAt: "2026-08-20T00:00:00.000Z",
      locationMode: "text",
      locationText: "TEST only",
      peopleTotal: 1,
      vulnerableNotes: "",
      contactName: "TEST",
      phone: "0812345678",
    });
    expect((await listAttachmentQueueItems()).length).toBe(1);
    expect((await listQueueItems()).length).toBe(1);
  });

  it("coordinates the shared schema when request queue opens before attachment", async () => {
    await enqueueCitizenRequest({
      clientRequestId: "request-shared-db-2",
      createdAt: "2026-08-20T00:00:00.000Z",
      locationMode: "text",
      locationText: "TEST only",
      peopleTotal: 1,
      vulnerableNotes: "",
      contactName: "TEST",
      phone: "0812345678",
    });
    await enqueueAttachment(item);
    expect((await listQueueItems()).length).toBe(1);
    expect((await listAttachmentQueueItems()).length).toBe(1);
  });

  it("persists a Blob before upload acknowledgement", async () => {
    const queued = await enqueueAttachment(item);
    expect(queued.status).toBe("PENDING");
    expect((await listAttachmentQueueItems())[0]).toMatchObject({
      clientAttachmentId: item.clientAttachmentId,
      status: "PENDING",
      attempts: 0,
    });
  });

  it("marks READY only after the uploader acknowledges", async () => {
    await enqueueAttachment(item);
    const results = await drainAttachmentQueue(async queued => {
      expect(queued.status).toBe("UPLOADING");
      return { acknowledged: true };
    });
    expect(results[0]).toMatchObject({ status: "READY", attempts: 1 });
  });

  it("keeps upload failures retryable and never claims READY", async () => {
    await enqueueAttachment(item);
    const results = await drainAttachmentQueue(async () => {
      throw new Error("storage unavailable");
    });
    expect(results[0]).toMatchObject({
      status: "FAILED",
      lastError: "storage unavailable",
    });
    expect((await listAttachmentQueueItems())[0]?.status).toBe("FAILED");
  });
});
