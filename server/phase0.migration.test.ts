import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260820000000_phase0_foundation.sql"
  ),
  "utf8"
);

const securityHardening = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260820000001_phase0_security_hardening.sql"
  ),
  "utf8"
);

const publicHardening = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260820000002_phase0_security_hardening_public.sql"
  ),
  "utf8"
);

describe("Phase 0 migration invariants", () => {
  it("keeps Request, Incident, and Mission as separate entities", () => {
    expect(migration).toContain("create table public.requests");
    expect(migration).toContain("create table public.incidents");
    expect(migration).toContain("create table public.missions");
    expect(migration).toContain("create table public.incident_requests");
  });

  it("enforces idempotency and audit fields at the database boundary", () => {
    expect(migration).toContain("client_request_id uuid not null unique");
    expect(migration).toContain("create table public.audit_logs");
    expect(migration).toContain("actor_user_id uuid");
    expect(migration).toContain("action text not null");
    expect(migration).toContain("entity_type text not null");
    expect(migration).toContain("reason text");
    expect(migration).toContain("metadata jsonb not null");
  });

  it("enables RLS and keeps public direct access closed", () => {
    expect(migration).toContain(
      "alter table public.requests enable row level security"
    );
    expect(migration).toContain(
      "alter table public.audit_logs enable row level security"
    );
    expect(migration).toContain(
      "revoke all on all tables in schema public from anon"
    );
    expect(migration).toContain(
      "revoke all on all tables in schema public from authenticated"
    );
    expect(securityHardening).toContain("revoke execute");
    expect(publicHardening).toContain("from public");
  });
});
