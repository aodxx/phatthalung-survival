import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const C = {
  "Access-Control-Allow-Origin": "https://aodxx.github.io",
  "Access-Control-Allow-Headers":
    "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const out = (x: unknown, s = 200) =>
  new Response(JSON.stringify(x), {
    status: s,
    headers: { ...C, "Content-Type": "application/json" },
  });
const b64 = (a: Uint8Array) => {
  let s = "";
  for (const x of a) s += String.fromCharCode(x);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
    )
  )
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");

Deno.serve(async r => {
  if (r.method === "OPTIONS") return new Response("ok", { headers: C });
  if (r.method !== "POST") return out({ error: "Method not allowed" }, 405);
  try {
    const i = await r.json();
    const phone = String(i.phone ?? "").replace(/[\s-]/g, "");
    const needs = [
      "MEDICAL",
      "EVACUATION",
      "FLOOD_TRAPPED",
      "FOOD_WATER",
      "MEDICINE",
      "FIRE",
      "ACCIDENT",
      "OTHER",
    ];
    const need = i.needType ?? i.incidentType;
    if (
      typeof i.clientRequestId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(i.clientRequestId) ||
      typeof i.createdAt !== "string" ||
      Number.isNaN(Date.parse(i.createdAt)) ||
      !["gps", "text"].includes(i.locationMode) ||
      typeof i.locationText !== "string" ||
      i.locationText.trim().length < 2 ||
      typeof i.contactName !== "string" ||
      typeof i.vulnerableNotes !== "string" ||
      !/^0\d{8,9}$/.test(phone) ||
      !needs.includes(need)
    )
      return out({ error: "Invalid intake payload" }, 400);
    const u = Deno.env.get("SUPABASE_URL");
    const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!u || !k) return out({ error: "Service unavailable" }, 503);
    const s = createClient(u, k, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const t = b64(crypto.getRandomValues(new Uint8Array(24)));
    const now = new Date(i.createdAt).toISOString();
    const p = {
      requestId: crypto.randomUUID(),
      clientRequestId: i.clientRequestId,
      caseCode: `PTL-${new Date().getUTCFullYear()}-${b64(crypto.getRandomValues(new Uint8Array(4))).toUpperCase()}`,
      trackingToken: t,
      trackingTokenHash: await hash(t),
      source: "WEB",
      receivedAt: now,
      auditAt: now,
      addressText: i.locationText.trim(),
      needTypes: [need],
      description: String(i.vulnerableNotes).trim(),
      peopleTotal: i.peopleTotal == null ? "" : String(i.peopleTotal),
      peopleTotalApproximate: i.peopleTotalApproximate ?? true,
      vulnerableUnknown: i.vulnerableUnknown ?? false,
      vulnerableNotes: String(i.vulnerableNotes).trim(),
      contactName: i.contactName.trim(),
      phone,
      phoneNormalizedHash: await hash(phone),
      reporterRelation: i.reporterRelation ?? "SELF",
      latitude: i.latitude ?? null,
      longitude: i.longitude ?? null,
      gpsAccuracyM: i.gpsAccuracyM ?? null,
      childrenCount: i.childrenCount ?? null,
      elderlyCount: i.elderlyCount ?? null,
      disabledCount: i.disabledCount ?? null,
      bedriddenCount: i.bedriddenCount ?? null,
      urgentMedicalCount: i.urgentMedicalCount ?? null,
      networkState: "ONLINE_OR_RECONNECTED",
    };
    const { data, error } = await s.rpc("submit_public_intake_atomic", {
      p_payload: p,
    });
    if (error || !data || typeof data !== "object")
      return out({ error: "Intake unavailable" }, 503);
    return out(data);
  } catch {
    return out({ error: "Invalid request" }, 400);
  }
});
