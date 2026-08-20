import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { getSupabaseAdmin } from "./supabase";
import type { StaffPrincipal } from "./staffAuth";
import {
  INCIDENT_STATUSES,
  MISSION_STATUSES,
  PRIORITY_LEVELS,
  type PriorityLevel,
  type StaffRole,
  VERIFICATION_STATUSES,
} from "../shared/emergency";

export type QueueFilters = {
  status?: string[];
  priority?: PriorityLevel;
  zoneId?: string;
  unassigned?: boolean;
  search?: string;
  limit: number;
  offset: number;
};

export type OperationsQueueRow = {
  id: string;
  caseCode: string;
  source: string;
  sourceReference: string | null;
  verificationStatus: string;
  priority: PriorityLevel;
  receivedAt: string;
  createdAt: string;
  zoneId: string | null;
  assignedIncidentId: string | null;
};

export const TRIAGE_ROLES: readonly StaffRole[] = [
  "ADMIN",
  "COMMANDER",
  "TRIAGE",
];
export const OPERATIONS_ROLES: readonly StaffRole[] = [
  "ADMIN",
  "COMMANDER",
  "OPERATIONS",
];
export const FIELD_ROLES: readonly StaffRole[] = [
  "ADMIN",
  "COMMANDER",
  "OPERATIONS",
  "FIELD",
];

const priorityRank: Record<PriorityLevel, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

export function assertUuid(value: string, label: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} is invalid`,
    });
  }
}

export function assertZoneAccess(
  principal: StaffPrincipal,
  zoneId: string | null
): void {
  if (principal.role === "ADMIN" || principal.role === "COMMANDER") return;
  if (!principal.zoneId || principal.zoneId !== zoneId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff zone is not authorized",
    });
  }
}

export function assertAllowedTransition(
  kind: "request" | "incident" | "mission",
  previous: string,
  next: string,
  role: StaffRole,
  result?: string | null
): void {
  const transitions: Record<string, Record<string, string[]>> = {
    request: {
      UNVERIFIED: ["CONTACTED", "DUPLICATE", "UNREACHABLE", "NEEDS_RECHECK"],
      CONTACTED: ["CONFIRMED", "DUPLICATE", "UNREACHABLE", "NEEDS_RECHECK"],
      CONFIRMED: ["NEEDS_RECHECK", "DUPLICATE"],
      NEEDS_RECHECK: ["CONTACTED", "CONFIRMED", "DUPLICATE", "UNREACHABLE"],
      DUPLICATE: [],
      UNREACHABLE: ["NEEDS_RECHECK"],
      FALSE_REPORT: ["NEEDS_RECHECK"],
    },
    incident: {
      NEW: ["NEEDS_REVIEW", "DUPLICATE", "CANCELLED"],
      NEEDS_REVIEW: ["VERIFIED", "DUPLICATE", "UNREACHABLE", "NEEDS_RECHECK"],
      VERIFIED: ["ASSIGNED", "NEEDS_RECHECK", "CANCELLED"],
      ASSIGNED: ["EN_ROUTE", "ON_SCENE", "CANCELLED"],
      EN_ROUTE: ["ON_SCENE", "CANCELLED"],
      ON_SCENE: ["RESOLVED", "CANCELLED"],
      RESOLVED: ["CLOSED", "NEEDS_RECHECK"],
      CLOSED: [],
      DUPLICATE: [],
      UNREACHABLE: ["NEEDS_RECHECK"],
      CANCELLED: ["NEEDS_RECHECK"],
      NEEDS_RECHECK: ["NEEDS_REVIEW", "VERIFIED", "CANCELLED"],
    },
    mission: {
      ASSIGNED: ["ACCEPTED", "CANCELLED"],
      ACCEPTED: ["EN_ROUTE", "CANCELLED"],
      EN_ROUTE: ["ON_SCENE", "FAILED", "CANCELLED"],
      ON_SCENE: ["COMPLETED", "FAILED", "CANCELLED"],
      COMPLETED: [],
      FAILED: ["ASSIGNED"],
      CANCELLED: [],
    },
  };
  const allowed = transitions[kind]?.[previous] ?? [];
  if (!allowed.includes(next)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid ${kind} transition`,
    });
  }
  const permittedRoles =
    kind === "request"
      ? TRIAGE_ROLES
      : kind === "incident"
        ? TRIAGE_ROLES
        : FIELD_ROLES;
  if (!permittedRoles.includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Role ${role} cannot transition ${kind}`,
    });
  }
  if (kind === "mission" && next === "COMPLETED" && !result?.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Completion result is required",
    });
  }
}

function rowPriority(row: {
  priority_hint: PriorityLevel | null;
}): PriorityLevel {
  return row.priority_hint ?? "P4";
}

export function sortQueueRows(
  rows: OperationsQueueRow[]
): OperationsQueueRow[] {
  return [...rows].sort((a, b) => {
    const priority = priorityRank[a.priority] - priorityRank[b.priority];
    if (priority !== 0) return priority;
    const waiting = Date.parse(a.receivedAt) - Date.parse(b.receivedAt);
    if (waiting !== 0) return waiting;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

export async function listOperationsQueue(
  principal: StaffPrincipal,
  filters: QueueFilters,
  client: SupabaseClient = getSupabaseAdmin() as SupabaseClient
): Promise<{
  rows: OperationsQueueRow[];
  hasMore: boolean;
  offset: number;
  limit: number;
}> {
  if (!client)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Operations database is unavailable",
    });
  const boundedLimit = Math.min(Math.max(filters.limit, 1), 100);
  const boundedOffset = Math.max(filters.offset, 0);
  const zone = filters.zoneId ?? principal.zoneId ?? null;
  if (zone) assertZoneAccess(principal, zone);
  if (
    principal.role !== "ADMIN" &&
    principal.role !== "COMMANDER" &&
    !principal.zoneId
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff zone is required",
    });
  }
  const { data, error } = await client.rpc("phase2_operations_queue", {
    p_actor_user_id: principal.userId,
    p_statuses: filters.status ?? null,
    p_priority: filters.priority ?? null,
    p_zone_id: zone,
    p_unassigned: filters.unassigned ?? false,
    p_search: filters.search?.trim() || null,
    p_limit: boundedLimit,
    p_offset: boundedOffset,
  });
  if (error)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unable to load operations queue",
    });
  const raw = (data ?? []) as Array<Record<string, unknown>>;
  return {
    rows: raw.map(row => ({
      id: String(row.id),
      caseCode: String(row.case_code),
      source: String(row.source),
      sourceReference: row.source_reference
        ? String(row.source_reference)
        : null,
      verificationStatus: String(row.verification_status),
      priority: row.priority as PriorityLevel,
      receivedAt: String(row.received_at),
      createdAt: String(row.created_at),
      zoneId: row.zone_id ? String(row.zone_id) : null,
      assignedIncidentId: row.assigned_incident_id
        ? String(row.assigned_incident_id)
        : null,
    })),
    hasMore: raw.length === boundedLimit,
    offset: boundedOffset,
    limit: boundedLimit,
  };
}

async function callPhase2Rpc(
  client: SupabaseClient,
  rpc: string,
  args: Record<string, unknown>
) {
  const { data, error } = await client.rpc(rpc, args);
  if (error)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Phase 2 mutation is unavailable",
    });
  return data;
}

export async function transitionRequest(
  input: { requestId: string; nextStatus: string; reason: string },
  principal: StaffPrincipal,
  client = getSupabaseAdmin()
) {
  assertUuid(input.requestId, "requestId");
  if (!input.reason.trim())
    throw new TRPCError({ code: "BAD_REQUEST", message: "Reason is required" });
  if (!TRIAGE_ROLES.includes(principal.role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Role cannot transition request",
    });
  if (!VERIFICATION_STATUSES.includes(input.nextStatus as never))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid request status",
    });
  if (!client)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Operations database is unavailable",
    });
  return callPhase2Rpc(client, "phase2_transition_request", {
    p_request_id: input.requestId,
    p_next_status: input.nextStatus,
    p_reason: input.reason,
    p_actor_user_id: principal.userId,
  });
}

export async function transitionIncident(
  input: {
    incidentId: string;
    nextStatus: string;
    reason: string;
  },
  principal: StaffPrincipal,
  client = getSupabaseAdmin()
) {
  assertUuid(input.incidentId, "incidentId");
  if (!input.reason.trim())
    throw new TRPCError({ code: "BAD_REQUEST", message: "Reason is required" });
  if (!TRIAGE_ROLES.includes(principal.role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Role cannot transition incident",
    });
  if (!INCIDENT_STATUSES.includes(input.nextStatus as never))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid incident status",
    });
  if (!client)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Operations database is unavailable",
    });
  return callPhase2Rpc(client, "phase2_transition_incident", {
    p_incident_id: input.incidentId,
    p_next_status: input.nextStatus,
    p_reason: input.reason,
    p_actor_user_id: principal.userId,
  });
}

export async function transitionMission(
  input: {
    missionId: string;
    nextStatus: string;
    reason: string;
    result?: string;
  },
  principal: StaffPrincipal,
  client = getSupabaseAdmin()
) {
  assertUuid(input.missionId, "missionId");
  if (!input.reason.trim())
    throw new TRPCError({ code: "BAD_REQUEST", message: "Reason is required" });
  if (!FIELD_ROLES.includes(principal.role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Role cannot transition mission",
    });
  if (input.nextStatus === "COMPLETED" && !input.result?.trim())
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Completion result is required",
    });
  if (!MISSION_STATUSES.includes(input.nextStatus as never))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid mission status",
    });
  if (!client)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Operations database is unavailable",
    });
  return callPhase2Rpc(client, "phase2_transition_mission", {
    p_mission_id: input.missionId,
    p_next_status: input.nextStatus,
    p_reason: input.reason,
    p_result: input.result ?? null,
    p_actor_user_id: principal.userId,
  });
}

export async function overrideIncidentPriority(
  input: { incidentId: string; priority: PriorityLevel; reason: string },
  principal: StaffPrincipal,
  client = getSupabaseAdmin()
) {
  assertUuid(input.incidentId, "incidentId");
  if (!input.reason.trim())
    throw new TRPCError({ code: "BAD_REQUEST", message: "Reason is required" });
  if (!TRIAGE_ROLES.includes(principal.role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Role cannot override priority",
    });
  if (!PRIORITY_LEVELS.includes(input.priority))
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid priority" });
  if (!client)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Operations database is unavailable",
    });
  return callPhase2Rpc(client, "phase2_override_incident_priority", {
    p_incident_id: input.incidentId,
    p_priority: input.priority,
    p_reason: input.reason,
    p_actor_user_id: principal.userId,
  });
}

export async function decideDuplicateCandidate(
  input: {
    candidateId: string;
    decision: "CONFIRMED" | "REJECTED" | "IGNORED";
    reason: string;
  },
  principal: StaffPrincipal,
  client = getSupabaseAdmin()
) {
  assertUuid(input.candidateId, "candidateId");
  if (!input.reason.trim())
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Decision reason is required",
    });
  if (!TRIAGE_ROLES.includes(principal.role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Role cannot decide duplicate candidates",
    });
  if (!client)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Operations database is unavailable",
    });
  return callPhase2Rpc(client, "phase2_decide_duplicate_candidate", {
    p_candidate_id: input.candidateId,
    p_decision: input.decision,
    p_reason: input.reason,
    p_actor_user_id: principal.userId,
  });
}

export async function assignMission(
  input: {
    incidentId: string;
    teamId: string;
    objective: string;
    priority: PriorityLevel;
    reason: string;
  },
  principal: StaffPrincipal,
  client = getSupabaseAdmin()
) {
  assertUuid(input.incidentId, "incidentId");
  assertUuid(input.teamId, "teamId");
  if (!input.objective.trim() || !input.reason.trim())
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Objective and reason are required",
    });
  if (!OPERATIONS_ROLES.includes(principal.role))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Role cannot assign missions",
    });
  if (!PRIORITY_LEVELS.includes(input.priority))
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid priority" });
  if (!client)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Operations database is unavailable",
    });
  return callPhase2Rpc(client, "phase2_assign_mission", {
    p_incident_id: input.incidentId,
    p_team_id: input.teamId,
    p_objective: input.objective,
    p_priority: input.priority,
    p_reason: input.reason,
    p_actor_user_id: principal.userId,
  });
}
