import { createHash } from "node:crypto";
import { assertSupabaseConfigured } from "./supabase";

export type PublicTrackingResult = {
  caseCode: string;
  status: string;
  receivedAt: string;
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
    .select("case_code, verification_status, received_at")
    .eq("case_code", input.caseCode.trim().toUpperCase())
    .eq("tracking_token_hash", trackingTokenHash)
    .maybeSingle();

  if (error) throw new Error(`Tracking lookup failed: ${error.message}`);
  if (!data) return null;
  return {
    caseCode: data.case_code,
    status: data.verification_status,
    receivedAt: data.received_at,
  };
}
