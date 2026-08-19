import { createHash } from "node:crypto";
import { assertSupabaseConfigured } from "./supabase";
import type { PublicAttachmentMetadata } from "./attachments";

export type PublicTrackingResult = {
  caseCode: string;
  status: string;
  receivedAt: string;
  attachments: PublicAttachmentMetadata[];
};

export async function lookupPublicTracking(input: {
  caseCode: string;
  trackingToken: string;
}): Promise<PublicTrackingResult | null> {
  const supabase = assertSupabaseConfigured();
  const trackingTokenHash = createHash("sha256")
    .update(input.trackingToken)
    .digest("hex");
  const { data, error } = await supabase
    .from("requests")
    .select("id, case_code, verification_status, received_at")
    .eq("case_code", input.caseCode.trim().toUpperCase())
    .eq("tracking_token_hash", trackingTokenHash)
    .maybeSingle();

  if (error) throw new Error(`Tracking lookup failed: ${error.message}`);
  if (!data) return null;
  const { data: attachments, error: attachmentError } = await supabase
    .from("attachments")
    .select("id, filename, mime_type, byte_size, uploaded_at, status")
    .eq("request_id", data.id)
    .eq("status", "READY")
    .order("uploaded_at", { ascending: false });
  if (attachmentError)
    throw new Error(
      `Tracking attachment lookup failed: ${attachmentError.message}`
    );
  return {
    caseCode: data.case_code,
    status: data.verification_status,
    receivedAt: data.received_at,
    attachments: (attachments ?? []).map(attachment => ({
      attachmentId: attachment.id,
      fileName: attachment.filename,
      mimeType: attachment.mime_type,
      byteSize: attachment.byte_size,
      uploadedAt: attachment.uploaded_at,
      downloadUrl: `/api/public/attachments/${attachment.id}`,
    })),
  };
}
