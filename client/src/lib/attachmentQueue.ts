export type AttachmentQueueStatus =
  | "PENDING"
  | "UPLOADING"
  | "READY"
  | "FAILED";

export type AttachmentQueueItem = {
  clientAttachmentId: string;
  caseCode: string;
  trackingToken: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  blob: Blob;
  status: AttachmentQueueStatus;
  attempts: number;
  nextAttemptAt: number;
  updatedAt: number;
  lockedAt?: number;
  lastError?: string;
};

const DB_NAME = "phatthalung-survival";
const STORE_NAME = "attachmentQueue";
const VERSION = 3;
export const ATTACHMENT_UPLOAD_STALE_MS = 2 * 60 * 1000;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "clientAttachmentId",
        });
      }
      if (!db.objectStoreNames.contains("citizen-request-queue")) {
        const store = db.createObjectStore("citizen-request-queue", {
          keyPath: "clientRequestId",
        });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("nextAttemptAt", "nextAttemptAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

export function nextAttachmentRetryAt(
  attempts: number,
  now = Date.now()
): number {
  const boundedAttempts = Math.min(Math.max(attempts, 1), 10);
  const delay = Math.min(15 * 60 * 1000, 1000 * 2 ** boundedAttempts);
  return now + delay;
}

export async function enqueueAttachment(
  item: Omit<
    AttachmentQueueItem,
    "status" | "attempts" | "nextAttemptAt" | "updatedAt" | "lockedAt"
  >
): Promise<AttachmentQueueItem> {
  const now = Date.now();
  const next: AttachmentQueueItem = {
    ...item,
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: now,
    updatedAt: now,
  };
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(next);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Attachment queue write failed"));
  });
  db.close();
  return next;
}

export async function listAttachmentQueueItems(): Promise<
  AttachmentQueueItem[]
> {
  const db = await openDatabase();
  const items = await new Promise<AttachmentQueueItem[]>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll();
    request.onsuccess = () => resolve(request.result as AttachmentQueueItem[]);
    request.onerror = () =>
      reject(request.error ?? new Error("Attachment queue read failed"));
  });
  db.close();
  return items.sort((a, b) => a.nextAttemptAt - b.nextAttemptAt);
}

export async function updateAttachmentQueueItem(
  item: AttachmentQueueItem
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Attachment queue update failed"));
  });
  db.close();
}

export async function recoverStaleAttachmentQueueItems(
  now = Date.now(),
  staleAfterMs = ATTACHMENT_UPLOAD_STALE_MS
): Promise<AttachmentQueueItem[]> {
  const items = await listAttachmentQueueItems();
  const recovered: AttachmentQueueItem[] = [];
  for (const item of items) {
    if (
      item.status !== "UPLOADING" ||
      (item.lockedAt !== undefined && item.lockedAt > now - staleAfterMs)
    )
      continue;
    const next = {
      ...item,
      status: "FAILED" as const,
      nextAttemptAt: now,
      updatedAt: now,
      lockedAt: undefined,
      lastError: "อัปโหลดหยุดชะงัก จะลองส่งใหม่เมื่อเครือข่ายพร้อม",
    };
    await updateAttachmentQueueItem(next);
    recovered.push(next);
  }
  return recovered;
}

export async function drainAttachmentQueue(
  upload: (item: AttachmentQueueItem) => Promise<{ acknowledged: boolean }>,
  now = Date.now(),
  force = false
): Promise<AttachmentQueueItem[]> {
  await recoverStaleAttachmentQueueItems(now);
  const items = await listAttachmentQueueItems();
  const results: AttachmentQueueItem[] = [];
  for (const item of items) {
    if (
      (item.status !== "PENDING" && item.status !== "FAILED") ||
      (!force && item.nextAttemptAt > now)
    )
      continue;
    const sending = {
      ...item,
      status: "UPLOADING" as const,
      attempts: item.attempts + 1,
      updatedAt: now,
      lockedAt: now,
    };
    await updateAttachmentQueueItem(sending);
    try {
      const result = await upload(sending);
      const next = result.acknowledged
        ? {
            ...sending,
            status: "READY" as const,
            updatedAt: now,
            lockedAt: undefined,
            lastError: undefined,
          }
        : {
            ...sending,
            status: "FAILED" as const,
            nextAttemptAt: nextAttachmentRetryAt(sending.attempts, now),
            updatedAt: now,
            lockedAt: undefined,
            lastError: "Server did not acknowledge attachment",
          };
      await updateAttachmentQueueItem(next);
      results.push(next);
    } catch (error) {
      const next = {
        ...sending,
        status: "FAILED" as const,
        nextAttemptAt: nextAttachmentRetryAt(sending.attempts, now),
        updatedAt: now,
        lockedAt: undefined,
        lastError:
          error instanceof Error ? error.message : "Attachment upload failed",
      };
      await updateAttachmentQueueItem(next);
      results.push(next);
    }
  }
  return results;
}
