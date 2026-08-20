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

Deno.serve(async r => {
  if (r.method === "OPTIONS") return new Response("ok", { headers: C });
  if (r.method !== "POST") return out({ error: "Method not allowed" }, 405);
  try {
    const i = await r.json();
    if (
      typeof i.caseCode !== "string" ||
      typeof i.trackingToken !== "string" ||
      typeof i.attachmentId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(i.attachmentId)
    )
      return out({ error: "Invalid attachment request" }, 400);
    const u = Deno.env.get("SUPABASE_URL");
    const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!u || !k) return out({ error: "Service unavailable" }, 503);
    const s = createClient(u, k, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const h = await hash(i.trackingToken);
    const { data: req } = await s
      .from("requests")
      .select("id")
      .eq("case_code", i.caseCode.trim().toUpperCase())
      .eq("tracking_token_hash", h)
      .maybeSingle();
    if (!req) return out({ error: "Case ID or token is invalid" }, 404);
    const { data: a, error: ae } = await s
      .from("attachments")
      .select("storage_path,status")
      .eq("id", i.attachmentId)
      .eq("request_id", req.id)
      .maybeSingle();
    if (ae) return out({ error: "Attachment unavailable" }, 503);
    if (!a || a.status !== "READY")
      return out({ error: "Attachment not available" }, 404);
    const { data: signed, error: se } = await s.storage
      .from("attachments")
      .createSignedUrl(a.storage_path, 300);
    if (se || !signed?.signedUrl)
      return out({ error: "Attachment unavailable" }, 503);
    return out({ signedUrl: signed.signedUrl });
  } catch {
    return out({ error: "Invalid request" }, 400);
  }
});
