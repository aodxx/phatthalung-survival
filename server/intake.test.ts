import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { submitPublicIntake } from "./intake";
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
  needType: "FLOOD_TRAPPED" as const,
  peopleTotal: 2,
  vulnerableNotes: "",
  contactName: "ผู้แจ้ง",
  phone: "081-234-5678",
  reporterRelation: "SELF" as const,
};

function rpcSupabase(
  response: unknown,
  error: { message: string } | null = null
) {
  return {
    rpc: vi.fn(async () => ({ data: response, error })),
  } as never;
}

describe("controlled public intake", () => {
  it("rejects invalid phone input before any server side operation", async () => {
    await expect(
      caller().intake.submit({ ...validInput, phone: "123" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("uses the atomic RPC and returns the full server acknowledgement", async () => {
    const supabase = rpcSupabase({
      status: "RECEIVED",
      caseCode: "PTL-2026-ABCD1234",
      trackingToken: "secure-token-from-server",
      receivedAt: "2026-08-20T00:00:00.000Z",
    });
    const result = await submitPublicIntake(validInput, supabase);
    expect(result).toMatchObject({
      status: "RECEIVED",
      caseCode: "PTL-2026-ABCD1234",
      trackingToken: "secure-token-from-server",
      receivedAt: "2026-08-20T00:00:00.000Z",
    });
    expect(
      (supabase as { rpc: ReturnType<typeof vi.fn> }).rpc
    ).toHaveBeenCalledWith(
      "submit_public_intake_atomic",
      expect.objectContaining({
        p_payload: expect.objectContaining({
          clientRequestId: validInput.clientRequestId,
          needTypes: ["FLOOD_TRAPPED"],
          phone: "0812345678",
          phoneNormalizedHash: expect.any(String),
        }),
      })
    );
  });

  it("returns ALREADY_RECEIVED without inventing a new credential", async () => {
    const result = await submitPublicIntake(
      validInput,
      rpcSupabase({
        status: "ALREADY_RECEIVED",
        caseCode: "PTL-2026-ABCD1234",
        receivedAt: "2026-08-20T00:00:00.000Z",
      })
    );
    expect(result).toEqual({
      status: "ALREADY_RECEIVED",
      caseCode: "PTL-2026-ABCD1234",
      receivedAt: "2026-08-20T00:00:00.000Z",
    });
    expect(result).not.toHaveProperty("trackingToken");
  });

  it("maps concurrent callers to the database RPC boundary", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        status: "ALREADY_RECEIVED",
        caseCode: "PTL-2026-RACE0001",
        receivedAt: "2026-08-20T00:00:00.000Z",
      },
      error: null,
    }));
    const supabase = { rpc } as never;
    const results = await Promise.all([
      submitPublicIntake(validInput, supabase),
      submitPublicIntake(validInput, supabase),
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].caseCode).toBe(results[1].caseCode);
    expect(rpc).toHaveBeenCalledTimes(2);
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
