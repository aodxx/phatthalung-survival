import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_POLICY,
  sanitizeAttachmentFileName,
  validateAttachmentMetadata,
} from "./attachments";

describe("attachment policy", () => {
  it("allows supported images and PDF within the size limit", () => {
    expect(
      validateAttachmentMetadata({
        name: "ภาพ.png",
        type: "image/png",
        size: 1024,
      })
    ).toBeNull();
    expect(
      validateAttachmentMetadata({
        name: "report.pdf",
        type: "application/pdf",
        size: ATTACHMENT_POLICY.maxBytesPerFile,
      })
    ).toBeNull();
  });

  it("rejects unsupported MIME types and oversized files", () => {
    expect(
      validateAttachmentMetadata({
        name: "script.js",
        type: "application/javascript",
        size: 10,
      })
    ).toContain("รองรับ");
    expect(
      validateAttachmentMetadata({
        name: "large.pdf",
        type: "application/pdf",
        size: ATTACHMENT_POLICY.maxBytesPerFile + 1,
      })
    ).toContain("10 MB");
  });

  it("sanitizes path separators and traversal-like names", () => {
    const sanitized = sanitizeAttachmentFileName("../../private/report.pdf");
    expect(sanitized).not.toContain("..");
    expect(sanitized).not.toContain("/");
    expect(sanitizeAttachmentFileName("...")).toBe("file-");
  });
});
