import { describe, expect, it } from "vitest";
import {
  AttachmentClientError,
  attachmentHttpError,
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
