import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { isSupabaseConfigured } from "./supabase";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  foundation: router({
    status: publicProcedure.query(() => ({
      phase: "0-foundation" as const,
      supabaseConfigured: isSupabaseConfigured(),
      criticalSubmission: "not_implemented_until_phase_1" as const,
      publicIntakeRequiresLogin: false as const,
    })),
  }),

  intake: router({
    status: publicProcedure.query(() => ({
      phase: "1-citizen-critical-intake" as const,
      implemented: false as const,
      contract:
        "client-validate → IndexedDB PENDING → controlled API → server acknowledgement" as const,
      publicIntakeRequiresLogin: false as const,
    })),
  }),

  tracking: router({
    status: publicProcedure.query(() => ({
      phase: "1-citizen-critical-intake" as const,
      implemented: false as const,
      requiredCredentials: "case-code-and-secure-tracking-token" as const,
      publicFieldsOnly: true as const,
    })),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
