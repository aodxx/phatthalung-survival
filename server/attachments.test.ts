import { describe, expect, it } from "vitest";
import {
  AttachmentClientError,
  attachmentHttpError,
  getPublicAttachmentDownload,
  listPublicAttachments,
  uploadPublicAttachment,
} from "./attachments";
import type { Request } from "express";

describe("attachment upload boundary", () => {
  it.each([
    ["missing header", 400],
    ["invalid client ID", 400],
    ["unsupported MIME", 400],
    ["oversized file", 413],
    ["authorization failure", 404],
    ["attachment count limit", 409],
  ])("maps %s to a public 4xx response", (_label, status) => {
    expect(
      attachmentHttpError(
        new AttachmentClientError(
          "client error",
          status as 400 | 404 | 409 | 413
        )
      )
    ).toMatchObject({ status });
  });

  it("maps unexpected storage/database failures to a generic 503", () => {
    expect(attachmentHttpError(new Error("private database detail"))).toEqual({
      status: 503,
      message: "Attachment upload unavailable",
    });
  });
  it("returns the existing READY attachment without a second storage upload", async () => {
    let storageCalls = 0;
    let auditCalls = 0;
    const requestChain = {
      select: () => requestChain,
      eq: () => requestChain,
      maybeSingle: async () => ({
        data: { id: "request-1", case_code: "PTL-2026-TEST" },
        error: null,
      }),
    };
    const attachmentChain = {
      select: () => attachmentChain,
      eq: () => attachmentChain,
      maybeSingle: async () => ({
        data: {
          id: "attachment-1",
          request_id: "request-1",
          filename: "evidence.pdf",
          mime_type: "application/pdf",
          byte_size: 4,
          status: "READY",
          storage_path:
            "requests/request-1/attachments/attachment-1-evidence.pdf",
        },
        error: null,
      }),
    };
    const fakeSupabase = {
      from: (table: string) =>
        table === "requests" ? requestChain : attachmentChain,
    };
    const request = {
      body: Buffer.from("test"),
      header: (name: string) =>
        ({
          "x-case-code": "PTL-2026-TEST",
          "x-tracking-token": "token-for-test-only",
          "x-client-attachment-id": "11111111-1111-4111-8111-111111111111",
          "x-file-name": "evidence.pdf",
          "content-type": "application/pdf",
        })[name.toLowerCase()],
    } as unknown as Request;

    const result = await uploadPublicAttachment(request, {
      supabase: fakeSupabase as never,
      audit: async () => {
        auditCalls += 1;
      },
      storagePut: async () => {
        storageCalls += 1;
        return { key: "never", url: "never" };
      },
    });
    expect(result).toMatchObject({
      status: "ALREADY_READY",
      attachmentId: "attachment-1",
    });
    expect(storageCalls).toBe(0);
    expect(auditCalls).toBe(0);
  });

  it("lists only READY metadata without exposing storage paths", async () => {
    const requestChain = {
      select: () => requestChain,
      eq: () => requestChain,
      maybeSingle: async () => ({ data: { id: "request-1" }, error: null }),
    };
    const attachmentChain = {
      select: () => attachmentChain,
      eq: () => attachmentChain,
      order: () => attachmentChain,
      then: (resolve: (value: unknown) => void) =>
        resolve({
          data: [
            {
              id: "attachment-ready",
              filename: "evidence.pdf",
              mime_type: "application/pdf",
              byte_size: 4,
              uploaded_at: "2026-08-20T00:00:00.000Z",
              status: "READY",
            },
          ],
          error: null,
        }),
    };
    const result = await listPublicAttachments(
      { caseCode: "PTL-2026-TEST", trackingToken: "token-for-test-only" },
      {
        supabase: {
          from: (table: string) =>
            table === "requests" ? requestChain : attachmentChain,
        } as never,
      }
    );
    expect(result).toEqual([
      expect.objectContaining({
        attachmentId: "attachment-ready",
        fileName: "evidence.pdf",
        downloadUrl: "/api/public/attachments/attachment-ready",
      }),
    ]);
    expect(result[0]).not.toHaveProperty("storagePath");
  });

  it("requires authorization before returning a signed attachment URL", async () => {
    let signedUrlCalls = 0;
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
    const result = await getPublicAttachmentDownload(
      {
        caseCode: "PTL-2026-TEST",
        trackingToken: "token-for-test-only",
        attachmentId: "11111111-1111-4111-8111-111111111111",
      },
      {
        supabase: {
          from: (table: string) =>
            table === "requests" ? requestChain : attachmentChain,
        } as never,
        storageGetSignedUrl: async (key: string) => {
          signedUrlCalls += 1;
          expect(key).toBe("private/request-1/evidence.pdf");
          return "https://signed.example/evidence.pdf";
        },
      }
    );
    expect(result.url).toBe("https://signed.example/evidence.pdf");
    expect(signedUrlCalls).toBe(1);
  });

  it("denies attachment download when the Case ID and token do not match", async () => {
    const requestChain = {
      select: () => requestChain,
      eq: () => requestChain,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    await expect(
      getPublicAttachmentDownload(
        {
          caseCode: "PTL-2026-TEST",
          trackingToken: "wrong-token-for-test",
          attachmentId: "11111111-1111-4111-8111-111111111111",
        },
        { supabase: { from: () => requestChain } as never }
      )
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("fails closed when server storage/database credentials are absent", async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const request = {
      body: Buffer.from("not-a-real-upload"),
      header: (name: string) =>
        ({
          "x-case-code": "PTL-2026-TEST",
          "x-tracking-token": "token-that-is-not-used",
          "x-client-attachment-id": "11111111-1111-4111-8111-111111111111",
          "x-file-name": "evidence.pdf",
          "content-type": "application/pdf",
        })[name.toLowerCase()],
    } as unknown as Request;

    await expect(uploadPublicAttachment(request)).rejects.toThrow(
      "Supabase is not configured"
    );

    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalServiceKey === undefined)
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  });
});
