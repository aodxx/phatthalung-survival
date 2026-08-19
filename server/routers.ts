import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  publicProcedure,
  router,
  roleProcedure,
  staffProcedure,
} from "./_core/trpc";
import { isSupabaseConfigured } from "./supabase";
import {
  PUBLIC_NEED_TYPES,
  REPORTER_RELATIONS,
  submitPublicIntake,
} from "./intake";
import { lookupPublicTracking } from "./tracking";
import { getPublicAttachmentDownload } from "./attachments";
import { isValidThaiPhone, normalizeThaiPhone } from "./phone";
import { z } from "zod";

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

  staff: router({
    status: staffProcedure.query(({ ctx }) => ({
      authenticated: true as const,
      staffUserId: ctx.staff.userId,
      role: ctx.staff.role,
      zoneId: ctx.staff.zoneId ?? null,
    })),
    operationsStatus: roleProcedure(["ADMIN", "COMMANDER", "OPERATIONS"]).query(
      ({ ctx }) => ({
        authorized: true as const,
        role: ctx.staff.role,
      })
    ),
  }),

  foundation: router({
    status: publicProcedure.query(() => ({
      phase: "0-foundation" as const,
      supabaseConfigured: isSupabaseConfigured(),
      criticalSubmission: "controlled_intake_mutation_available" as const,
      publicIntakeRequiresLogin: false as const,
    })),
  }),

  intake: router({
    submit: publicProcedure
      .input(
        z.object({
          clientRequestId: z.string().uuid(),
          createdAt: z.string().datetime(),
          locationMode: z.enum(["gps", "text"]),
          locationText: z.string().trim().min(2).max(500),
          incidentType: z.string().trim().min(2).max(120).optional(),
          needType: z.enum(PUBLIC_NEED_TYPES).optional(),
          peopleTotal: z.number().int().min(0).max(10000).nullable(),
          peopleTotalApproximate: z.boolean().optional(),
          vulnerableUnknown: z.boolean().optional(),
          vulnerableNotes: z.string().max(2000),
          contactName: z.string().max(120),
          phone: z
            .string()
            .refine(value => isValidThaiPhone(normalizeThaiPhone(value)), {
              message: "phone is invalid",
            }),
          reporterRelation: z.enum(REPORTER_RELATIONS).optional(),
          latitude: z.number().min(-90).max(90).nullable().optional(),
          longitude: z.number().min(-180).max(180).nullable().optional(),
          gpsAccuracyM: z.number().min(0).nullable().optional(),
          childrenCount: z.number().int().min(0).nullable().optional(),
          elderlyCount: z.number().int().min(0).nullable().optional(),
          disabledCount: z.number().int().min(0).nullable().optional(),
          bedriddenCount: z.number().int().min(0).nullable().optional(),
          urgentMedicalCount: z.number().int().min(0).nullable().optional(),
        })
      )
      .mutation(({ input }) => submitPublicIntake(input)),
    status: publicProcedure.query(() => ({
      phase: "1-citizen-critical-intake" as const,
      implemented: true as const,
      contract:
        "client-validate → IndexedDB PENDING → controlled API → server acknowledgement" as const,
      publicIntakeRequiresLogin: false as const,
    })),
  }),

  attachments: router({
    download: publicProcedure
      .input(
        z.object({
          caseCode: z.string().trim().min(6).max(40),
          trackingToken: z.string().min(16).max(200),
          attachmentId: z.string().uuid(),
        })
      )
      .query(({ input }) => getPublicAttachmentDownload(input)),
  }),

  tracking: router({
    lookup: publicProcedure
      .input(
        z.object({
          caseCode: z.string().trim().min(6).max(40),
          trackingToken: z.string().min(16).max(200),
        })
      )
      .query(({ input }) => lookupPublicTracking(input)),
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
