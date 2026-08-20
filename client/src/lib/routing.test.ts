import { describe, expect, it } from "vitest";
import { getRoutePath } from "./routing";

describe("getRoutePath", () => {
  it("keeps preview routes at the root", () => {
    expect(getRoutePath("/", "/")).toBe("/");
    expect(getRoutePath("/", "/intake")).toBe("/intake");
    expect(getRoutePath("/", "/tracking")).toBe("/tracking");
  });

  it("prefixes GitHub Pages routes with the deployment base", () => {
    expect(getRoutePath("/phatthalung-survival/", "/")).toBe("/phatthalung-survival/");
    expect(getRoutePath("/phatthalung-survival/", "/intake")).toBe("/phatthalung-survival/intake");
    expect(getRoutePath("/phatthalung-survival/", "tracking")).toBe("/phatthalung-survival/tracking");
  });
});
