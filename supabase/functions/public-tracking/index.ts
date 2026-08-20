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
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
    )
  )
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");

function pub(s: string) {
  switch (s) {
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

Deno.serve(async r => {
  if (r.method === "OPTIONS") return new Response("ok", { headers: C });
  if (r.method !== "POST") return out({ error: "Method not allowed" }, 405);
  try {
    const i = await r.json();
    if (
      typeof i.caseCode !== "string" ||
      typeof i.trackingToken !== "string" ||
      !i.caseCode.trim() ||
      !i.trackingToken
    )
      return out({ error: "Invalid tracking payload" }, 400);
    const u = Deno.env.get("SUPABASE_URL");
    const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!u || !k) return out({ error: "Service unavailable" }, 503);
    const s = createClient(u, k, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const h = await hash(i.trackingToken);
    const { data: req, error: e } = await s
      .from("requests")
      .select("id,case_code,verification_status,received_at")
      .eq("case_code", i.caseCode.trim().toUpperCase())
      .eq("tracking_token_hash", h)
      .maybeSingle();
    if (e) return out({ error: "Tracking unavailable" }, 503);
    if (!req) return out({ error: "Case ID or token is invalid" }, 404);
    let status = pub(req.verification_status);
    const { data: links } = await s
      .from("incident_requests")
      .select("incident_id")
      .eq("request_id", req.id)
      .limit(1);
    if (links?.[0]?.incident_id) {
      const { data: ms } = await s
        .from("missions")
        .select("status")
        .eq("incident_id", links[0].incident_id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (ms?.[0]?.status) status = pub(ms[0].status);
      else {
        const { data: inc } = await s
          .from("incidents")
          .select("status")
          .eq("id", links[0].incident_id)
          .maybeSingle();
        if (inc?.status) status = pub(inc.status);
      }
    }
    const { data: ats, error: ae } = await s
      .from("attachments")
      .select("id,filename,mime_type,byte_size,uploaded_at,status")
      .eq("request_id", req.id)
      .eq("status", "READY")
      .order("uploaded_at", { ascending: false });
    if (ae) return out({ error: "Tracking unavailable" }, 503);
    return out({
      caseCode: req.case_code,
      status,
      receivedAt: req.received_at,
      attachments: (ats ?? []).map(a => ({
        attachmentId: a.id,
        fileName: a.filename,
        mimeType: a.mime_type,
        byteSize: a.byte_size,
        uploadedAt: a.uploaded_at,
        downloadUrl: `/tracking?attachment=${a.id}`,
      })),
    });
  } catch {
    return out({ error: "Invalid request" }, 400);
  }
});
