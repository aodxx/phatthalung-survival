export const ATTACHMENT_POLICY = {
  maxFiles: 3,
  maxBytesPerFile: 10 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ] as const,
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"] as const,
} as const;

export type AttachmentMimeType =
  (typeof ATTACHMENT_POLICY.allowedMimeTypes)[number];

export function isAllowedAttachmentMimeType(
  value: string
): value is AttachmentMimeType {
  return (ATTACHMENT_POLICY.allowedMimeTypes as readonly string[]).includes(
    value
  );
}

export function validateAttachmentMetadata(input: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const normalizedName = input.name.trim();
  if (!normalizedName) return "กรุณาเลือกไฟล์ที่มีชื่อ";
  if (normalizedName.length > 160) return "ชื่อไฟล์ยาวเกินไป";
  if (!isAllowedAttachmentMimeType(input.type))
    return "รองรับเฉพาะ JPG, PNG, WebP และ PDF";
  if (input.size <= 0 || input.size > ATTACHMENT_POLICY.maxBytesPerFile) {
    return "ไฟล์ต้องมีขนาดไม่เกิน 10 MB";
  }
  return null;
}

export function sanitizeAttachmentFileName(name: string): string {
  const base = name.normalize("NFKC").replace(/[^A-Za-z0-9._-]+/g, "-");
  return (
    base
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+/, "file-")
      .slice(0, 160) || "file"
  );
}
