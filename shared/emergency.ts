export const STAFF_ROLES = [
  "ADMIN",
  "COMMANDER",
  "INTAKE",
  "TRIAGE",
  "OPERATIONS",
  "FIELD",
  "LOGISTICS",
  "INFORMATION",
  "VIEWER",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const REQUEST_SOURCES = [
  "WEB",
  "ADMIN_PHONE",
  "ADMIN_RADIO",
  "WALK_IN",
  "FIELD_TEAM",
  "LINE",
  "FACEBOOK",
  "OTHER",
] as const;

export const VERIFICATION_STATUSES = [
  "UNVERIFIED",
  "CONTACTED",
  "CONFIRMED",
  "DUPLICATE",
  "UNREACHABLE",
  "FALSE_REPORT",
  "NEEDS_RECHECK",
] as const;

export const PRIORITY_LEVELS = ["P1", "P2", "P3", "P4"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const INCIDENT_STATUSES = [
  "NEW",
  "NEEDS_REVIEW",
  "VERIFIED",
  "ASSIGNED",
  "EN_ROUTE",
  "ON_SCENE",
  "RESOLVED",
  "CLOSED",
  "DUPLICATE",
  "UNREACHABLE",
  "CANCELLED",
  "NEEDS_RECHECK",
] as const;

export const MISSION_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE",
  "ON_SCENE",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  STATUS_TRANSITION: "STATUS_TRANSITION",
  PRIORITY_OVERRIDE: "PRIORITY_OVERRIDE",
  LINK_DUPLICATE: "LINK_DUPLICATE",
  ASSIGN_MISSION: "ASSIGN_MISSION",
  ACCESS_PII: "ACCESS_PII",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const PUBLIC_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "รับเรื่องแล้ว",
  REVIEWING: "กำลังตรวจสอบ",
  ASSIGNED: "มอบหมายทีมแล้ว",
  EN_ROUTE: "ทีมกำลังเดินทาง",
  ON_SCENE: "ทีมถึงพื้นที่",
  RESOLVED: "ช่วยเหลือแล้ว",
};
