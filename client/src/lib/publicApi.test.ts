import { describe, expect, it } from "vitest";
import { isSupabaseProductionRuntime } from "./publicApi";

describe("public transport runtime gate", () => {
  it("keeps Manus preview as the default when production flag is absent", () => {
    expect(isSupabaseProductionRuntime()).toBe(false);
  });
});
