# GITHUB PAGES + SUPABASE MIGRATION AUDIT

วันที่ตรวจ: **20 สิงหาคม 2026 (GMT+7)**  
Repository: [`aodxx/phatthalung-survival`](https://github.com/aodxx/phatthalung-survival)  
Branch เป้าหมาย: `agent/github-pages-supabase-migration`  
Baseline production branch ที่ตรวจ: `main` / commit `bdd52a9d`

> **คำตัดสิน:** ยังไม่พร้อมย้าย production ไป GitHub Pages แม้ Supabase foundation จะพร้อมบางส่วน เพราะ client ยังพึ่ง `/api/trpc`, `/api/public/attachments`, Express/Node และ Manus OAuth/session path.

## 1. Executive summary

คำสั่งในไฟล์แนบเป็นการเปลี่ยน Deployment Architecture เท่านั้น Product Architecture ต้องคง Request/Incident/Mission separation, public no-login intake, IndexedDB offline queue, server acknowledgement, idempotency, audit trail, RLS และ human-in-the-loop triage.

โครงการมี PostgreSQL migrations, atomic public intake RPC, Supabase Auth bearer/profile resolution, zone-aware RLS และ private attachment boundary แล้ว แต่ production client ยังถูกห่อหุ้มด้วย Express/tRPC ของ Manus WebDev. แนวทางที่ปลอดภัยคือย้ายทีละ boundary และคง Manus preview ไว้จน GitHub Pages URL จริงผ่าน E2E.

## 2. Evidence baseline

| รายการ           | หลักฐาน                                                                                                                              | ผลตรวจ                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Repository       | `https://github.com/aodxx/phatthalung-survival`; default branch `main`                                                               | VERIFIED                      |
| Migration branch | `agent/github-pages-supabase-migration` ถูกสร้างและมี remote ref แล้ว                                                                | PASS                          |
| Open PRs         | GitHub API ไม่พบ open PR ณ เวลาตรวจ                                                                                                  | FACT ไม่ใช่หลักฐานว่างานเสร็จ |
| Workflows        | `.github/workflows/ci.yml` มี quality checks; ยังไม่มี repository-owned Pages artifact/deploy workflow                               | GAP                           |
| Recent CI        | `32294392690` CI passed; `32294452421` Pages build/deployment passed; มี failure runs ก่อนหน้า                                       | PASS พร้อมประวัติ             |
| Local checks     | `pnpm check` passed; 70 tests passed, 2 optional Supabase integration tests skipped; lint/build passed; build มี bundle-size warning | PASS                          |
| Requested URL    | `https://aodxx.github.io/phatthalung-survival/`                                                                                      | ยังไม่ verified               |

## 3. Client API calls audit

| ไฟล์/บรรทัด                                           | Current call                                                                                | Blocker ต่อ GitHub Pages                          | Target                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `client/src/main.tsx:41-72`                           | tRPC `httpBatchLink` ไป `/api/trpc`, credentials include และ Manus token จาก sessionStorage | **P0**: Pages ไม่มี Node `/api/trpc`              | Supabase client/Edge Function transport แบบ typed; production ห้ามส่ง Manus cookie       |
| `client/src/pages/Intake.tsx:94,131-144`              | `trpc.intake.submit.useMutation()` สำหรับ drain/retry                                       | **P0**: acknowledgement ยังขึ้นกับ Express/tRPC   | Edge Function หรือ safe RPC adapter ที่คง atomic RPC/idempotency/Case ID/token           |
| `client/src/components/QueueRuntime.tsx`              | tRPC Intake mutation ตอน startup/online                                                     | **P0**: reconnect sync ใช้ Manus runtime          | Inject backend transport ใหม่ คง queue state เดิม                                        |
| `client/src/pages/Tracking.tsx:22-42`                 | tRPC tracking lookup และ attachment download                                                | **P1**: public tracking ใช้ Express               | Public tracking Edge Function/safe RPC และ signed download                               |
| `client/src/components/AttachmentUploader.tsx:35-47`  | raw Blob ไป `/api/public/attachments` พร้อม custom headers                                  | **P0**: same-origin Express route                 | Supabase Storage signed upload หรือ Edge Function finalize/upload พร้อม CORS/idempotency |
| `client/src/components/AttachmentUploader.tsx:60-173` | retry ไป relative attachment route                                                          | **P1**: offline attachment drain ใช้ Node         | คง IndexedDB แต่เปลี่ยน transport และ READY acknowledgement                              |
| `client/src/_core/hooks/useAuth.ts`                   | tRPC auth me/logout                                                                         | **P1**: Manus session                             | Staff ใช้ Supabase Auth; Manus adapter dev-only                                          |
| `client/src/const.ts:15-30`                           | Manus OAuth portal และ `/api/oauth/callback`                                                | **P0**: production ยังพึ่ง Manus                  | Supabase Auth redirect สำหรับ staff; ตัด production Manus path                           |
| `client/src/components/Map.tsx:89-98`                 | Forge map proxy และ `VITE_FRONTEND_FORGE_API_KEY`                                           | **P1 security**: browser-visible Forge key        | Restricted public provider key หรือ secure proxy                                         |
| `client/public/sw.js`                                 | cache/fallback `/` และ `/manifest.webmanifest`                                              | **P0 path** เมื่ออยู่ใต้ `/phatthalung-survival/` | base-aware URLs/scope/cache                                                              |

`client/src/lib/trpc.ts` ยัง import `AppRouter` จาก `server/routers.ts`. ต้องแยก frontend backend interface เพื่อไม่ให้ static build มี compile/runtime coupling กับ Express server.

## 4. Server classification

### Group A — Supabase Edge Functions

| Module                                                                                                   | Target                                                      | Invariants                                                                                                 |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `server/_core/index.ts:48-86` attachment GET/POST                                                        | Edge Function หรือ signed upload + finalize                 | private bucket, Case ID/token check, binary validation, idempotency, sanitized errors, Request independent |
| `server/routers.ts` tracking router                                                                      | public tracking Edge Function/safe RPC                      | public-safe lifecycle only; no PII/storage path; wrong-token denial                                        |
| `server/routers.ts` staff procedures                                                                     | Supabase Auth + RLS reads; Edge Functions privileged writes | role/zone/active/admin override/audit                                                                      |
| `server/_core/oauth.ts`, `_core/sdk.ts`                                                                  | remove from production; Supabase Auth redirect              | no Manus production authorization                                                                          |
| `server/_core/storageProxy.ts`                                                                           | remove; Supabase Storage signed URL                         | no Forge storage dependency                                                                                |
| `_core/map.ts`, `llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `notification.ts`, `dataApi.ts` | isolate or remove from emergency production path            | no secrets in Pages; explicit product decision                                                             |

### Group B — PostgreSQL RPC/Function/RLS

| Contract                 | Evidence                                                      | Must preserve                                                |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Public Intake            | `server/intake.ts`, `20260820000004_public_intake_atomic.sql` | Request → Contact → People Summary → Audit one transaction   |
| Idempotency              | unique `client_request_id` and concurrency tests              | duplicate returns original Case ID, no new token             |
| Tracking status          | `server/tracking.ts` incident/mission lifecycle mapping       | public-safe projection in RPC/view/Edge Function             |
| Audit                    | `server/audit.ts`, `mutation.ts`, atomic RPC                  | actor/action/entity/timestamp and transaction semantics      |
| Staff zone authorization | `server/supabaseStaffAuth.ts` and RLS migrations              | Supabase JWT/profile/RLS authoritative; no accidental bypass |

### Group C — dev-only/removable after verification

`server/_core/vite.ts`, Express bootstrap, Manus OAuth/session helpers, legacy `server/db.ts`, Forge integrations and storage proxy may become dev-only or be removed only after replacements pass E2E. Do not delete them during audit; Manus preview still uses the Node runtime.

## 5. Auth, secrets, CORS and storage

`server/_core/context.ts:21-34` resolves Supabase bearer into `StaffPrincipal`, but lines 36-41 still call `sdk.authenticateRequest()` and populate Manus `ctx.user`. `server/_core/trpc.ts` permits a Manus fallback. This is hybrid preview auth, not pure Supabase production authorization.

`server/supabaseStaffAuth.ts` is a strong production foundation: it resolves `user_profiles(id, role_code, zone_id, active)`, validates roles and zone access. Edge Functions must use this path and fail closed. Citizen Intake must remain login-free.

The browser client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, which may be exposed if RLS is correct. `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `JWT_SECRET`, `BUILT_IN_FORGE_API_KEY` and `OAUTH_SERVER_URL` must never enter the Pages bundle. `VITE_FRONTEND_FORGE_API_KEY` is browser-visible and must be origin-restricted or removed.

Pages changes same-origin assumptions. Edge Functions must allow exact origin `https://aodxx.github.io` and required attachment headers, not wildcard privileged CORS. Supabase Auth redirect URLs must include `/phatthalung-survival/`. Private Supabase Storage and signed URLs remain the target; Request creation must not fail when attachment upload fails.

## 6. Vite, routing and PWA

`vite.config.ts` has `root: client`, `outDir: dist/public` and `vite-plugin-manus-runtime`, but no `base: "/phatthalung-survival/"`. `App.tsx` uses path-based `wouter` routes. GitHub Pages has no Node rewrite, so hash routing or deliberate Pages SPA fallback is required for direct links and refresh.

`manifest.webmanifest` uses `start_url: "/"` and `scope: "/"`. `sw.js` caches `/` and `/manifest.webmanifest` and falls back to `/`. These must be generated from one base constant and tested under the project subpath. Production output must also prove that `vite-plugin-manus-runtime` emits no Manus runtime dependency, or the plugin must be dev-only.

## 7. GitHub Actions and deployment readiness

`.github/workflows/ci.yml` runs checkout, pnpm setup, Node 22, frozen install, typecheck, lint, tests and build. It does not upload a Pages artifact or call `actions/deploy-pages`. A GitHub-reported Pages workflow is not a substitute for a repository-owned deterministic workflow.

Target workflow: install → typecheck → lint → test → frontend-only build with base → `actions/upload-pages-artifact` → `actions/deploy-pages`. Edge Function deployment should be separate and server-secret protected. The requested Pages URL was not verified in this audit.

## 8. Priority blockers and acceptance gates

| Priority | Blocker                                               | Acceptance gate                                                   |
| -------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| P0       | Intake/queue depend on `/api/trpc`                    | Pages URL passes online/offline/reconnect/ack/idempotency/cleanup |
| P0       | Attachment depends on Express raw-body route          | signed upload/READY/retry/download/wrong-token/cleanup pass       |
| P0       | Root-relative Vite/PWA paths                          | direct routes/refresh/manifest/install/offline pass under subpath |
| P0       | Manus OAuth in production path                        | Supabase staff Auth/RLS pass; no production Manus auth dependency |
| P1       | No checked-in Pages deployment workflow               | CI gates artifact/deploy; live URL returns 200                    |
| P1       | CORS/Auth redirect not configured                     | exact-origin preflight and redirect tests pass                    |
| P1       | No rate limiting implementation found by audit search | abuse tests and limits documented                                 |
| P2       | Template-only Manus integrations remain               | each module marked retained, Edge Function or removed with tests  |

## 9. Recommended migration sequence

| Phase | Work                                                                                 | Definition of done                                              |
| ----- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 0     | Add frontend backend interface and preview/production adapters; retain Manus preview | preview green; production transport does not import `AppRouter` |
| 1     | Implement Intake, tracking and attachment Supabase boundaries                        | TEST integration and zero-row cleanup pass                      |
| 2     | Set Vite base, Pages routing, manifest/service worker and production secret scan     | artifact works under subpath                                    |
| 3     | Add official Pages workflow and configure Pages/Supabase CORS/Auth/secrets           | CI-gated deployment and URL smoke pass                          |
| 4     | Run full online/offline/reconnect/GPS/tracking/attachment/staff/RLS matrix           | owner sign-off; only then disable Manus dependency              |

## 10. OWNER ACTION REQUIRED

Owner must configure GitHub Pages, confirm the Pages URL, configure Supabase Auth redirect URL `https://aodxx.github.io/phatthalung-survival/`, configure exact-origin Edge Function CORS, confirm Edge Function secrets/deployment project and decide map provider key strategy. Do not send password, service-role key, database password or access token through chat.

Do not disable Manus Hosting or merge the branch until the GitHub Pages URL passes the full E2E matrix and rollback readiness is documented.

## 11. Final audit decision

**READY TO START IMPLEMENTATION ON THE MIGRATION BRANCH: YES.** The remote branch exists and this audit is the starting artifact.

**READY TO DEPLOY TO GITHUB PAGES: NO.** Client still depends on Manus-hosted `/api/trpc`, Express attachment routes, Manus OAuth/session paths and root deployment paths.

**READY TO DISABLE MANUS HOSTING: NO.** Disabling it now would stop Intake acknowledgement, tracking, attachment upload/download and current staff procedures.

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
