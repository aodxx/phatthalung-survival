import { createHash } from "node:crypto";

export function normalizeThaiPhone(value: string): string {
  return value.trim().replace(/[\s-]/g, "");
}

export function isValidThaiPhone(value: string): boolean {
  return /^0\d{8,9}$/.test(value);
}

export function normalizeAndValidateThaiPhone(value: string): string {
  const normalized = normalizeThaiPhone(value);
  if (!isValidThaiPhone(normalized)) {
    throw new Error("phone is invalid");
  }
  return normalized;
}

export function hashNormalizedPhone(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
