import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type Role = "user" | "admin";

function createContext(role: Role): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: role === "admin" ? 2 : 1,
      openId: `staff-${role}`,
      email: `${role}@example.com`,
      name: role === "admin" ? "Admin" : "Viewer",
      loginMethod: "manus",
      role,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("staff router authorization", () => {
  it("allows an authenticated viewer to read staff status", async () => {
    const result = await appRouter
      .createCaller(createContext("user"))
      .staff.status();
    expect(result).toMatchObject({ authenticated: true, role: "VIEWER" });
  });

  it("blocks a viewer from operations status", async () => {
    await expect(
      appRouter.createCaller(createContext("user")).staff.operationsStatus()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to read operations status", async () => {
    const result = await appRouter
      .createCaller(createContext("admin"))
      .staff.operationsStatus();
    expect(result).toMatchObject({ authorized: true, role: "ADMIN" });
  });
});
