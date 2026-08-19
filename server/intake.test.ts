import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  return appRouter.createCaller({
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

const validInput = {
  clientRequestId: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-08-20T00:00:00.000Z",
  locationMode: "text" as const,
  locationText: "ตลาดเมืองพัทลุง",
  incidentType: "น้ำท่วม/น้ำป่า",
  peopleTotal: 2,
  vulnerableNotes: "",
  contactName: "ผู้แจ้ง",
  phone: "0812345678",
};

describe("controlled public intake", () => {
  it("rejects invalid phone input before any server side operation", async () => {
    await expect(
      caller().intake.submit({ ...validInput, phone: "123" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("fails closed for a valid public payload when service credentials are absent", async () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(caller().intake.submit(validInput)).rejects.toThrow(
      "Supabase is not configured"
    );

    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});
