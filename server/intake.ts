import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured } from "./supabase";
import { hashNormalizedPhone, normalizeAndValidateThaiPhone } from "./phone";

export const PUBLIC_NEED_TYPES = [
  "MEDICAL",
  "EVACUATION",
  "FLOOD_TRAPPED",
  "FOOD_WATER",
  "MEDICINE",
  "FIRE",
  "ACCIDENT",
  "OTHER",
] as const;
export type PublicNeedType = (typeof PUBLIC_NEED_TYPES)[number];
export const REPORTER_RELATIONS = [
  "SELF",
  "FAMILY",
  "NEIGHBOR",
  "VOLUNTEER",
  "OTHER",
] as const;
export type ReporterRelation = (typeof REPORTER_RELATIONS)[number];

export type PublicIntakeInput = {
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
  reporterRelation?: ReporterRelation;
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracyM?: number | null;
  childrenCount?: number | null;
  elderlyCount?: number | null;
  disabledCount?: number | null;
  bedriddenCount?: number | null;
  urgentMedicalCount?: number | null;
};

export type PublicIntakeResult = {
  status: "RECEIVED" | "ALREADY_RECEIVED";
  caseCode: string;
  trackingToken?: string;
  receivedAt: string;
};

function makeCaseCode(): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `PTL-${new Date().getUTCFullYear()}-${suffix}`;
}

function hashTrackingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function resolveNeedType(input: PublicIntakeInput): PublicNeedType {
  const candidate = input.needType ?? input.incidentType;
  if (!candidate || !PUBLIC_NEED_TYPES.includes(candidate as PublicNeedType)) {
    throw new Error("needType is invalid");
  }
  return candidate as PublicNeedType;
}

export async function submitPublicIntake(
  input: PublicIntakeInput,
  supabaseClient?: SupabaseClient
): Promise<PublicIntakeResult> {
  const occurredAt = new Date(input.createdAt);
  if (Number.isNaN(occurredAt.getTime()))
    throw new Error("createdAt is invalid");
  const phone = normalizeAndValidateThaiPhone(input.phone);
  const needType = resolveNeedType(input);
  const trackingToken = randomBytes(24).toString("base64url");
  const supabase = supabaseClient ?? assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("submit_public_intake_atomic", {
    p_payload: {
      requestId: randomUUID(),
      clientRequestId: input.clientRequestId,
      caseCode: makeCaseCode(),
      trackingToken,
      trackingTokenHash: hashTrackingToken(trackingToken),
      source: "WEB",
      receivedAt: occurredAt.toISOString(),
      auditAt: occurredAt.toISOString(),
      addressText: input.locationText.trim(),
      needTypes: [needType],
      description: input.vulnerableNotes.trim(),
      peopleTotal: input.peopleTotal === null ? "" : String(input.peopleTotal),
      peopleTotalApproximate: input.peopleTotalApproximate ?? true,
      vulnerableUnknown: input.vulnerableUnknown ?? false,
      vulnerableNotes: input.vulnerableNotes.trim(),
      contactName: input.contactName.trim(),
      phone,
      phoneNormalizedHash: hashNormalizedPhone(phone),
      reporterRelation: input.reporterRelation ?? "SELF",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      gpsAccuracyM: input.gpsAccuracyM ?? null,
      childrenCount: input.childrenCount ?? null,
      elderlyCount: input.elderlyCount ?? null,
      disabledCount: input.disabledCount ?? null,
      bedriddenCount: input.bedriddenCount ?? null,
      urgentMedicalCount: input.urgentMedicalCount ?? null,
      networkState: "ONLINE_OR_RECONNECTED",
    },
  });
  if (error) throw new Error(`Atomic intake failed: ${error.message}`);
  if (!data || typeof data !== "object") {
    throw new Error("Atomic intake returned an invalid acknowledgement");
  }
  const result = data as Partial<PublicIntakeResult>;
  if (
    (result.status !== "RECEIVED" && result.status !== "ALREADY_RECEIVED") ||
    typeof result.caseCode !== "string" ||
    typeof result.receivedAt !== "string"
  ) {
    throw new Error("Atomic intake returned an invalid acknowledgement");
  }
  return result as PublicIntakeResult;
}
