import { describe, expect, it } from "vitest";

const sensitiveTables = [
  ["requests", "id"],
  ["request_contacts", "request_id"],
  ["request_people_summary", "request_id"],
  ["incidents", "id"],
  ["incident_requests", "incident_id"],
  ["incident_status_history", "id"],
  ["duplicate_candidates", "id"],
  ["teams", "id"],
  ["missions", "id"],
  ["mission_status_history", "id"],
  ["audit_logs", "id"],
  ["attachments", "id"],
  ["roles", "code"],
  ["user_profiles", "id"],
] as const;

describe("Supabase anonymous RLS boundary", () => {
  it("does not expose operational, PII, audit, or staff-role data", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    expect(url).toBeTruthy();
    expect(key).toBeTruthy();

    const headers = {
      apikey: key as string,
      Authorization: `Bearer ${key}`,
    };
    const results = await Promise.all(
      sensitiveTables.map(async ([table, column]) => {
        const response = await fetch(
          `${url}/rest/v1/${table}?select=${column}&limit=1`,
          {
            headers,
          }
        );
        return { table, response };
      })
    );

    for (const { table, response } of results) {
      expect([200, 401, 403], `${table} returned unexpected status`).toContain(
        response.status
      );
      if (response.status === 200) {
        expect(
          await response.json(),
          `${table} returned rows to anonymous client`
        ).toEqual([]);
      }
    }
  }, 20_000);
});
