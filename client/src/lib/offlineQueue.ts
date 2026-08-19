export type QueueStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";
export type PublicNeedType =
  | "MEDICAL"
  | "EVACUATION"
  | "FLOOD_TRAPPED"
  | "FOOD_WATER"
  | "MEDICINE"
  | "FIRE"
  | "ACCIDENT"
  | "OTHER";

export type CitizenRequestPayload = {
  clientRequestId: string;
  createdAt: string;
  locationMode: "gps" | "text";
  locationText: string;
  incidentType?: string;
  needType?: PublicNeedType;
  peopleTotal: number | null;
  peopleTotalApproximate?: boolean;
  vulnerableUnknown?: boolean;
  vulnerableNotes: string;
  contactName: string;
  phone: string;
  reporterRelation?: "SELF" | "FAMILY" | "NEIGHBOR" | "VOLUNTEER" | "OTHER";
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracyM?: number | null;
  childrenCount?: number | null;
  elderlyCount?: number | null;
  disabledCount?: number | null;
  bedriddenCount?: number | null;
  urgentMedicalCount?: number | null;
};

export type QueueItem = CitizenRequestPayload & {
  status: QueueStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  caseCode?: string;
  trackingToken?: string;
  acknowledgedAt?: string;
};

const DB_NAME = "phatthalung-survival";
const STORE_NAME = "citizen-request-queue";
const DB_VERSION = 3;

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "clientRequestId",
        });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("nextAttemptAt", "nextAttemptAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("attachmentQueue")) {
        db.createObjectStore("attachmentQueue", {
          keyPath: "clientAttachmentId",
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open queue"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  return openQueueDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const request = operation(tx.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () =>
          reject(request.error ?? new Error("Queue operation failed"));
        tx.oncomplete = () => db.close();
        tx.onerror = () =>
          reject(tx.error ?? new Error("Queue transaction failed"));
      })
  );
}

export function createClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function enqueueCitizenRequest(
  payload: CitizenRequestPayload
): Promise<QueueItem> {
  const item: QueueItem = {
    ...payload,
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: Date.now(),
  };
  await withStore<IDBValidKey>("readwrite", store => store.put(item));
  return item;
}

export async function listQueueItems(): Promise<QueueItem[]> {
  const items = await withStore<QueueItem[]>("readonly", store =>
    store.getAll()
  );
  return items.sort((a, b) => a.nextAttemptAt - b.nextAttemptAt);
}

export async function updateQueueItem(item: QueueItem): Promise<void> {
  await withStore<IDBValidKey>("readwrite", store => store.put(item));
}

export function nextRetryAt(
  attempts: number,
  now = Date.now(),
  random = Math.random()
): number {
  const exponentialDelay = Math.min(
    15 * 60 * 1000,
    1000 * 2 ** Math.min(attempts, 10)
  );
  const jitter = Math.floor(exponentialDelay * 0.2 * random);
  return now + exponentialDelay + jitter;
}

export async function drainQueue(
  send: (item: QueueItem) => Promise<{
    acknowledged: boolean;
    caseCode?: string;
    trackingToken?: string;
    receivedAt?: string;
  }>,
  now = Date.now()
): Promise<QueueItem[]> {
  const items = await listQueueItems();
  const eligible = items.filter(
    item => item.status !== "SENT" && item.nextAttemptAt <= now
  );
  const results: QueueItem[] = [];

  for (const item of eligible) {
    const sending: QueueItem = { ...item, status: "SENDING" };
    await updateQueueItem(sending);
    try {
      const result = await send(sending);
      const completed: QueueItem = {
        ...sending,
        status: result.acknowledged ? "SENT" : "FAILED",
        attempts: sending.attempts + 1,
        nextAttemptAt: result.acknowledged
          ? now
          : nextRetryAt(sending.attempts + 1, now),
        lastError: result.acknowledged
          ? undefined
          : "Server did not acknowledge request",
        caseCode: result.acknowledged ? result.caseCode : undefined,
        trackingToken: result.acknowledged ? result.trackingToken : undefined,
        acknowledgedAt: result.acknowledged
          ? (result.receivedAt ?? new Date(now).toISOString())
          : undefined,
      };
      await updateQueueItem(completed);
      results.push(completed);
    } catch (error) {
      const failed: QueueItem = {
        ...sending,
        status: "FAILED",
        attempts: sending.attempts + 1,
        nextAttemptAt: nextRetryAt(sending.attempts + 1, now),
        lastError:
          error instanceof Error ? error.message : "Unknown send failure",
      };
      await updateQueueItem(failed);
      results.push(failed);
    }
  }
  return results;
}
