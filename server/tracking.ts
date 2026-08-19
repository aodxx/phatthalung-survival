import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured } from "./supabase";
import type { PublicAttachmentMetadata } from "./attachments";

export type PublicOperationalStatus =
  | "RECEIVED"
  | "REVIEWING"
  | "ASSIGNED"
  | "EN_ROUTE"
  | "ON_SCENE"
  | "RESOLVED";

export type PublicTrackingResult = {
  caseCode: string;
  status: PublicOperationalStatus;
  receivedAt: string;
  attachments: PublicAttachmentMetadata[];
};

function toPublicOperationalStatus(value: string): PublicOperationalStatus {
  switch (value) {
    case "UNVERIFIED":
      return "RECEIVED";
    case "NEW":
    case "NEEDS_REVIEW":
    case "CONTACTED":
    case "VERIFIED":
    case "NEEDS_RECHECK":
      return "REVIEWING";
    case "ASSIGNED":
    case "CONFIRMED":
      return "ASSIGNED";
    case "EN_ROUTE":
      return "EN_ROUTE";
    case "ON_SCENE":
      return "ON_SCENE";
    case "RESOLVED":
    case "CLOSED":
    case "COMPLETED":
      return "RESOLVED";
    default:
      return "REVIEWING";
  }
}

async function lookupOperationalStatus(
  supabase: SupabaseClient,
  requestId: string,
  fallback: string
) {
  const { data: links, error: linkError } = await supabase
    .from("incident_requests")
    .select("incident_id")
    .eq("request_id", requestId);
  if (linkError)
    throw new Error(`Tracking incident lookup failed: ${linkError.message}`);
  const incidentId = links?.[0]?.incident_id;
  if (!incidentId) return toPublicOperationalStatus(fallback);

  const { data: missions, error: missionError } = await supabase
    .from("missions")
    .select("status")
    .eq("incident_id", incidentId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (missionError)
    throw new Error(`Tracking mission lookup failed: ${missionError.message}`);
  const missionStatus = missions?.[0]?.status;
  if (missionStatus) return toPublicOperationalStatus(missionStatus);

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select("status")
    .eq("id", incidentId)
    .maybeSingle();
  if (incidentError)
    throw new Error(
      `Tracking incident status lookup failed: ${incidentError.message}`
    );
  return toPublicOperationalStatus(incident?.status ?? fallback);
}

export async function lookupPublicTracking(
  input: { caseCode: string; trackingToken: string },
  supabaseClient?: SupabaseClient
): Promise<PublicTrackingResult | null> {
  const supabase = supabaseClient ?? assertSupabaseConfigured();
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
  const publicStatus = await lookupOperationalStatus(
    supabase,
    data.id,
    data.verification_status
  );
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
    status: publicStatus,
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
