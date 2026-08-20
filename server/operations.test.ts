import { describe, expect, it } from "vitest";
import {
  assertAllowedTransition,
  assertZoneAccess,
  decideDuplicateCandidate,
  listOperationsQueue,
  sortQueueRows,
  transitionMission,
  type OperationsQueueRow,
} from "./operations";
import type { StaffPrincipal } from "./staffAuth";

const triage: StaffPrincipal = {
  userId: "00000000-0000-4000-8000-000000000001",
  role: "TRIAGE",
  zoneId: "zone-a",
  active: true,
};

const rows: OperationsQueueRow[] = [
  {
    id: "3",
    caseCode: "PS-003",
    source: "WEB",
    sourceReference: null,
    verificationStatus: "UNVERIFIED",
    priority: "P3",
    receivedAt: "2026-08-20T02:00:00.000Z",
    createdAt: "2026-08-20T02:00:00.000Z",
    zoneId: "zone-a",
    assignedIncidentId: null,
  },
  {
    id: "1",
    caseCode: "PS-001",
    source: "WEB",
    sourceReference: null,
    verificationStatus: "UNVERIFIED",
    priority: "P1",
    receivedAt: "2026-08-20T03:00:00.000Z",
    createdAt: "2026-08-20T03:00:00.000Z",
    zoneId: "zone-a",
    assignedIncidentId: null,
  },
  {
    id: "2",
    caseCode: "PS-002",
    source: "WEB",
    sourceReference: null,
    verificationStatus: "UNVERIFIED",
    priority: "P1",
    receivedAt: "2026-08-20T01:00:00.000Z",
    createdAt: "2026-08-20T04:00:00.000Z",
    zoneId: "zone-a",
    assignedIncidentId: null,
  },
];

describe("Phase 2 operations contracts", () => {
  it("sorts P1 first, then oldest waiting time, then created time", () => {
    expect(sortQueueRows(rows).map(row => row.id)).toEqual(["2", "1", "3"]);
  });

  it("allows same-zone staff and administrators to access a zone", () => {
    expect(() => assertZoneAccess(triage, "zone-a")).not.toThrow();
    expect(() =>
      assertZoneAccess({ ...triage, role: "ADMIN" }, "zone-b")
    ).not.toThrow();
  });

  it("denies other-zone staff and staff without a zone", () => {
    expect(() => assertZoneAccess(triage, "zone-b")).toThrow("not authorized");
    expect(() =>
      assertZoneAccess({ ...triage, zoneId: null }, "zone-a")
    ).toThrow("not authorized");
  });

  it("accepts only the documented request triage transitions", () => {
    expect(() =>
      assertAllowedTransition("request", "UNVERIFIED", "CONTACTED", "TRIAGE")
    ).not.toThrow();
    expect(() =>
      assertAllowedTransition("request", "UNVERIFIED", "CONFIRMED", "TRIAGE")
    ).toThrow("Invalid request transition");
  });

  it("requires triage role for request and incident transitions", () => {
    expect(() =>
      assertAllowedTransition("request", "UNVERIFIED", "CONTACTED", "FIELD")
    ).toThrow("cannot transition");
    expect(() =>
      assertAllowedTransition("incident", "NEW", "NEEDS_REVIEW", "OPERATIONS")
    ).toThrow("cannot transition");
  });

  it("requires a result before completing a mission", () => {
    expect(() =>
      assertAllowedTransition("mission", "ON_SCENE", "COMPLETED", "FIELD")
    ).toThrow("Completion result");
    expect(() =>
      assertAllowedTransition(
        "mission",
        "ON_SCENE",
        "COMPLETED",
        "FIELD",
        "ช่วยเหลือสำเร็จ"
      )
    ).not.toThrow();
  });

  it("fails closed when operations database is unavailable", async () => {
    await expect(
      listOperationsQueue(triage, { limit: 25, offset: 0 }, null as never)
    ).rejects.toThrow("database is unavailable");
  });

  it("rejects duplicate-candidate decisions without a valid TRIAGE role or reason", async () => {
    await expect(
      decideDuplicateCandidate(
        { candidateId: "not-a-uuid", decision: "CONFIRMED", reason: "" },
        { ...triage, role: "VIEWER" },
        null
      )
    ).rejects.toThrow("candidateId is invalid");
    await expect(
      decideDuplicateCandidate(
        {
          candidateId: "00000000-0000-4000-8000-000000000002",
          decision: "CONFIRMED",
          reason: "",
        },
        triage,
        null
      )
    ).rejects.toThrow("Decision reason is required");
  });

  it("fails closed before RPC when mission id or reason is invalid", async () => {
    await expect(
      transitionMission(
        {
          missionId: "not-a-uuid",
          previousStatus: "ON_SCENE",
          nextStatus: "COMPLETED",
          reason: "",
          result: "",
        },
        { ...triage, role: "FIELD" },
        null
      )
    ).rejects.toThrow("missionId is invalid");
  });
});
