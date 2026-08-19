import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { assertStaffRole, staffPrincipalFromManusUser } from "../staffAuth";
import type { StaffRole } from "../../shared/emergency";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const roleProcedure = (allowedRoles: readonly StaffRole[]) =>
  t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user && !ctx.staffPrincipal) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }

      try {
        const staff = assertStaffRole(
          ctx.staffPrincipal ?? staffPrincipalFromManusUser(ctx.user!),
          allowedRoles
        );
        return next({ ctx: { ...ctx, user: ctx.user, staff } });
      } catch (error) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            error instanceof Error
              ? error.message
              : "Staff role is not authorized",
        });
      }
    })
  );

export const staffProcedure = roleProcedure([
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

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const isAdmin =
      ctx.staffPrincipal?.role === "ADMIN" || ctx.user?.role === "admin";
    if (!isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
