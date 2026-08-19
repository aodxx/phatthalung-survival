import { createHash, randomBytes, randomUUID } from "node:crypto";
import { runAuditedMutation } from "./mutation";
import { assertSupabaseConfigured } from "./supabase";

export type PublicIntakeInput = {
  clientRequestId: string;
  createdAt: string;
  locationMode: "gps" | "text";
  locationText: string;
  incidentType: string;
  peopleTotal: number;
  vulnerableNotes: string;
  contactName: string;
  phone: string;
};

export type PublicIntakeResult = {
  status: "RECEIVED" | "ALREADY_RECEIVED";
  caseCode: string;
  trackingToken?: string;
};

function makeCaseCode(): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `PTL-${new Date().getUTCFullYear()}-${suffix}`;
}

function hashTrackingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function submitPublicIntake(
  input: PublicIntakeInput
): Promise<PublicIntakeResult> {
  const supabase = assertSupabaseConfigured();
  const { data: existing, error: existingError } = await supabase
    .from("requests")
    .select("case_code")
    .eq("client_request_id", input.clientRequestId)
    .maybeSingle();
  if (existingError)
    throw new Error(`Idempotency lookup failed: ${existingError.message}`);
  if (existing)
    return { status: "ALREADY_RECEIVED", caseCode: existing.case_code };

  const requestId = randomUUID();
  const caseCode = makeCaseCode();
  const trackingToken = randomBytes(24).toString("base64url");
  const occurredAt = new Date(input.createdAt);
  if (Number.isNaN(occurredAt.getTime()))
    throw new Error("createdAt is invalid");

  return runAuditedMutation({
    event: {
      actorUserId: null,
      actorType: "PUBLIC_CITIZEN",
      action: "REQUEST_CREATE",
      entityType: "REQUEST",
      entityId: requestId,
      occurredAt,
      metadata: { source: "WEB", clientRequestId: input.clientRequestId },
    },
    mutation: async () => {
      const { error: requestError } = await supabase.from("requests").insert({
        id: requestId,
        case_code: caseCode,
        client_request_id: input.clientRequestId,
        tracking_token_hash: hashTrackingToken(trackingToken),
        source: "WEB",
        address_text: input.locationText,
        need_types: [input.incidentType],
        description: input.vulnerableNotes || null,
        people_total_estimate: input.peopleTotal,
        network_state: "ONLINE_OR_RECONNECTED",
        received_at: occurredAt.toISOString(),
      });
      if (requestError)
        throw new Error(`Request insert failed: ${requestError.message}`);

      const { error: contactError } = await supabase
        .from("request_contacts")
        .insert({
          request_id: requestId,
          reporter_name: input.contactName || null,
          phone_primary: input.phone,
        });
      if (contactError)
        throw new Error(`Contact insert failed: ${contactError.message}`);

      const { error: peopleError } = await supabase
        .from("request_people_summary")
        .insert({
          request_id: requestId,
          notes: input.vulnerableNotes || null,
        });
      if (peopleError)
        throw new Error(`People summary insert failed: ${peopleError.message}`);

      return { status: "RECEIVED" as const, caseCode, trackingToken };
    },
  });
}
