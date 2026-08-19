import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./_core/index";
import type { Server } from "node:http";

let server: Server;
let baseUrl = "";

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>(resolve => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test server did not bind");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  );
});

const baseHeaders = {
  "content-type": "application/pdf",
  "x-case-code": "PTL-2026-TEST",
  "x-tracking-token": "token-for-test-only",
  "x-client-attachment-id": "11111111-1111-4111-8111-111111111111",
  "x-file-name": "evidence.pdf",
};

describe("GET /api/public/attachments/:attachmentId", () => {
  it("returns sanitized 400 JSON when access credentials are missing", async () => {
    const response = await fetch(
      `${baseUrl}/api/public/attachments/11111111-1111-4111-8111-111111111111`
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Missing attachment access credentials",
    });
  });

  it("returns a signed URL only after Case ID and token authorization", async () => {
    const requestChain = {
      select: () => requestChain,
      eq: () => requestChain,
      maybeSingle: async () => ({ data: { id: "request-1" }, error: null }),
    };
    const attachmentChain = {
      select: () => attachmentChain,
      eq: () => attachmentChain,
      maybeSingle: async () => ({
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          filename: "evidence.pdf",
          mime_type: "application/pdf",
          byte_size: 4,
          uploaded_at: "2026-08-20T00:00:00.000Z",
          status: "READY",
          storage_path: "private/request-1/evidence.pdf",
        },
        error: null,
      }),
    };
    const injectedServer = createApp({
      supabase: {
        from: (table: string) =>
          table === "requests" ? requestChain : attachmentChain,
      } as never,
      storageGetSignedUrl: async () => "https://signed.example/evidence.pdf",
    }).listen(0);
    await new Promise<void>(resolve =>
      injectedServer.once("listening", () => resolve())
    );
    const address = injectedServer.address();
    if (!address || typeof address === "string")
      throw new Error("No test port");
    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/public/attachments/11111111-1111-4111-8111-111111111111`,
        {
          headers: {
            "x-case-code": "PTL-2026-TEST",
            "x-tracking-token": "token-for-test-only",
          },
        }
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        url: "https://signed.example/evidence.pdf",
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        injectedServer.close(error => (error ? reject(error) : resolve()))
      );
    }
  });

  it("denies a mismatched Case ID or token over HTTP", async () => {
    const requestChain = {
      select: () => requestChain,
      eq: () => requestChain,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    const injectedServer = createApp({
      supabase: { from: () => requestChain } as never,
    }).listen(0);
    await new Promise<void>(resolve =>
      injectedServer.once("listening", () => resolve())
    );
    const address = injectedServer.address();
    if (!address || typeof address === "string")
      throw new Error("No test port");
    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/public/attachments/11111111-1111-4111-8111-111111111111`,
        {
          headers: {
            "x-case-code": "PTL-2026-TEST",
            "x-tracking-token": "wrong-token-for-test",
          },
        }
      );
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "Request authorization failed",
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        injectedServer.close(error => (error ? reject(error) : resolve()))
      );
    }
  });
});

describe("POST /api/public/attachments", () => {
  it("returns sanitized 400 JSON for missing required headers", async () => {
    const response = await fetch(`${baseUrl}/api/public/attachments`, {
      method: "POST",
      headers: { "content-type": "application/pdf" },
      body: "test",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing x-case-code" });
  });

  it.each([
    [
      "invalid client ID",
      { ...baseHeaders, "x-client-attachment-id": "bad" },
      400,
    ],
    [
      "unsupported MIME",
      { ...baseHeaders, "content-type": "application/javascript" },
      400,
    ],
  ])("returns 4xx for %s", async (_label, headers, expectedStatus) => {
    const response = await fetch(`${baseUrl}/api/public/attachments`, {
      method: "POST",
      headers,
      body: "test",
    });
    expect(response.status).toBe(expectedStatus);
    expect(await response.json()).toHaveProperty("error");
  });

  it("returns a generic 503 JSON response for valid metadata when service is unavailable", async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = await fetch(`${baseUrl}/api/public/attachments`, {
      method: "POST",
      headers: baseHeaders,
      body: "test",
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Attachment upload unavailable",
    });
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});
