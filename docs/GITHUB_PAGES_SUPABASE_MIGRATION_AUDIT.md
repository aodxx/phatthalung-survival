# GITHUB PAGES + SUPABASE MIGRATION AUDIT

วันที่ตรวจ: **20 สิงหาคม 2026 (GMT+7)**  
Repository: [`aodxx/phatthalung-survival`](https://github.com/aodxx/phatthalung-survival)  
Audit branch: `agent/github-pages-supabase-migration`  
Baseline commit ที่ตรวจ: `79c776b` (`Checkpoint: Phase 0/1 verification update`)  
ขอบเขต: ตรวจโค้ดจริงใน `server/`, client API calls, Vite/PWA, secrets references, Supabase boundaries และ GitHub Actions โดยไม่เปลี่ยน production data

> **คำตัดสิน:** โครงการมี foundation ของ Supabase, atomic Intake RPC, Supabase Auth/RLS และ private attachment boundary แล้ว แต่ยัง **ไม่พร้อมย้าย production ไป GitHub Pages** เพราะ public client ยังเรียก `/api/trpc` และ `/api/public/attachments` ซึ่งต้องมี Express/Node runtime เดิม, Manus OAuth ยังอยู่ใน client/server auth path, Vite/PWA ยังใช้ root-relative paths และ repository ยังไม่มี GitHub Pages deployment workflow แบบ official Actions

## 1. Executive summary

คำสั่งในไฟล์แนบเป็นการเปลี่ยน **Deployment Architecture** ไม่ใช่การเปลี่ยน Product Architecture. ข้อกำหนดด้าน Request/Incident/Mission separation, public no-login intake, offline IndexedDB queue, server acknowledgement, idempotency, audit trail, RLS และ human-in-the-loop ต้องคงไว้ทั้งหมด

ผล audit พบว่า Supabase เป็นฐานที่เหมาะสมสำหรับ production system of record แล้ว โดยมี PostgreSQL migrations, atomic public intake function, Supabase Auth bearer resolution, `user_profiles.role_code`/`zone_id`, zone-aware RLS และ private attachments schema/bucket migration. อย่างไรก็ตาม การเชื่อมต่อเหล่านี้ยังถูกห่อหุ้มด้วย Express/tRPC routes ของ Manus WebDev ในหลายจุด จึงยังไม่สอดคล้องกับเป้าหมายที่ GitHub Pages ทำหน้าที่เสิร์ฟ static frontend เพียงอย่างเดียว

ข้อเสนอหลักคือ **ย้ายทีละ boundary โดยรักษา Manus preview ไว้จนกว่า GitHub Pages URL จริงจะผ่าน E2E** ไม่ควรลบ `server/` หรือปิด Manus deployment ในขั้น audit นี้. Critical public mutation ควรใช้ Supabase Edge Function ที่เรียก PostgreSQL RPC หรือเรียก RPC ผ่าน contract ที่ตรวจสอบแล้ว; public tracking และ attachment access ควรมี Edge Function/signed URL boundary; staff operations ควรใช้ Supabase Auth + RLS โดยตรงหรือ Edge Functions สำหรับ privileged workflows

## 2. Evidence baseline

| รายการ | หลักฐาน | ผลตรวจ |
|---|---|---|
| Audit branch | `agent/github-pages-supabase-migration` was created locally from the current fixing-pass state; `main` was not edited directly | PASS |
| Repository | `https://github.com/aodxx/phatthalung-survival` is public; default branch is `main` | VERIFIED |
| Open PRs | GitHub API returned no open PRs at inspection time | FACT, not a completeness claim |
| GitHub workflows | Repository `.github/workflows/ci.yml` runs install, typecheck, lint, test and build; GitHub also reported a Pages build/deployment workflow, but no repository-owned Pages deploy workflow exists | GAP |
| Recent CI | Run `32294392690` passed on `main`; run `32294452421` passed for Pages build/deployment; earlier CI failures were also present in recent history | PASS with history noted |
| Local quality gates | `pnpm check` passed; 70 tests passed, 2 optional Supabase integration tests skipped by default; `pnpm lint` and `pnpm build` passed, with a bundle-size warning | PASS |
| Requested GitHub Pages URL | `https://aodxx.github.io/phatthalung-survival/` | NOT YET VERIFIED |

The audit did not merge a PR, shut down Manus deployment, deploy Edge Functions, or mutate database data.

## 3. Client API call audit

| Client location | Current call | Current runtime dependency | GitHub Pages impact | Target boundary |
|---|---|---|---|---|
| `client/src/main.tsx:41-72` | tRPC `httpBatchLink` to `/api/trpc`, `credentials: include`, optional `Authorization` from `sessionStorage` | Express + tRPC + Manus cookie/session context | **P0 blocker**: GitHub Pages has no `/api/trpc` Node route | Replace with Supabase client calls and/or absolute Edge Function URL; remove Manus cookie forwarding from production |
| `client/src/pages/Intake.tsx:94,131-144` | `trpc.intake.submit.useMutation()` for queue drain and manual retry | `server/routers.ts` → `submitPublicIntake()` → Supabase admin/RPC | **P0 blocker** for acknowledgement | Use a typed Edge Function client or direct safe RPC contract that preserves atomic RPC, acknowledgement and idempotency |
| `client/src/components/QueueRuntime.tsx` | tRPC Intake mutation on app start/online events | Express/tRPC runtime | **P0 blocker** for reconnect sync | Inject a Supabase-backed transport while preserving PENDING/SENDING/SENT/FAILED semantics |
| `client/src/pages/Tracking.tsx:22-42` | tRPC tracking lookup and attachment download | Express/tRPC public tracking and signed download route | **P1 blocker** | Use a public tracking Edge Function/safe RPC and signed URL boundary |
| `client/src/components/AttachmentUploader.tsx:35-47` | `fetch("/api/public/attachments")` with raw Blob and custom headers | Express raw-body route, server validation, storage boundary | **P0 blocker** | Use Supabase Storage signed upload or Edge Function upload endpoint with explicit CORS and idempotency |
| `client/src/components/AttachmentUploader.tsx:60-96,115-173` | Retry same relative attachment route on startup/`online` | Express attachment route | **P1 blocker** | Keep IndexedDB queue; replace only transport and preserve READY acknowledgement |
| `client/src/_core/hooks/useAuth.ts` | tRPC auth me/logout | Manus OAuth/session cookie | **P1 blocker** | Staff UI uses Supabase Auth; Manus adapter is dev-only |
| `client/src/const.ts:15-30` | Manus OAuth portal navigation to `/api/oauth/callback` | Manus OAuth portal, Express callback, Manus SDK | **P0 blocker** | Remove from production path and use Supabase Auth redirect for staff |
| `client/src/components/Map.tsx:89-98` | Forge map proxy URL and frontend key | Manus Forge API/proxy | **P1 security risk** | Use restricted public map key or secure proxy without privileged browser credential |
| `client/public/sw.js` | Root-relative cache and fallback URLs | Root deployment path | **P0 path blocker** | Generate base-aware manifest, scope, cache URLs and fallback |

The typed client binding in `client/src/lib/trpc.ts` imports `AppRouter` from `server/routers.ts`. This compile-time coupling must be replaced or isolated behind a frontend backend interface before a static-only production build can be considered complete.

## 4. `server/` classification

### Group A — move to Supabase Edge Functions

| Module/route | Migration target | Required invariants |
|---|---|---|
| `server/_core/index.ts:48-86` attachment GET/POST | Edge Function(s), or signed upload plus finalize function | Private bucket, Case ID/token authorization, binary validation, idempotent `client_attachment_id`, sanitized errors, Request independent from attachment |
| `server/routers.ts` tracking router | Public tracking Edge Function or safe RPC/view endpoint | Public-safe lifecycle only; wrong token denied; no PII/storage path |
| `server/routers.ts` staff procedures | Supabase Auth + RLS for reads; Edge Functions for privileged writes | Role, zone, active status, admin override, audit reason |
| `server/_core/oauth.ts` and `_core/sdk.ts` | Remove from production path; Supabase Auth redirect | No Manus production authorization or callback |
| `server/_core/storageProxy.ts` | Remove; Supabase Storage signed URLs | No Forge storage dependency |
| `_core/map.ts`, `llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `notification.ts`, `dataApi.ts` | Remove from emergency production path or isolate into separately secured Edge Functions | No service key in Pages bundle; explicit product decision |

### Group B — retain as PostgreSQL RPC/Function or RLS policy

| Contract | Existing evidence | Required target |
|---|---|---|
| Public Intake | `server/intake.ts` and `20260820000004_public_intake_atomic.sql` | Keep Request → Contact → People Summary → Audit in one transaction |
| Idempotency | Unique `client_request_id` and real concurrency tests | Keep conflict path returning original Case ID without a new token |
| Public tracking lifecycle | `server/tracking.ts` maps incident/mission lifecycle | Move safe projection to RPC/view or Edge Function |
| Audit | `server/audit.ts`, `mutation.ts`, atomic RPC | Preserve actor/action/entity/timestamp and transactional semantics |
| Staff zone access | `server/supabaseStaffAuth.ts` and RLS migrations | Make Supabase Auth + RLS authoritative; Edge Functions must not bypass RLS accidentally |

### Group C — development-only/removable after verification

`server/_core/vite.ts`, the Express bootstrap, Manus OAuth/session helpers, the legacy Drizzle `server/db.ts` adapter, and Forge integrations can become development-only or be removed only after their Supabase replacements pass E2E. They must not be deleted during this audit because Manus preview still depends on the current Node runtime.

## 5. Authentication, security and storage

`server/_core/context.ts:21-34` resolves a Supabase bearer token into `StaffPrincipal`, but `context.ts:36-41` still calls `sdk.authenticateRequest()` and populates a Manus `ctx.user`. The tRPC authorization layer permits a Manus fallback. This is a hybrid preview boundary, not a pure Supabase production authorization boundary.

The positive foundation is `server/supabaseStaffAuth.ts`, which resolves `user_profiles(id, role_code, zone_id, active)`, validates roles and supports zone checks. Production Edge Functions must use the Supabase JWT/profile path and fail closed on missing or inactive profiles. Public Intake must remain login-free.

The browser Supabase client uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, which is compatible with Pages if RLS is correct. Server-only values include `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `JWT_SECRET`, `BUILT_IN_FORGE_API_KEY` and `OAUTH_SERVER_URL`; these must never enter the Pages build. `VITE_FRONTEND_FORGE_API_KEY` in `Map.tsx` is browser-visible and must be origin-restricted or removed.

The current same-origin preview hides CORS requirements. For Pages, Edge Functions must allow the exact `https://aodxx.github.io` origin and required headers, including the attachment headers if that contract remains. Supabase Auth redirect configuration must include the `/phatthalung-survival/` subpath. Wildcard CORS is not appropriate for privileged operations.

## 6. Vite, routing and PWA

`vite.config.ts` has `root: client`, `outDir: dist/public` and the Manus runtime plugin, but no `base: "/phatthalung-survival/"`. `App.tsx` uses path-based `wouter` routes for `/`, `/intake` and `/tracking`. GitHub Pages has no Node rewrite, so direct URL and refresh require a hash router or a deliberate Pages SPA fallback strategy.

`manifest.webmanifest` uses `start_url: "/"` and `scope: "/"`. `sw.js` caches `"/"` and `"/manifest.webmanifest"` and falls back to `caches.match("/")`. These paths are incompatible with the requested project subpath unless generated from a shared base constant and tested after install/reload/offline.

The debug collector is disabled in production by the Vite transform, but `vite-plugin-manus-runtime` remains in the build configuration. Its production output must be checked; if it emits a runtime dependency, it must be removed or isolated to development.

## 7. GitHub Actions and deployment readiness

`.github/workflows/ci.yml` performs checkout, pnpm setup, Node 22, frozen install, typecheck, lint, tests and build. It triggers on `main`/`master` pushes and pull requests. It does not upload a Pages artifact or invoke `actions/deploy-pages`. The GitHub-reported Pages workflow is not a checked-in deterministic workflow for this migration.

The required future workflow is: install → typecheck → lint → test → frontend-only build with the correct base → `actions/upload-pages-artifact` → `actions/deploy-pages`. Edge Function deployment should remain separate and server-secret protected. The requested Pages URL was not verified during this audit.

## 8. Priority blockers and acceptance gates

| Priority | Blocker | Acceptance gate |
|---|---|---|
| P0 | Intake/queue depend on `/api/trpc` | Pages URL passes online, offline, reconnect, acknowledgement, duplicate race and cleanup |
| P0 | Attachment depends on same-origin Express raw-body route | Signed upload/READY/retry/download/wrong-token/cleanup pass |
| P0 | Root-relative Vite/PWA paths | Direct routes, refresh, manifest, install and offline shell pass under `/phatthalung-survival/` |
| P0 | Manus OAuth remains in production path | Supabase staff Auth/RLS pass and production bundle/runtime has no Manus auth dependency |
| P1 | No checked-in official Pages deployment workflow | CI gates Pages artifact/deploy and live URL returns 200 |
| P1 | CORS/Auth redirect not configured for Pages origin | Exact-origin preflight and redirect tests pass |
| P1 | Rate limiting not found in audited server/client code | Abuse tests and operational limits documented |
| P2 | Template-only Manus integrations remain | Each module marked retained, Edge Function or removed with tests |

## 9. Recommended migration sequence

| Phase | Work | Definition of done |
|---|---|---|
| 0 — Contract decoupling | Add a frontend backend interface and preview/production adapters; retain current Manus preview | Preview remains green and new production transport does not import `AppRouter` |
| 1 — Supabase critical paths | Implement Intake, tracking and attachment Edge Function/RPC boundaries | Supabase TEST-only integration and zero-row cleanup pass |
| 2 — Static frontend | Set Vite base, Pages-compatible routing, manifest/service worker paths, production secret scan | Pages artifact works under subpath and bundle contains only approved public values |
| 3 — CI/deployment | Add official Pages workflow; configure Pages, Supabase CORS/Auth redirects/secrets | CI-gated Pages deployment and URL smoke pass |
| 4 — Cutover | Run full online/offline/reconnect/GPS/tracking/attachment/staff/RLS matrix | Owner signs off; only then disable Manus production dependency |

## 10. OWNER ACTION REQUIRED

The owner must configure GitHub Pages, confirm the Pages project URL, configure Supabase Auth redirect URLs including `https://aodxx.github.io/phatthalung-survival/`, configure exact-origin Edge Function CORS, confirm Edge Function secrets/deployment project and decide whether the map provider uses a restricted public key or a secure proxy. No password, service-role key, database password or access token should be sent through chat.

The owner should not disable Manus Hosting or merge this branch until the GitHub Pages URL passes the full E2E matrix and rollback readiness is documented.

## 11. Final audit decision

**READY TO START IMPLEMENTATION ON THE MIGRATION BRANCH: YES.** The branch has been created and the audit is complete.

**READY TO DEPLOY TO GITHUB PAGES: NO.** The current client still depends on Manus-hosted `/api/trpc`, Express attachment routes, Manus OAuth/session paths and root deployment paths.

**READY TO DISABLE MANUS HOSTING: NO.** Disabling it before Supabase replacements are live would stop Intake acknowledgement, tracking, attachment upload/download and current staff procedures.

## References

[1]: https://github.com/aodxx/phatthalung-survival "Source repository"
[2]: https://github.com/aodxx/phatthalung-survival/actions "GitHub Actions"
[3]: https://github.com/aodxx/phatthalung-survival/blob/main/server/_core/index.ts "Express/API bootstrap"
[4]: https://github.com/aodxx/phatthalung-survival/blob/main/server/routers.ts "tRPC router"
[5]: https://github.com/aodxx/phatthalung-survival/blob/main/server/_core/context.ts "Hybrid auth context"
[6]: https://github.com/aodxx/phatthalung-survival/blob/main/client/src/main.tsx "Client tRPC transport"
[7]: https://github.com/aodxx/phatthalung-survival/blob/main/client/src/pages/Intake.tsx "Citizen Intake client"
[8]: https://github.com/aodxx/phatthalung-survival/blob/main/client/src/components/AttachmentUploader.tsx "Attachment client transport"
[9]: https://github.com/aodxx/phatthalung-survival/blob/main/vite.config.ts "Vite configuration"
[10]: https://github.com/aodxx/phatthalung-survival/blob/main/.github/workflows/ci.yml "Current CI workflow"
