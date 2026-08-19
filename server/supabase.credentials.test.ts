import { describe, expect, it } from "vitest";

const hasSupabaseCredentials = Boolean(
  process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
);

describe.skipIf(!hasSupabaseCredentials)("Supabase credentials", () => {
  it("can reach the Supabase Auth settings endpoint with the publishable key", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: key as string,
        Authorization: `Bearer ${key}`,
      },
    });

    expect(
      response.ok,
      `Supabase settings endpoint returned ${response.status}`
    ).toBe(true);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("external");
  }, 15_000);
});
