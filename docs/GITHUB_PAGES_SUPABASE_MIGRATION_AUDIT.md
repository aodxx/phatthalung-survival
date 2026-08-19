# GITHUB PAGES + SUPABASE MIGRATION AUDIT

วันที่ตรวจ: **20 สิงหาคม 2026 (GMT+7)**  
Repository: [`aodxx/phatthalung-survival`](https://github.com/aodxx/phatthalung-survival)  
Audit branch: `agent/github-pages-supabase-migration`  
Baseline commit ที่ตรวจ: `79c776b` (`Checkpoint: Phase 0/1 verification update`)  
ขอบเขต: ตรวจแบบ read-only ต่อ production data และตรวจโค้ดจริงใน `server/`, client API calls, Vite/PWA, secrets references, Supabase boundaries และ GitHub Actions

> **คำตัดสินเบื้องต้น:** โครงการมี foundation ของ Supabase, atomic Intake RPC, Supabase Auth/RLS และ private attachment boundary แล้ว แต่ยัง **ไม่พร้อมย้าย production ไป GitHub Pages** เพราะ public client ยังเรียก `/api/trpc` และ `/api/public/attachments` ซึ่งต้องมี Express/Node runtime เดิม, Manus OAuth ยังอยู่ใน client/server auth path, Vite/PWA ยังใช้ root-relative paths และ repository ยังไม่มี GitHub Pages deployment workflow แบบ official Actions

## 1. Executive summary

คำสั่งในไฟล์แนบเป็นการเปลี่ยน **Deployment Architecture** ไม่ใช่การเปลี่ยน Product Architecture. ข้อกำหนดด้าน Request/Incident/Mission separation, public no-login intake, offline IndexedDB queue, server acknowledgement, idempotency, audit trail, RLS และ human-in-the-loop ต้องคงไว้ทั้งหมด

ผล audit พบว่า Supabase เป็นฐานที่เหมาะสมสำหรับ production system of record แล้ว โดยมี PostgreSQL migrations, atomic public intake function, Supabase Auth bearer resolution, `user_profiles.role_code`/`zone_id`, zone-aware RLS และ private attachments schema/bucket migration. อย่างไรก็ตาม การเชื่อมต่อเหล่านี้ยังถูกห่อหุ้มด้วย Express/tRPC routes ของ Manus WebDev ในหลายจุด จึงยังไม่สอดคล้องกับเป้าหมายที่ GitHub Pages ทำหน้าที่เสิร์ฟ static frontend เพียงอย่างเดียว

ข้อเสนอหลักคือ **ย้ายทีละ boundary โดยรักษา Manus preview ไว้จนกว่า GitHub Pages URL จริงจะผ่าน E2E** ไม่ควรลบ `server/` หรือปิด Manus deployment ในขั้น audit นี้. Critical public mutation ควรใช้ Supabase Edge Function ที่เรียก PostgreSQL RPC หรือเรียก RPC ผ่านปลอดภัยตาม contract; public tracking และ attachment access ควรมี Edge Function/signed URL boundary; staff operations ควรใช้ Supabase Auth + RLS โดยตรงหรือ Edge Functions สำหรับ privileged workflows

## 2. Evidence baseline

| รายการ                      | หลักฐาน                                                                                                                                                                                                    | ผลตรวจ                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Local branch at audit start | `main`, baseline commit `bdd52a9d` in managed checkout; migration branch was then created/switch-confirmed as `agent/github-pages-supabase-migration`                                                      | PASS                           |
| Audit branch                | `agent/github-pages-supabase-migration`, based on fixing-pass branch state `79c776b` in the project working tree                                                                                           | PASS                           |
| Repository                  | `https://github.com/aodxx/phatthalung-survival` is public; default branch is `main`                                                                                                                        | VERIFIED                       |
| Open PRs                    | GitHub API returned no open PRs at inspection time                                                                                                                                                         | FACT, not a completeness claim |
| GitHub workflows            | Repository workflow `.github/workflows/ci.yml` runs install, typecheck, lint, test and build; GitHub also reported a Pages build/deployment workflow, but no repository-owned Pages deploy workflow exists | GAP                            |
| Recent CI                   | Run `32294392690` passed on `main`; run `32294452421` passed for Pages build/deployment; earlier CI failures were also present in recent history                                                           | PASS with history noted        |
| Local quality gates         | `pnpm check` passed; 70 tests passed, 2 optional Supabase integration tests skipped by default; `pnpm lint` passed after formatting; `pnpm build` passed with a bundle-size warning                        | PASS                           |
| Current production preview  | Manus preview is live and prior runtime evidence covers Home, Intake, tracking, attachments, PWA and offline shell                                                                                         | Existing evidence              |
| Requested GitHub Pages URL  | `https://aodxx.github.io/phatthalung-survival/`                                                                                                                                                            | NOT YET VERIFIED               |

The branch creation itself was authorized by the user. No merge, deployment shutdown, database mutation, or Draft PR creation was performed during this audit.

## 3. Client API call audit

### 3.1 Call inventory

| Client location                                              | Current call                                                                                                | Current runtime dependency                                                 | GitHub Pages impact                                        | Target boundary                                                                                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/main.tsx:41-72`                                  | tRPC `httpBatchLink` to `/api/trpc`, `credentials: include`, optional `Authorization` from `sessionStorage` | Express + tRPC + Manus cookie/session context                              | **P0 blocker**: GitHub Pages has no `/api/trpc` Node route | Replace with Supabase client calls and/or absolute Edge Function URL; remove Manus cookie forwarding from production                                |
| `client/src/pages/Intake.tsx:94,131-144`                     | `trpc.intake.submit.useMutation()` for queue drain and manual retry                                         | `server/routers.ts` → `submitPublicIntake()` → Supabase admin/RPC          | **P0 blocker** for acknowledgement                         | Use a typed Edge Function client or direct safe RPC contract that preserves atomic RPC, acknowledgement and idempotency                             |
| `client/src/components/QueueRuntime.tsx`                     | tRPC Intake mutation on app start/online events                                                             | Express/tRPC runtime                                                       | **P0 blocker** for reconnect sync                          | Inject a Supabase-backed `submitPublicIntake` transport into queue runtime; preserve PENDING/SENDING/SENT/FAILED semantics                          |
| `client/src/pages/Tracking.tsx:22-42`                        | `trpc.tracking.lookup.useQuery()` and `trpc.attachments.download.fetch()`                                   | Express/tRPC public tracking and signed download route                     | **P1 blocker** for tracking on static host                 | Use a public tracking Edge Function or safe RPC/view; attachment download should return signed URL only after Case ID/token verification            |
| `client/src/components/AttachmentUploader.tsx:35-47`         | `fetch("/api/public/attachments")` with raw Blob and custom headers                                         | Express raw-body route, server validation, Supabase/Forge storage boundary | **P0 blocker** for uploads from GitHub Pages               | Use Supabase Storage signed upload or Edge Function upload endpoint with explicit CORS and idempotency                                              |
| `client/src/components/AttachmentUploader.tsx:60-96,115-173` | Retries same relative `/api/public/attachments` route on startup/`online`                                   | Express attachment route                                                   | **P1 blocker** for offline attachment drain                | Keep IndexedDB queue; replace only transport and preserve server acknowledgement before READY                                                       |
| `client/src/_core/hooks/useAuth.ts`                          | `trpc.auth.me` and `trpc.auth.logout`                                                                       | Manus OAuth/session cookie implementation                                  | **P1 blocker** for staff auth                              | Public citizen flow must not invoke login; staff UI should use Supabase Auth directly; Manus adapter must be dev-only                               |
| `client/src/contexts/SupabaseAuthContext.tsx`                | Browser Supabase `getSession()` and `onAuthStateChange()`                                                   | Supabase browser client with anon key                                      | Aligned                                                    | Keep, add production redirect/base-path tests                                                                                                       |
| `client/src/const.ts:15-30`                                  | Manus OAuth portal navigation to `/api/oauth/callback`                                                      | Manus OAuth portal, Express callback, Manus SDK                            | **P0 blocker** for “no Manus production dependency”        | Remove from production bundle/path or compile as explicit dev-only adapter; use Supabase Auth redirect for staff                                    |
| `client/src/components/Map.tsx:89-98`                        | Loads Maps proxy using `VITE_FRONTEND_FORGE_API_KEY` and Forge API URL                                      | Manus Forge proxy/API key in frontend                                      | **P1 security/architecture risk**                          | Replace with approved public map provider key restricted to GitHub Pages origin, or a Supabase/edge proxy that never exposes privileged credentials |
| `client/public/sw.js`                                        | Cache-first fallback uses `/` and `/manifest.webmanifest`                                                   | Root deployment path                                                       | **P0 path blocker** under `/phatthalung-survival/`         | Build base-aware URLs and scope; test offline fallback on project subpath                                                                           |

### 3.2 Static-host conclusion

The current client is not a static-only application. Its type binding imports `AppRouter` from `server/routers.ts` (`client/src/lib/trpc.ts:1-4`), and runtime calls depend on relative `/api/...` routes. This is a useful type-safe preview architecture, but it is not a deployable GitHub Pages production architecture until the transport contracts are separated from the Express implementation.

The migration should introduce a small frontend boundary such as `client/src/lib/backend.ts` with explicit methods for `submitPublicIntake`, `lookupPublicTracking`, `uploadAttachment`, and `getAttachmentDownload`. The queue and UI should depend on this boundary, not on tRPC types imported from the server. During migration, a preview adapter may call tRPC while a production adapter calls Supabase Edge Functions, but the production build must not silently fall back to Manus.

## 4. `server/` audit and classification

### 4.1 Must move to Supabase Edge Functions (Group A)

| Module/route                                                                                          | Why it exists                                                                   | Migration target                                                                       | Required invariants                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/_core/index.ts:48-86` attachment GET/POST routes                                              | Validates headers, raw Blob, attachment access, storage write and error mapping | Edge Function(s) for upload/download, or signed upload plus a narrow finalize function | Request remains independent of attachment; READY only after storage and metadata acknowledgement; private bucket; idempotent `client_attachment_id`; sanitized errors |
| `server/routers.ts` public tracking router                                                            | Public Case ID/token lookup and attachment metadata/download query              | Public tracking Edge Function or safe RPC/view endpoint                                | Return only public-safe status; wrong token denied; no PII/storage path; lifecycle mapping preserved                                                                  |
| `server/routers.ts` staff procedures                                                                  | Staff status and future operations authorization                                | Supabase Auth + RLS for reads; Edge Functions for privileged multi-row mutations       | `user_profiles.role_code`, `zone_id`, active status, admin/commander override, audit and reason                                                                       |
| `server/_core/oauth.ts` and `server/_core/sdk.ts`                                                     | Manus OAuth callback, token exchange, cookie session                            | Remove from production path; Supabase Auth redirect for staff                          | No Manus role used for production authorization; no Manus callback in Pages deployment                                                                                |
| `server/_core/storageProxy.ts`                                                                        | Forge storage proxy and 307 signed redirect                                     | Remove; use Supabase Storage signed URLs                                               | No Forge secret or storage path leak; private bucket policy remains                                                                                                   |
| `server/_core/map.ts` if retained                                                                     | Manus Forge map proxy                                                           | Replace with provider-restricted public key or Supabase/edge proxy                     | CORS/origin restriction; no privileged Forge key in bundle                                                                                                            |
| `server/_core/notification.ts`, `dataApi.ts`, `imageGeneration.ts`, `llm.ts`, `voiceTranscription.ts` | Manus built-in service integrations from template                               | Keep out of emergency production path or move to separately secured Edge Functions     | Do not include service keys in Pages; document as dev-only/deferred unless Blueprint requires them                                                                    |

### 4.2 Must remain PostgreSQL RPC/Function (Group B)

| Current contract                                              | Evidence                                                                                           | Target                                                                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `server/intake.ts` public submit                              | Calls the atomic Supabase function and returns Case ID/token acknowledgement                       | Keep atomic transaction in PostgreSQL RPC; expose through Edge Function or a carefully secured Supabase RPC call                   |
| `supabase/migrations/20260820000004_public_intake_atomic.sql` | Request, contact, people summary and success audit are written in one database transaction         | System of Record contract; do not replace with multiple REST inserts                                                               |
| `client_request_id` idempotency                               | Unique constraint and concurrent integration tests already exist                                   | Keep unique conflict path and return original Case ID without inventing a new token                                                |
| Public tracking lifecycle mapping                             | `server/tracking.ts` derives REVIEWING/ASSIGNED/EN_ROUTE/ON_SCENE/RESOLVED from incidents/missions | Move SQL-safe status projection to RPC/view or Edge Function query; keep public field allowlist                                    |
| Audit semantics                                               | `server/audit.ts`, `server/mutation.ts`, atomic Intake RPC                                         | Keep audit fields and transactional semantics in DB for DB mutations; document external storage post-failure audit separately      |
| Staff zone authorization                                      | `server/supabaseStaffAuth.ts` and RLS migrations                                                   | Prefer RLS policies and helper functions as final enforcement; Edge Functions must pass user JWT and never bypass RLS accidentally |

### 4.3 Development-only or removable after migration (Group C)

| Module                                                          | Reason                                                                         | Removal condition                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `server/_core/vite.ts`                                          | Manus/Node dev server integration                                              | Remove from production deployment only after Pages build is independently verified                               |
| `server/_core/index.ts` Express bootstrap                       | Hosts tRPC, OAuth and attachment routes for Manus preview                      | Retain for preview until all Supabase boundaries are live; then mark dev-only or remove from production artifact |
| `server/_core/oauth.ts`, `sdk.ts`, Manus session cookie helpers | Manus-specific identity/session infrastructure                                 | Remove only after Supabase Auth staff flow and preview adapter separation are verified                           |
| `server/db.ts` and Drizzle legacy adapter                       | Template DB boundary with `DATABASE_URL`; current critical data is in Supabase | Remove only after confirming no production route or test depends on it                                           |
| Manus Forge integrations                                        | Template capabilities not required by Blueprint/PRD emergency path             | Keep isolated or delete after dependency scan and owner approval                                                 |
| `server/_core/storageProxy.ts`                                  | Manus Forge storage proxy                                                      | Remove after Supabase Storage signed URL path passes E2E and unreferenced Forge assets are confirmed             |

> **Do not delete Group C modules during this audit.** They are still required by the Manus preview and deleting them before a verified Supabase replacement would violate the instruction in the supplied file.

## 5. Authentication and authorization audit

The current context is hybrid. `server/_core/context.ts:21-34` resolves a Supabase bearer token into a `StaffPrincipal`, but `server/_core/context.ts:36-41` still calls `sdk.authenticateRequest()` and populates a Manus `ctx.user`. `server/_core/trpc.ts` permits some role procedures to use a Manus fallback. This is useful for preview compatibility but does not satisfy the production rule that Manus roles must not authorize production staff actions.

The positive foundation is `server/supabaseStaffAuth.ts`: it resolves `user_profiles(id, role_code, zone_id, active)`, validates allowed roles and supports zone checks. The migration must make that path authoritative in Edge Functions and direct Supabase clients. Supabase Auth redirect URLs must include the GitHub Pages subpath, and staff pages must fail closed when the profile is missing, inactive, has an unsupported role or has no permitted zone.

The public Intake must remain login-free. The frontend must not add a login gate to the citizen flow merely because staff Auth is moved to Supabase.

## 6. Secrets, CORS and storage audit

### 6.1 Secret exposure

The browser Supabase client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only (`client/src/lib/supabase.ts`). That is compatible with GitHub Pages when RLS is correct. Server-only references include `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `JWT_SECRET`, `BUILT_IN_FORGE_API_KEY`, `OAUTH_SERVER_URL` and related Manus values. These must never be injected into the Pages build.

A special risk is `VITE_FRONTEND_FORGE_API_KEY` in `client/src/components/Map.tsx`. Even if intended as a browser key, it is a production-exposed credential and must be restricted to the GitHub Pages origin or removed in favor of a safe public-provider configuration.

Required checks before deployment include scanning the generated `dist/` bundle for forbidden names and secret-like values, reviewing GitHub Actions logs for secret echo, and verifying that only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and explicitly approved public configuration reach the frontend.

### 6.2 CORS and Auth redirect

The current same-origin relative routes avoid explicit CORS only because Manus serves frontend and API together. GitHub Pages changes the origin to `https://aodxx.github.io`; every Edge Function must allow the exact origin and required methods/headers, including `content-type`, `x-case-code`, `x-tracking-token`, `x-client-attachment-id` and `x-file-name` if that header contract is retained. Wildcard CORS is not appropriate for privileged functions.

Auth redirect configuration must include the exact Pages URL and the `/phatthalung-survival/` path. Cookie-based Manus OAuth cannot be assumed to work across the new static-host/API-origin split.

### 6.3 Storage

The current attachment client sends a raw Blob to an Express route. The existing private Supabase bucket and metadata policies are positive foundations, but the production path should use Supabase Storage signed upload/download or an Edge Function that validates the Case ID/token and records metadata. The Request transaction must not depend on attachment success. READY must remain an explicit server acknowledgement, not a local UI state.

## 7. Vite, routing and PWA audit

The current `vite.config.ts` has `root: client`, output `dist/public`, and includes `vite-plugin-manus-runtime`; it does not set `base: "/phatthalung-survival/"`. The current `App.tsx` uses path-based `wouter` routes for `/`, `/intake`, and `/tracking`. GitHub Pages has no Node rewrite fallback, so direct navigation or refresh of `/phatthalung-survival/intake` and `/phatthalung-survival/tracking` will require either a hash router or a Pages SPA fallback strategy.

The manifest currently declares `start_url: "/"` and `scope: "/"`. The service worker caches `"/"` and `"/manifest.webmanifest"`, and its offline fallback returns `caches.match("/")`. These root-relative paths are correct for the current Manus root deployment but incorrect for the required project subpath. They must be generated from the same base constant as Vite and tested after install/reload/offline.

The current development debug collector is intentionally disabled in production by the Vite transform, but the `vite-plugin-manus-runtime` plugin remains in the build configuration. The migration must confirm whether it emits any production runtime dependency; if it does, it must be removed or isolated to development.

## 8. GitHub Actions and deployment audit

The repository-owned `.github/workflows/ci.yml` runs:

```text
checkout → pnpm setup → Node 22 → frozen install → check → lint → test → build
```

It triggers on `main`/`master` pushes and pull requests. It does **not** upload a Pages artifact or call `actions/deploy-pages`. The GitHub API showed a Pages build/deployment workflow named `pages build and deployment`, but that is not an adequate replacement for a repository-owned deterministic workflow because the requested migration explicitly requires a checked-in pipeline with quality gates before deployment.

A future workflow should run on the migration branch and `main` after approval, build only the frontend artifact, set the correct base path, upload `dist/public` with `actions/upload-pages-artifact`, and deploy with `actions/deploy-pages`. It must not run the Node server as the Pages artifact. Supabase Edge Function deployment must be a separate explicit job or owner-controlled workflow with Supabase secrets kept server-side.

The requested GitHub Pages URL was not opened because it was not yet confirmed as configured. The audit therefore does not claim Pages deployment success.

## 9. Migration blockers and priority

| Priority | Blocker                                                             | Evidence                                                                                       | Dependency                                               | Acceptance gate                                                                                  |
| -------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| P0       | Intake and queue still call `/api/trpc`                             | `client/src/main.tsx`, `Intake.tsx`, `QueueRuntime.tsx`                                        | Supabase Edge Function/RPC transport design              | Online, offline, reconnect, atomic acknowledgement, duplicate race and cleanup pass on Pages URL |
| P0       | Attachment upload still calls same-origin Express raw-body route    | `AttachmentUploader.tsx:35-47`                                                                 | Signed upload/finalize boundary and CORS                 | READY, retry, wrong-token denial, authorized download and cleanup pass                           |
| P0       | Vite/PWA root paths incompatible with `/phatthalung-survival/`      | `vite.config.ts`, manifest, service worker                                                     | Base-path strategy and SPA fallback                      | Direct routes, refresh, installable manifest and offline shell pass                              |
| P0       | Manus OAuth remains in production client/server path                | `client/src/const.ts`, `server/_core/oauth.ts`, `context.ts`, `trpc.ts`                        | Supabase Auth staff flow and dev-only adapter separation | Bundle/runtime scan shows no production Manus auth dependency; staff Auth/RLS tests pass         |
| P1       | No checked-in official Pages deploy workflow                        | `.github/workflows/ci.yml` only performs quality/build                                         | Workflow implementation and Pages configuration          | CI quality job gates Pages artifact/deploy; live Pages URL returns 200                           |
| P1       | Forge/Map browser key and Forge service integrations are unresolved | `Map.tsx`, `_core/map.ts`, storage proxy, LLM/media modules                                    | Public key restriction or removal                        | No privileged key in bundle; required map behavior passes                                        |
| P1       | CORS and Auth redirect are not configured for `aodxx.github.io`     | Same-origin preview currently hides this                                                       | Supabase dashboard/Edge Function config                  | Exact-origin preflight and Supabase Auth redirect tests pass                                     |
| P1       | Rate limiting is not present in audited code                        | No `rateLimit`/`throttle` implementation found in server/client search                         | Edge/gateway policy                                      | Abuse tests and operational limits documented                                                    |
| P2       | Template-only Manus integrations remain in server tree              | `_core/llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `notification.ts`, `dataApi.ts` | Product decision and dependency scan                     | Each module marked retained, Edge Function, or removed with tests                                |

## 10. Recommended migration sequence

| Phase | Objective                     | Work                                                                                                                                                   | Definition of done                                                                                                 |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 0     | Freeze and decouple contracts | Keep current Manus preview, create a backend transport interface, snapshot current tests, document production env names                                | Existing preview remains green and client no longer requires importing `AppRouter` in the new production transport |
| 1     | Move public critical paths    | Implement Intake Edge Function/RPC adapter, public tracking function, attachment signed upload/download; preserve database RPC and audit invariants    | Supabase-backed contract tests and real TEST-only integration pass with zero-row cleanup                           |
| 2     | Convert static frontend       | Set Vite base, make router/direct routes Pages-compatible, update manifest/service worker/cache paths, remove production Manus auth/runtime dependency | `pnpm build` output contains only approved public env values and Pages artifact works under subpath                |
| 3     | Add deployment pipeline       | Add official Pages workflow, configure Pages project, Supabase CORS/Auth redirects/secrets, keep Edge Function deploy separate                         | CI gates deploy; Pages URL, direct routes and PWA smoke pass                                                       |
| 4     | Cutover and verify            | Run full online/offline/reconnect/GPS/tracking/attachment/RLS/staff matrix on Pages URL; keep Manus preview rollback available                         | Owner signs off on all success criteria; only then consider disabling Manus production dependency                  |

## 11. OWNER ACTION REQUIRED

The owner must configure GitHub Pages for the repository and confirm the custom project URL, configure Supabase Auth redirect URLs including `https://aodxx.github.io/phatthalung-survival/`, configure exact-origin CORS for Edge Functions, confirm Edge Function secrets and deployment project, and decide whether the map provider will use a restricted public key or a server-side proxy.

No password, service-role key, database password or access token should be sent through chat. Secrets should be entered through the project’s secure secret/settings mechanism or configured directly in GitHub/Supabase settings.

The owner should not disable Manus Hosting or merge the migration branch until the GitHub Pages URL passes the full E2E matrix and rollback readiness is documented.

## 12. Final audit decision

**READY TO START IMPLEMENTATION ON THE MIGRATION BRANCH: YES.** The audit branch exists and the repository has enough evidence to begin contract decoupling.

**READY TO DEPLOY TO GITHUB PAGES: NO.** The current client still depends on Manus-hosted `/api/trpc`, Express attachment routes and Manus OAuth/session paths; base-path/PWA and Pages workflow gaps remain.

**READY TO DISABLE MANUS HOSTING: NO.** Manus preview is still the active runtime for the current API boundary. Disabling it before the Supabase replacements are live would stop Intake acknowledgement, tracking, attachment upload/download and staff procedures.

## References

[1]: https://github.com/aodxx/phatthalung-survival "Source repository"
[2]: https://github.com/aodxx/phatthalung-survival/actions "GitHub Actions"
[3]: https://github.com/aodxx/phatthalung-survival/blob/main/server/_core/index.ts "Current Express/API bootstrap"
[4]: https://github.com/aodxx/phatthalung-survival/blob/main/server/routers.ts "Current tRPC router"
[5]: https://github.com/aodxx/phatthalung-survival/blob/main/server/_core/context.ts "Hybrid Manus/Supabase context"
[6]: https://github.com/aodxx/phatthalung-survival/blob/main/client/src/main.tsx "Current client tRPC transport"
[7]: https://github.com/aodxx/phatthalung-survival/blob/main/client/src/pages/Intake.tsx "Citizen Intake client"
[8]: https://github.com/aodxx/phatthalung-survival/blob/main/client/src/components/AttachmentUploader.tsx "Attachment client transport"
[9]: https://github.com/aodxx/phatthalung-survival/blob/main/vite.config.ts "Vite configuration"
[10]: https://github.com/aodxx/phatthalung-survival/blob/main/.github/workflows/ci.yml "Current CI workflow"
