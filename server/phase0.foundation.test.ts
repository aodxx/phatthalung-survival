import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INCIDENT_STATUSES,
  MISSION_STATUSES,
  STAFF_ROLES,
} from "../shared/emergency";
import { isSupabaseConfigured } from "./supabase";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Phase 0 foundation", () => {
  it("defines the locked staff role vocabulary", () => {
    expect(STAFF_ROLES).toEqual([
      "ADMIN",
      "COMMANDER",
      "INTAKE",
      "TRIAGE",
      "OPERATIONS",
      "FIELD",
      "LOGISTICS",
      "INFORMATION",
      "VIEWER",
    ]);
  });

  it("keeps Request, Incident, and Mission lifecycles separate", () => {
    expect(INCIDENT_STATUSES).toContain("NEEDS_REVIEW");
    expect(INCIDENT_STATUSES).toContain("CLOSED");
    expect(MISSION_STATUSES).toEqual([
      "ASSIGNED",
      "ACCEPTED",
      "EN_ROUTE",
      "ON_SCENE",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ]);
  });

  it("ships an installable PWA shell", () => {
    const manifest = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "client/public/manifest.webmanifest"),
        "utf8"
      )
    ) as Record<string, unknown>;
    const serviceWorker = readFileSync(
      resolve(process.cwd(), "client/public/sw.js"),
      "utf8"
    );

    expect(manifest.name).toBe("แอปพัทลุงต้องรอด");
    expect(manifest.display).toBe("standalone");
    expect(serviceWorker).toContain("caches.open");
    expect(serviceWorker).toContain("caches.match");
  });

  it("exposes explicit public intake and tracking contracts for Phase 1", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(caller.intake.status()).resolves.toMatchObject({
      implemented: false,
      publicIntakeRequiresLogin: false,
    });
    await expect(caller.tracking.status()).resolves.toMatchObject({
      implemented: false,
      publicFieldsOnly: true,
    });
  });

  it("fails closed until Supabase secrets are configured", () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(isSupabaseConfigured()).toBe(false);

    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});
