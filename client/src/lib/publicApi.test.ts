import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("./supabase", () => ({
  getSupabaseBrowserClient: () => ({ functions: { invoke } }),
}));

describe("public attachment production adapter", () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.stubEnv("VITE_RUNTIME_BACKEND", "supabase");
    invoke.mockResolvedValue({
      data: {
        status: "READY",
        attachmentId: "att-test",
        fileName: "test.pdf",
        mimeType: "application/pdf",
        byteSize: 4,
      },
      error: null,
    });
  });

  it("invokes the Supabase Edge Function with binary body and attachment headers", async () => {
    const { uploadPublicAttachmentProduction } = await import("./publicApi");
    const file = new Blob(["TEST"], { type: "application/pdf" });

    const result = await uploadPublicAttachmentProduction({
      caseCode: "PTL-TEST",
      trackingToken: "token-test",
      clientAttachmentId: "client-att-test",
      fileName: "test.pdf",
      mimeType: "application/pdf",
      file,
    });

    expect(result.status).toBe("READY");
    expect(invoke).toHaveBeenCalledWith("public-attachment-upload", {
      body: file,
      headers: {
        "content-type": "application/pdf",
        "x-case-code": "PTL-TEST",
        "x-tracking-token": "token-test",
        "x-client-attachment-id": "client-att-test",
        "x-file-name": "test.pdf",
      },
    });
  });
});
