import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const C = {
  "Access-Control-Allow-Origin": "https://aodxx.github.io",
  "Access-Control-Allow-Headers":
    "authorization,x-client-info,apikey,content-type,x-case-code,x-tracking-token,x-client-attachment-id,x-file-name",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const out = (x: unknown, s = 200) =>
  new Response(JSON.stringify(x), {
    status: s,
    headers: { ...C, "Content-Type": "application/json" },
  });
const hash = async (b: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", b)))
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

Deno.serve(async r => {
  if (r.method === "OPTIONS") return new Response("ok", { headers: C });
  if (r.method !== "POST") return out({ error: "Method not allowed" }, 405);
  try {
    const code = r.headers.get("x-case-code")?.trim().toUpperCase();
    const token = r.headers.get("x-tracking-token") ?? "";
    const clientId = r.headers.get("x-client-attachment-id") ?? "";
    const name = (r.headers.get("x-file-name") ?? "attachment")
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .slice(0, 120);
    const mime = r.headers.get("content-type") ?? "application/octet-stream";
    if (
      !code ||
      !token ||
      !/^[0-9a-f-]{36}$/i.test(clientId) ||
      !allowed.includes(mime)
    )
      return out({ error: "Invalid attachment metadata" }, 400);
    const body = new Uint8Array(await r.arrayBuffer());
    if (body.byteLength < 1) return out({ error: "Attachment is empty" }, 400);
    if (body.byteLength > 10485760)
      return out({ error: "Attachment is too large" }, 413);
    const u = Deno.env.get("SUPABASE_URL");
    const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!u || !k) return out({ error: "Service unavailable" }, 503);
    const s = createClient(u, k, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const th = await hash(new TextEncoder().encode(token));
    const { data: req, error: re } = await s
      .from("requests")
      .select("id,case_code")
      .eq("case_code", code)
      .eq("tracking_token_hash", th)
      .maybeSingle();
    if (re) return out({ error: "Attachment unavailable" }, 503);
    if (!req) return out({ error: "Case ID or token is invalid" }, 404);
    const { data: old } = await s
      .from("attachments")
      .select("id,request_id,filename,mime_type,byte_size,status")
      .eq("client_attachment_id", clientId)
      .maybeSingle();
    if (old?.status === "READY")
      return out({
        status: "ALREADY_READY",
        attachmentId: old.id,
        requestId: old.request_id,
        fileName: old.filename,
        mimeType: old.mime_type,
        byteSize: old.byte_size,
      });
    const { count } = await s
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("request_id", req.id)
      .in("status", ["PENDING", "UPLOADING", "READY"]);
    if ((count ?? 0) >= 3)
      return out({ error: "Attachment limit exceeded" }, 409);
    const id = old?.id ?? crypto.randomUUID();
    const path = `requests/${req.id}/attachments/${id}-${name}`;
    const checksum = await hash(body);
    const { error: pe } = await s.from("attachments").upsert(
      {
        id,
        request_id: req.id,
        client_attachment_id: clientId,
        storage_path: path,
        filename: name,
        mime_type: mime,
        byte_size: body.byteLength,
        checksum_sha256: checksum,
        status: "UPLOADING",
        error_code: null,
      },
      { onConflict: "client_attachment_id" }
    );
    if (pe) return out({ error: "Attachment unavailable" }, 503);
    const { error: se } = await s.storage
      .from("attachments")
      .upload(path, body, { contentType: mime, upsert: true });
    if (se) {
      await s
        .from("attachments")
        .update({ status: "FAILED", error_code: "UPLOAD_FAILED" })
        .eq("id", id);
      return out({ error: "Attachment upload failed" }, 503);
    }
    const { error: ue } = await s
      .from("attachments")
      .update({
        status: "READY",
        uploaded_at: new Date().toISOString(),
        error_code: null,
      })
      .eq("id", id);
    if (ue) return out({ error: "Attachment unavailable" }, 503);
    await s.from("audit_logs").insert({
      actor_user_id: null,
      action: "ATTACHMENT_UPLOAD",
      entity_type: "ATTACHMENT",
      entity_id: id,
      metadata: {
        requestId: req.id,
        caseCode: code,
        clientAttachmentId: clientId,
        mimeType: mime,
        byteSize: body.byteLength,
      },
    });
    return out({
      status: "READY",
      attachmentId: id,
      requestId: req.id,
      fileName: name,
      mimeType: mime,
      byteSize: body.byteLength,
    });
  } catch {
    return out({ error: "Invalid request" }, 400);
  }
});
