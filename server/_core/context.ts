import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSupabaseAdmin } from "../supabase";
import { resolveSupabaseStaffPrincipal } from "../supabaseStaffAuth";
import type { StaffPrincipal } from "../staffAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  staffPrincipal?: StaffPrincipal | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let staffPrincipal: StaffPrincipal | null = null;

  const authorization = opts.req.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const supabase = getSupabaseAdmin();
  if (bearerToken && supabase) {
    const { data, error } = await supabase.auth.getUser(bearerToken);
    if (!error && data.user) {
      staffPrincipal = await resolveSupabaseStaffPrincipal(
        supabase,
        data.user.id
      );
    }
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    staffPrincipal,
  };
}
