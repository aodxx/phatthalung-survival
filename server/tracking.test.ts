import { describe, expect, it } from "vitest";
import { lookupPublicTracking } from "./tracking";

function chainFor(
  data: unknown,
  options: { order?: boolean; maybeSingle?: boolean } = {}
) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve),
  };
  if (options.order) chain.order = () => chain;
  if (options.maybeSingle)
    chain.maybeSingle = async () => ({ data, error: null });
  return chain;
}

function trackingSupabase(
  requestData: unknown,
  attachmentData: unknown[] = [],
  lifecycle: {
    links?: unknown[];
    missions?: unknown[];
    incident?: unknown;
  } = {}
) {
  const chains = {
    requests: chainFor(requestData, { maybeSingle: true }),
    incident_requests: chainFor(lifecycle.links ?? []),
    missions: chainFor(lifecycle.missions ?? [], { order: true }),
    incidents: chainFor(lifecycle.incident ?? null, { maybeSingle: true }),
    attachments: chainFor(attachmentData, { order: true }),
  };
  return {
    from: (table: string) => chains[table as keyof typeof chains],
  } as never;
}

describe("public tracking", () => {
  it("maps internal verification status to public operational status and excludes PII", async () => {
    const result = await lookupPublicTracking(
      { caseCode: "PTL-2026-TEST", trackingToken: "correct-token" },
      trackingSupabase(
        {
          id: "request-1",
          case_code: "PTL-2026-TEST",
          verification_status: "CONFIRMED",
          received_at: "2026-08-20T00:00:00.000Z",
          reporter_name: "must-not-leak",
          phone_primary: "0812345678",
        },
        [
          {
            id: "attachment-1",
            filename: "photo.jpg",
            mime_type: "image/jpeg",
            byte_size: 4,
            uploaded_at: "2026-08-20T00:01:00.000Z",
            status: "READY",
            storage_path: "must-not-leak",
          },
        ]
      )
    );
    expect(result).toEqual({
      caseCode: "PTL-2026-TEST",
      status: "ASSIGNED",
      receivedAt: "2026-08-20T00:00:00.000Z",
      attachments: [
        {
          attachmentId: "attachment-1",
          fileName: "photo.jpg",
          mimeType: "image/jpeg",
          byteSize: 4,
          uploadedAt: "2026-08-20T00:01:00.000Z",
          downloadUrl: "/api/public/attachments/attachment-1",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("maps mission lifecycle to public operational status", async () => {
    const statuses = [
      ["EN_ROUTE", "EN_ROUTE"],
      ["ON_SCENE", "ON_SCENE"],
      ["COMPLETED", "RESOLVED"],
    ] as const;
    for (const [missionStatus, expected] of statuses) {
      const result = await lookupPublicTracking(
        { caseCode: "PTL-2026-TEST", trackingToken: "correct-token" },
        trackingSupabase(
          {
            id: "request-1",
            case_code: "PTL-2026-TEST",
            verification_status: "UNVERIFIED",
            received_at: "2026-08-20T00:00:00.000Z",
          },
          [],
          {
            links: [{ incident_id: "incident-1" }],
            missions: [{ status: missionStatus }],
          }
        )
      );
      expect(result?.status).toBe(expected);
    }
  });

  it("derives REVIEWING from incident lifecycle when no mission exists", async () => {
    const result = await lookupPublicTracking(
      { caseCode: "PTL-2026-TEST", trackingToken: "correct-token" },
      trackingSupabase(
        {
          id: "request-1",
          case_code: "PTL-2026-TEST",
          verification_status: "UNVERIFIED",
          received_at: "2026-08-20T00:00:00.000Z",
        },
        [],
        {
          links: [{ incident_id: "incident-1" }],
          missions: [],
          incident: { status: "NEEDS_REVIEW" },
        }
      )
    );
    expect(result?.status).toBe("REVIEWING");
  });

  it("derives ASSIGNED from mission lifecycle rather than verification fallback", async () => {
    const result = await lookupPublicTracking(
      { caseCode: "PTL-2026-TEST", trackingToken: "correct-token" },
      trackingSupabase(
        {
          id: "request-1",
          case_code: "PTL-2026-TEST",
          verification_status: "UNVERIFIED",
          received_at: "2026-08-20T00:00:00.000Z",
        },
        [],
        {
          links: [{ incident_id: "incident-1" }],
          missions: [{ status: "ASSIGNED" }],
        }
      )
    );
    expect(result?.status).toBe("ASSIGNED");
  });

  it("returns no data for a wrong token", async () => {
    const result = await lookupPublicTracking(
      { caseCode: "PTL-2026-TEST", trackingToken: "wrong-token" },
      trackingSupabase(null)
    );
    expect(result).toBeNull();
  });
});
