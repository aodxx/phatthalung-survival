import { createHash, randomUUID } from "node:crypto";
import type { Request } from "express";
import {
  ATTACHMENT_POLICY,
  sanitizeAttachmentFileName,
  validateAttachmentMetadata,
} from "../shared/attachments";
import { runAuditedMutation } from "./mutation";
import { assertSupabaseConfigured } from "./supabase";
import { storagePut } from "./storage";

export class AttachmentClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 404 | 409 | 413 = 400
  ) {
    super(message);
    this.name = "AttachmentClientError";
  }
}

export function attachmentHttpError(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof AttachmentClientError) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 503, message: "Attachment upload unavailable" };
}

export type AttachmentUploadResult = {
  status: "READY" | "ALREADY_READY";
  attachmentId: string;
  requestId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  url?: string;
};

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function headerValue(request: Request, name: string): string {
  const value = request.header(name);
  if (!value?.trim()) throw new AttachmentClientError(`Missing ${name}`);
  return value.trim();
}

export async function uploadPublicAttachment(
  request: Request
): Promise<AttachmentUploadResult> {
  const caseCode = headerValue(request, "x-case-code").toUpperCase();
  const trackingToken = headerValue(request, "x-tracking-token");
  const clientAttachmentId = headerValue(request, "x-client-attachment-id");
  const fileName = headerValue(request, "x-file-name");
  const mimeType = headerValue(request, "content-type")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const body = Buffer.isBuffer(request.body)
    ? request.body
    : Buffer.from(request.body ?? "");

  const metadataError = validateAttachmentMetadata({
    name: fileName,
    type: mimeType,
    size: body.byteLength,
  });
  if (metadataError) throw new AttachmentClientError(metadataError);
  if (!/^[0-9a-f-]{36}$/i.test(clientAttachmentId))
    throw new AttachmentClientError("Invalid client attachment ID");
  if (body.byteLength > ATTACHMENT_POLICY.maxBytesPerFile)
    throw new AttachmentClientError("Attachment is too large", 413);

  const supabase = assertSupabaseConfigured();
  const tokenHash = sha256(trackingToken);
  const { data: requestRow, error: requestError } = await supabase
    .from("requests")
    .select("id, case_code")
    .eq("case_code", caseCode)
    .eq("tracking_token_hash", tokenHash)
    .maybeSingle();
  if (requestError)
    throw new Error(`Request authorization failed: ${requestError.message}`);
  if (!requestRow)
    throw new AttachmentClientError("Request authorization failed", 404);

  const { data: existing, error: existingError } = await supabase
    .from("attachments")
    .select(
      "id, request_id, filename, mime_type, byte_size, status, storage_path"
    )
    .eq("client_attachment_id", clientAttachmentId)
    .maybeSingle();
  if (existingError)
    throw new Error(
      `Attachment idempotency lookup failed: ${existingError.message}`
    );
  if (existing?.status === "READY") {
    return {
      status: "ALREADY_READY",
      attachmentId: existing.id,
      requestId: existing.request_id,
      fileName: existing.filename,
      mimeType: existing.mime_type,
      byteSize: existing.byte_size,
      url: `/manus-storage/${existing.storage_path}`,
    };
  }

  const { count: activeAttachmentCount, error: countError } = await supabase
    .from("attachments")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestRow.id)
    .in("status", ["PENDING", "UPLOADING", "READY"]);
  if (countError)
    throw new Error(`Attachment count check failed: ${countError.message}`);
  if ((activeAttachmentCount ?? 0) >= ATTACHMENT_POLICY.maxFiles) {
    throw new AttachmentClientError("แนบไฟล์ได้ไม่เกิน 3 ไฟล์ต่อคำร้อง", 409);
  }

  const attachmentId = existing?.id ?? randomUUID();
  return runAuditedMutation({
    event: {
      actorUserId: null,
      actorType: "PUBLIC_CITIZEN",
      action: "ATTACHMENT_UPLOAD",
      entityType: "ATTACHMENT",
      entityId: attachmentId,
      occurredAt: new Date(),
      metadata: {
        requestId: requestRow.id,
        caseCode,
        clientAttachmentId,
        mimeType,
        byteSize: body.byteLength,
      },
    },
    mutation: async () => {
      const pendingValues = {
        id: attachmentId,
        request_id: requestRow.id,
        client_attachment_id: clientAttachmentId,
        storage_path: `pending/${attachmentId}`,
        filename: sanitizeAttachmentFileName(fileName),
        mime_type: mimeType,
        byte_size: body.byteLength,
        checksum_sha256: sha256(body),
        status: "UPLOADING" as const,
        error_code: null,
      };
      const { error: pendingError } = await supabase
        .from("attachments")
        .upsert(pendingValues, { onConflict: "client_attachment_id" });
      if (pendingError)
        throw new Error(
          `Attachment pending insert failed: ${pendingError.message}`
        );

      try {
        const stored = await storagePut(
          `requests/${requestRow.id}/attachments/${attachmentId}-${sanitizeAttachmentFileName(fileName)}`,
          body,
          mimeType
        );
        const { error: readyError } = await supabase
          .from("attachments")
          .update({
            storage_path: stored.key,
            status: "READY",
            uploaded_at: new Date().toISOString(),
            error_code: null,
          })
          .eq("id", attachmentId);
        if (readyError)
          throw new Error(
            `Attachment ready update failed: ${readyError.message}`
          );
        return {
          status: "READY" as const,
          attachmentId,
          requestId: requestRow.id,
          fileName: pendingValues.filename,
          mimeType,
          byteSize: body.byteLength,
          url: stored.url,
        };
      } catch (error) {
        await supabase
          .from("attachments")
          .update({ status: "FAILED", error_code: "UPLOAD_FAILED" })
          .eq("id", attachmentId);
        throw error;
      }
    },
  });
}
