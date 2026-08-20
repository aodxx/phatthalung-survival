import { Button } from "@/components/ui/button";
import {
  ATTACHMENT_POLICY,
  validateAttachmentMetadata,
} from "@/../../shared/attachments";
import {
  drainAttachmentQueue,
  enqueueAttachment,
  type AttachmentQueueItem,
} from "@/lib/attachmentQueue";
import {
  isSupabaseProductionRuntime,
  uploadPublicAttachmentProduction,
} from "@/lib/publicApi";
import { CheckCircle2, FilePlus2, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type UploadState =
  | "READY"
  | "UPLOADING"
  | "PENDING"
  | "READY_SERVER"
  | "FAILED";
type UploadItem = {
  id: string;
  file: File;
  state: UploadState;
  message?: string;
};

async function postAttachment(item: {
  id: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  caseCode: string;
  trackingToken: string;
}) {
  if (isSupabaseProductionRuntime()) {
    return uploadPublicAttachmentProduction({
      clientAttachmentId: item.id,
      fileName: item.fileName,
      mimeType: item.mimeType,
      file: item.blob,
      caseCode: item.caseCode,
      trackingToken: item.trackingToken,
    });
  }

  const response = await fetch("/api/public/attachments", {
    method: "POST",
    headers: {
      "content-type": item.mimeType,
      "x-case-code": item.caseCode,
      "x-tracking-token": item.trackingToken,
      "x-client-attachment-id": item.id,
      "x-file-name": item.fileName,
    },
    body: item.blob,
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "อัปโหลดไม่สำเร็จ");
  return payload;
}

export default function AttachmentUploader({
  caseCode,
  trackingToken,
}: {
  caseCode: string;
  trackingToken: string;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const drainLock = useRef<Promise<void> | null>(null);

  const drainPending = useCallback(
    async (force = false) => {
      if (drainLock.current) return drainLock.current;
      const run = (async () => {
        const results = await drainAttachmentQueue(
          async (item: AttachmentQueueItem) => {
            await postAttachment({
              id: item.clientAttachmentId,
              fileName: item.fileName,
              mimeType: item.mimeType,
              blob: item.blob,
              caseCode: item.caseCode,
              trackingToken: item.trackingToken,
            });
            return { acknowledged: true };
          },
          Date.now(),
          force
        );
        setItems(current =>
          current.map(entry => {
            const result = results.find(
              candidate => candidate.clientAttachmentId === entry.id
            );
            if (!result) return entry;
            return result.status === "READY"
              ? { ...entry, state: "READY_SERVER", message: undefined }
              : {
                  ...entry,
                  state: "PENDING",
                  message: "บันทึกไว้แล้ว จะลองส่งใหม่เมื่อเครือข่ายพร้อม",
                };
          })
        );
      })();
      drainLock.current = run;
      try {
        await run;
      } finally {
        if (drainLock.current === run) drainLock.current = null;
      }
    },
    [caseCode, trackingToken]
  );

  useEffect(() => {
    const onOnline = () => void drainPending(true);
    void drainPending();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [drainPending]);

  const chooseFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const next = selected.map(file => {
      const error = validateAttachmentMetadata(file);
      return {
        id: crypto.randomUUID(),
        file,
        state: error ? ("FAILED" as const) : ("READY" as const),
        message: error ?? undefined,
      };
    });
    setItems(current =>
      [...current, ...next].slice(0, ATTACHMENT_POLICY.maxFiles)
    );
    event.target.value = "";
  };

  const uploadOne = async (item: UploadItem) => {
    setItems(current =>
      current.map(entry =>
        entry.id === item.id
          ? { ...entry, state: "UPLOADING", message: undefined }
          : entry
      )
    );
    try {
      await postAttachment({
        id: item.id,
        fileName: item.file.name,
        mimeType: item.file.type,
        blob: item.file,
        caseCode,
        trackingToken,
      });
      setItems(current =>
        current.map(entry =>
          entry.id === item.id ? { ...entry, state: "READY_SERVER" } : entry
        )
      );
    } catch (error) {
      try {
        await enqueueAttachment({
          clientAttachmentId: item.id,
          caseCode,
          trackingToken,
          fileName: item.file.name,
          mimeType: item.file.type,
          byteSize: item.file.size,
          blob: item.file,
        });
        setItems(current =>
          current.map(entry =>
            entry.id === item.id
              ? {
                  ...entry,
                  state: "PENDING",
                  message: "บันทึกไว้แล้ว จะลองส่งใหม่เมื่อเครือข่ายพร้อม",
                }
              : entry
          )
        );
      } catch {
        setItems(current =>
          current.map(entry =>
            entry.id === item.id
              ? {
                  ...entry,
                  state: "FAILED",
                  message:
                    error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ",
                }
              : entry
          )
        );
      }
    }
  };

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
      aria-labelledby="attachment-heading"
    >
      <div className="flex items-start gap-3">
        <FilePlus2 className="mt-1 size-5 text-cyan-700" />
        <div>
          <h2 id="attachment-heading" className="font-extrabold text-slate-900">
            แนบรูปหรือเอกสารเพิ่มเติม
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            แนบได้ไม่เกิน {ATTACHMENT_POLICY.maxFiles} ไฟล์ ไฟล์ละไม่เกิน 10 MB
            รองรับ JPG, PNG, WebP และ PDF การแนบเป็นขั้นตอนแยกจากการแจ้งเหตุ
          </p>
        </div>
      </div>
      <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-cyan-400 bg-cyan-50 px-4 text-sm font-bold text-cyan-900 hover:bg-cyan-100">
        <input
          className="sr-only"
          type="file"
          accept={ATTACHMENT_POLICY.allowedMimeTypes.join(",")}
          multiple
          onChange={chooseFiles}
        />
        เลือกไฟล์
      </label>
      <div className="mt-4 space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-800">
                {item.file.name}
              </p>
              <p className="text-xs text-slate-500">
                {Math.ceil(item.file.size / 1024)} KB
              </p>
              {item.message && (
                <p className="text-xs text-amber-800" role="status">
                  {item.message}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.state === "READY" && (
                <Button
                  size="sm"
                  type="button"
                  onClick={() => void uploadOne(item)}
                >
                  อัปโหลด
                </Button>
              )}
              {item.state === "UPLOADING" && (
                <Loader2
                  className="size-4 animate-spin text-cyan-700"
                  aria-label="กำลังอัปโหลด"
                />
              )}
              {item.state === "PENDING" && (
                <>
                  <Loader2
                    className="size-4 text-amber-700"
                    aria-label="รอส่งใหม่"
                  />
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => void drainPending(true)}
                  >
                    ลองส่งใหม่
                  </Button>
                </>
              )}
              {item.state === "READY_SERVER" && (
                <CheckCircle2
                  className="size-5 text-emerald-700"
                  aria-label="อัปโหลดสำเร็จ"
                />
              )}
              {item.state === "FAILED" && (
                <XCircle
                  className="size-5 text-red-700"
                  aria-label="อัปโหลดไม่สำเร็จ"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
