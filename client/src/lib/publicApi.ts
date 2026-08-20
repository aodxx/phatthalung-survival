import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { CitizenRequestPayload } from "@/lib/offlineQueue";

export type PublicIntakeAcknowledgement = {
  status: "RECEIVED" | "ALREADY_RECEIVED";
  caseCode: string;
  trackingToken?: string;
  receivedAt: string;
};

export type PublicTrackingResult = {
  caseCode: string;
  status: string;
  receivedAt: string;
  attachments: Array<{
    attachmentId: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    uploadedAt?: string;
    downloadUrl?: string;
  }>;
};

export type PublicAttachmentInput = {
  caseCode: string;
  trackingToken: string;
  clientAttachmentId: string;
  fileName: string;
  mimeType: string;
  file: Blob;
};

export type PublicAttachmentAcknowledgement = {
  status: "READY" | "ALREADY_READY";
  attachmentId: string;
  requestId?: string;
  fileName?: string;
  mimeType?: string;
  byteSize?: number;
};

export function isSupabaseProductionRuntime() {
  return import.meta.env.VITE_RUNTIME_BACKEND === "supabase";
}

function requireSupabaseRuntime() {
  if (!isSupabaseProductionRuntime())
    throw new Error("Supabase production runtime is not enabled");
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Supabase browser client is not configured");
  return client;
}

function assertObject<T>(value: unknown, message: string): T {
  if (!value || typeof value !== "object") throw new Error(message);
  return value as T;
}

export async function submitPublicIntakeProduction(
  input: CitizenRequestPayload
) {
  const { data, error } = await requireSupabaseRuntime().functions.invoke(
    "public-intake",
    { body: input }
  );
  if (error) throw new Error(error.message || "Public intake failed");
  return assertObject<PublicIntakeAcknowledgement>(
    data,
    "Invalid intake acknowledgement"
  );
}

export async function lookupPublicTrackingProduction(input: {
  caseCode: string;
  trackingToken: string;
}) {
  const { data, error } = await requireSupabaseRuntime().functions.invoke(
    "public-tracking",
    { body: input }
  );
  if (error) throw new Error(error.message || "Tracking lookup failed");
  return assertObject<PublicTrackingResult>(data, "Invalid tracking response");
}

export async function downloadPublicAttachmentProduction(input: {
  caseCode: string;
  trackingToken: string;
  attachmentId: string;
}) {
  const { data, error } = await requireSupabaseRuntime().functions.invoke(
    "public-attachment-download",
    { body: input }
  );
  if (error) throw new Error(error.message || "Attachment download failed");
  return assertObject<{ signedUrl: string }>(
    data,
    "Invalid attachment download response"
  );
}

export async function uploadPublicAttachmentProduction(
  input: PublicAttachmentInput
) {
  const { data, error } = await requireSupabaseRuntime().functions.invoke(
    "public-attachment-upload",
    {
      body: input.file,
      headers: {
        "content-type": input.mimeType,
        "x-case-code": input.caseCode,
        "x-tracking-token": input.trackingToken,
        "x-client-attachment-id": input.clientAttachmentId,
        "x-file-name": input.fileName,
      },
    }
  );
  if (error) throw new Error(error.message || "Attachment upload failed");
  return assertObject<PublicAttachmentAcknowledgement>(
    data,
    "Invalid attachment acknowledgement"
  );
}
