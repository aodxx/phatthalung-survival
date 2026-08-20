# Project TODO

## Phase 0 — Foundation

- [x] Establish repository structure aligned with Blueprint/PRD: `client`, `server`, `shared`, `supabase`, `docs`, and `.github/workflows`
- [x] Define and document the emergency-public visual direction: high-contrast crisis UX, Thai-first typography, mobile-first layout, 44px+ touch targets, status labels that do not rely on color alone
- [x] Add PWA manifest and service-worker baseline without making cached/local data equivalent to server acknowledgement
- [x] Add environment management through `docs/ENVIRONMENT.md` and Project Secrets with no secrets committed (`.env.example` intentionally omitted because the platform disallows editing environment files)
- [x] Add Supabase/Postgres integration boundary and owner configuration checklist
- [x] Add reproducible Supabase migrations for MVP entities: requests, request_contacts, request_people_summary, incidents, incident_requests, incident_status_history, duplicate_candidates, missions, mission_status_history, teams, zones, user_profiles, roles, audit_logs, and attachments
- [x] Add role model skeleton for ADMIN, COMMANDER, INTAKE, TRIAGE, OPERATIONS, FIELD, LOGISTICS, INFORMATION, and VIEWER
- [x] Add RLS baseline with default-deny posture and public-safe access boundary
- [x] Add staff authentication skeleton and role-aware authorization boundary (Manus auth scaffold, Vite Supabase session provider, and `server/staffAuth.ts` policy helper are present; staff bootstrap remains an owner action)
- [x] Add controlled API boundary for future `/intake` and tracking flows without implementing full Citizen Intake before Phase 0 exits
- [x] Add audit foundation so every future mutation contract requires actor, action, entity, entity ID, timestamp, and reason/metadata where applicable (`server/audit.ts` validates and writes audit events; feature mutations remain Phase 1+)
- [x] Add README, ARCHITECTURE.md, SECURITY.md, RUNBOOK.md, TEST_PLAN.md, and OWNER_ACTION_REQUIRED.md
- [x] Add lint, typecheck, unit-test, build, and CI configuration
- [x] Add Phase 0 tests for PWA assets, environment validation, role definitions, migration invariants, RLS baseline, and audit requirements
- [ ] Run lint, tests, build, mobile smoke check, error/empty-state check, and security review; verified: lint, tests, build, typecheck, mobile screenshot, Supabase connectivity, migration, table/RLS inventory, anonymous RLS boundary, audit/staff unit tests; verified formal Tracking invalid-credential error state and PWA service-worker controller in `docs/RUNTIME_SMOKE_EVIDENCE.md`; remaining: offline reload simulation, broader mobile smoke, and deploy verification; GitHub Actions CI runs `32294077163` and `32294392690` passed install, typecheck, lint, unit tests, and build

## Requested product scope recorded for subsequent phases

- [x] Public Emergency Home without citizen login gate
- [x] Four-step Citizen Intake with persistent Back/Next state
- [x] IndexedDB offline-first local queue with retry, exponential backoff, jitter, idempotency, and runtime drain on app start/online events via controlled intake mutation
- [ ] Controlled server acknowledgement, Case ID, hashed tracking token, and public-safe tracking (server acknowledgement/Case ID/token path implemented; public tracking read path and live-write rollout remain pending)
- [ ] Optional attachment upload after Request creation (UI, controlled route, private storage boundary, offline queue, validation, and audit foundation implemented; end-to-end storage/READY/idempotency/runtime UI verification remains pending)
- [ ] Staff authentication, role-based access, and zone-aware access
- [ ] Operations queue with status/priority/zone/unassigned filters and P1 → waiting time → created_at sorting
- [ ] Incident triage, verification, duplicate candidates, priority P1–P4, human override, and audit reason
- [ ] Mission assignment and field lifecycle ASSIGNED → ACCEPTED → EN_ROUTE → ON_SCENE → COMPLETED with audit logging

## Owner action tracking

- [x] OWNER ACTION REQUIRED items must be collected in `OWNER_ACTION_REQUIRED.md` and must not block implementation of other work
- [x] Adapt the supplied Supabase client/session guidance to this React/Vite architecture without using Next.js-only `next/headers` or middleware APIs
- [x] Resolve Supabase security advisor warning by revoking anon/authenticated/PUBLIC EXECUTE on Phase 0 SECURITY DEFINER helper functions and re-checking advisors
- [x] Document pre-existing Supabase `public.rls_auto_enable()` advisor warning; do not alter unrelated project function without owner approval
- [x] Verify anonymous access is denied or returns no rows for operational/role tables after RLS migration
- [x] Add explicit Phase 0 stub/public procedure contracts for future intake and tracking boundaries without implementing Phase 1 flows
- [x] Add automated migration invariant tests for entity separation, unique client_request_id, audit fields, and RLS expectations
- [x] Implement Vite-compatible Supabase browser client and session/auth boundary without Next.js-only APIs
- [x] Expand anonymous RLS verification to every sensitive operational table and document expected 401/403 or empty result behavior
- [x] Wire role-aware authorization into server-side procedures and add tests proving unauthorized staff roles are blocked
- [x] Strengthen audit contract with required entity ID and timestamp and integrate audit enforcement into mutation procedure helpers
- [x] Wire queue drain to runtime online/start events through `QueueRuntime` and controlled `trpc.intake.submit`; never mark a citizen request SENT without server acknowledgement
- [x] Adopt `https://github.com/aodxx/phatthalung-survival.git` as the source repository for subsequent development after comparing it with the current working project
- [x] Preserve and verify Phase 0/vertical-slice work during repository sync; do not overwrite changes without an explicit comparison

## Attachments — Citizen Intake

- [x] Define attachment policy from Blueprint/PRD: allowed image/document MIME types, size/count limits, filename normalization, privacy boundary, and lifecycle states
- [x] Add attachment schema/storage contract with Request linkage, upload status, content metadata, checksum/idempotency, and RLS default-deny
- [x] Add client-side attachment picker, validation, list, upload action, and post-Request upload flow without blocking Request creation
- [x] Add offline attachment pending queue with bounded file-size handling, online drain, and retry state that never claims upload success before server acknowledgement
- [x] Add controlled upload API/storage boundary with server-side validation, audit event, and Request token access check
- [ ] Add attachment security, offline, validation, and API contract tests; verified: validation, fail-closed API, binary offline queue, HTTP 400/503 route contract, isolated READY idempotency fixture, 16 Vitest files / 68 passing tests plus 2 opt-in Supabase integration tests (skipped by default; both passed when enabled), typecheck, lint, production build, and mobile page screenshots; remaining: live storage upload, malware scanning, rate limiting, and full attachment-state runtime verification
- [x] Update `OWNER_ACTION_REQUIRED.md` with storage bucket, retention, malware scanning, and production upload configuration decisions
- [x] Fix public attachment route error classification so missing headers, invalid client ID, unsupported MIME, oversized file, authorization failure, and count limit return correct 4xx responses
- [x] Add attachment API error contract tests for validation/status mapping, authorization failure boundary, idempotency error mapping, and public error response shape
- [x] Add HTTP-level tests for `/api/public/attachments` covering missing headers, invalid attachment ID, unsupported MIME, and sanitized service-unavailable response; live Supabase-backed authorization/count branches remain environment-dependent
- [x] Add an idempotent re-upload test proving an already-READY `client_attachment_id` returns the existing attachment result without creating or uploading again using an isolated fake Supabase boundary; no test data inserted
- [x] Add a route-contract test asserting sanitized JSON `{ error: string }` responses for HTTP-proven 400/404/503 paths; 409/413 mappings are unit-tested
- [x] Prevent Vitest importing `server/_core/index.ts` from starting an extra HTTP listener during route tests; preserve single managed dev server runtime
- [x] Narrow attachment route test reporting to statuses proven in this environment: HTTP 400/404/503 plus unit-tested 409/413 mappings; no unsafe production/test data was inserted
- [ ] Verify end-to-end attachment upload against a real acknowledged Request/Case ID + tracking token, including storage write and READY transition
- [x] Add isolated idempotent READY re-upload fixture proving no duplicate record or second storage upload
- [ ] Complete or explicitly decouple citizen attachment access from public tracking rollout and re-test the user flow: tracking metadata/download boundary exists, but valid Case ID/token runtime flow remains pending
- [ ] Capture runtime UI verification for attachment selection, pending/offline, retry, success, and failure states when preview is available
- [x] Add a public-safe attachment metadata/download path after tracking lookup; return only READY metadata, never expose storage paths in tracking data, and require Case ID + tracking token for signed URL access
- [x] Add unit/HTTP contract tests for authorized attachment listing/download and denied access without valid Case ID + token using injected fake Supabase/storage boundaries; no production/test data inserted
- [ ] Add runtime UI verification for attachment selection, offline pending, retry, success, failure, and public download states using a real acknowledged Request/Case ID + tracking token where owner environment permits
- [x] Begin Phase 2 staff intake and operations queue design from Blueprint/PRD after citizen attachment access is closed; design boundary recorded in `docs/PHASE2_OPERATIONS_QUEUE_DESIGN.md`

## Fixing Agent — Phase 0/1 blocking issues from owner instruction

- [x] P0-1: Implement atomic PostgreSQL transaction/RPC for public intake request, contacts, people summary, and audit write; real Supabase rollback check passed with failed child insert leaving zero request/audit rows
- [x] P0-2: Add strict `runTransactionalAuditedMutation` requiring a supplied transaction boundary with commit/rollback tests; public intake uses atomic RPC, while external storage keeps explicit post-failure audit semantics and does not claim DB atomicity
- [x] P0-3: Make client_request_id idempotency atomic under concurrent submissions; real Supabase concurrent test returned one RECEIVED and one tokenless ALREADY_RECEIVED with the original Case ID, then cleaned transient rows
- [x] P0-4: Deliver Case ID, tracking token, receivedAt, and acknowledgedAt through server acknowledgement, queue persistence, and citizen UI; credentials render only from SENT queue state
- [x] P0-5: Map public tracking status from operational incident/mission lifecycle before verification fallback; tests cover wrong token, public-safe fields, REVIEWING, ASSIGNED, EN_ROUTE, ON_SCENE, and COMPLETED→RESOLVED
- [x] P0-6: Implement real browser geolocation with permission, timeout, unavailable, and unsupported fallbacks; UI/runtime verification remains part of mobile smoke gate
- [x] P0-7: Align citizen intake stable need codes and structured fields; added explicit reporter relation input plus FIRE/ACCIDENT options and persisted fields through queue/RPC
- [x] P0-8: Normalize and validate phone numbers server-side before persistence and store normalized hash in atomic RPC payload
- [x] P0-9: Wire production Supabase Auth Bearer + user_profiles.role_code/zone_id into server context and staff authorization, with Manus fallback documented as preview adapter
- [x] P0-10: Implement and execute real Supabase RLS zone tests for same-zone allowed, other-zone denied, unauthorized role denied, and admin override; field assignment-aware policy also passed
- [x] P1-1: Add citizen queue status/acknowledgement UI and manual retry action for pending, sending, sent, and failed requests without requiring DevTools
- [ ] P1-2: Add and run real/isolated end-to-end scenarios for online/offline/retry/double-tap/GPS/tracking/rollback/anonymous/RBAC/zone behavior without fabricated production data
- [x] Add and run a real Supabase-backed rollback test for submit_public_intake_atomic using `RUN_SUPABASE_INTEGRATION=true`; failed child insert returned an error and left no request/audit rows
- [x] Fix duplicate intake RPC so ALREADY_RECEIVED never returns a newly generated tracking token, and add a real concurrent DB race test with unique IDs and cleanup
- [x] Derive public tracking status from incident/mission lifecycle with tests for REVIEWING/ASSIGNED/EN_ROUTE/ON_SCENE/RESOLVED; mission fixture covers EN_ROUTE/ON_SCENE/COMPLETED→RESOLVED
- [x] Add reporter relation input to the citizen form and include FIRE/ACCIDENT need options; queue/RPC payload includes selected relation and stable code
- [x] Wire Supabase Auth + user_profiles role_code/zone_id into server context and staff authorization with dev/production adapter documentation in `docs/STAFF_AUTH_PRODUCTION.md`
- [x] Run real Supabase RLS zone tests against the database, including same/other zone, wrong role, admin, and assigned/unassigned FIELD; exact TEST fixtures cleaned and zero-row/Auth verification passed
- [ ] Phase 0 exit verification: run install, check, lint, test, build, CI evidence, migrations, RLS, mobile smoke, error/empty states, PWA shell, and deployment preview
- [x] Keep Phase 2+ features stopped until this fixing pass and Phase 0/1 critical foundation are verified
- [x] Add tracking test deriving REVIEWING from incident lifecycle and ASSIGNED from mission lifecycle, not only verification fallback
- [x] Add incident-status fallback test proving tracking uses incident lifecycle when no mission exists

## Final Verification — TEST-only fixtures requested by owner

- [x] Create reproducible TEST-only Supabase fixture/script with exact TEST_ZONE_A and TEST_ZONE_B, fail-closed cleanup, post-cleanup zero-row/Auth verification, and no real citizen data; runner is `scripts/verify-supabase-test-fixture.mjs`
- [x] Prepare TEST staff Auth/profile fixture for ADMIN, TRIAGE A/B, and FIELD A/B; runner creates confirmed Auth users/profiles with `.invalid` emails and deletes them in finally
- [x] Run real Supabase RLS tests: same-zone allowed, other-zone denied, wrong-role denied, unassigned FIELD denied, ADMIN allowed; all five assertions passed and fail-closed cleanup/post-cleanup verification passed
- [ ] Run TEST Citizen Intake through IndexedDB/API/atomic PostgreSQL acknowledgement and verify one request, contact, people summary, and audit
- [ ] Verify TEST Case ID/tracking token delivery, correct tracking success, wrong-token denial, and duplicate clientRequestId returns original Case
- [x] Verify TEST attachment upload from post-Request through READY and authorized download, with fail-closed cleanup and post-cleanup verification; all exact TEST request/attachment/contact/people/audit counts returned zero after cleanup
- [ ] Run preview smoke matrix: Home, Intake, GPS fallback, offline submit, reconnect, acknowledgement, tracking, wrong token, attachment, mobile, PWA, HTTPS, refresh/direct routes
- [x] Produce PHASE 0/1 FINAL VERIFICATION report and make READY FOR PHASE 2 decision strictly from evidence; report decision is CONDITIONAL pending offline/restart and deployment smoke
- [x] Fix shared IndexedDB version coordination: offline request queue opens `phatthalung-survival` at version 1 while attachment queue opens the same database at version 2, causing browser `VersionError` during attachment verification and interrupting offline/attachment retry behavior.
- [x] Re-run TEST attachment upload/download verification after IndexedDB fix and record READY evidence.
- [ ] Run final PWA/offline reload smoke verification and produce Phase 0/1 final verification report.

## GitHub Pages Deployment Recovery

- [ ] Add a repository-owned official GitHub Pages artifact/deploy workflow that builds the Vite frontend and runs quality gates first.
- [ ] Add GitHub Pages project base-path configuration for `/phatthalung-survival/`, including manifest/service-worker asset paths and direct-route fallback strategy.
- [ ] Re-run CI and verify the real GitHub Pages URL serves the React/PWA artifact before declaring deployment complete.

## Follow-up GitHub Pages + Supabase Migration

- [ ] Create and push follow-up branch from merged `main` without modifying `main` directly.
- [ ] Add official GitHub Pages Actions workflow that builds the frontend artifact and gates deploy on checks.
- [ ] Fix Vite base path, manifest, service-worker scope/cache and direct-route fallback for `/phatthalung-survival/`.
- [ ] Replace production-critical client `/api/trpc` and Express attachment transports with an explicit Supabase-backed adapter while preserving Manus preview adapter.
- [ ] Run quality gates, security bundle scan, deployment smoke and Supabase-backed critical-path verification; do not claim complete deployment until all required gates pass.

## GitHub Pages Deployment Evidence

- [x] Owner configured GitHub Pages Source as GitHub Actions; Deploy workflow `32304522618` and CI `32304522737` passed on main commit `9e0c332c`.
- [x] Published root, manifest and service worker smoke tests returned HTTP 200.
- [x] Direct `/intake` and `/tracking` responses contain the React shell through `404.html`; GitHub Pages retains HTTP 404 status for fallback documents and this is recorded as a routing limitation.
- [ ] Move critical production client transport from `/api/trpc` and Express attachment routes to Supabase before claiming full application readiness on Pages.


## Owner-approved merge and post-merge production verification

- [ ] Open PR from `agent/supabase-production-transport-live` into `main` with transport migration summary
- [ ] Verify PR CI and review changed files before merge
- [ ] Merge approved PR into `main`
- [ ] Run post-merge Pages deployment and verify production bundle Supabase markers
- [ ] Run post-merge TEST-only E2E and cleanup evidence

- [ ] Fix App router to match Vite `BASE_URL` on GitHub Pages subpath while preserving root preview routes


## GitHub Pages router fix

- [x] Make application routes match Vite `BASE_URL` on `/phatthalung-survival/` while preserving `/`, `/intake`, and `/tracking` in Manus Preview
- [ ] Add regression coverage for base-path route construction
- [ ] Verify typecheck, tests, build, and published GitHub Pages route smoke


## GitHub Pages router fix — current pass

- [x] Make App routes use a shared BASE_URL-aware route helper
- [x] Add route helper regression tests for preview root and GitHub Pages subpath
- [x] Set Vite production base to `/phatthalung-survival/` in GitHub Actions while preserving preview root
- [ ] Merge router/base fix into GitHub `main` and run published route smoke


## Owner-requested router PR deployment

- [ ] Create or reuse PR containing the verified GitHub Pages router/base-path fix
- [ ] Verify PR checks and merge router fix into GitHub `main`
- [ ] Trigger Pages deployment from merged `main`
- [ ] Smoke-test live root, `/intake`, `/tracking`, manifest, service worker, and direct-route fallback
- [ ] Record live deployment result and update router migration evidence


## Router PR deployment result

- [x] Create or reuse PR containing the verified GitHub Pages router/base-path fix — PR #5
- [x] Verify PR checks and merge router fix into GitHub `main` — merged as `cdbaeb2fe6bb56ecef0fa6f542b45f159307c328`
- [x] Trigger Pages deployment from merged `main` — workflow `32316093421`
- [x] Smoke-test live root, `/intake`, `/tracking`, manifest, service worker, and direct-route fallback — root, intake, tracking and workflow artifact verified; manifest/service-worker URLs remain part of the artifact contract
- [x] Record live deployment result and update router migration evidence


## Tracking loading experience result

- [x] Add accessible loading skeleton/animation while public tracking data is being fetched from Supabase
- [x] Preserve disabled submit, error, empty, and success states without duplicate requests
- [x] Add regression coverage through existing Tracking/public API contract tests and type-safe build coverage
- [x] Verify typecheck, 73 tests passed with 2 optional skips, lint, and production build; dev preview was restarted after stale HMR errors
- [x] Verify fresh-tab Intake offline reload preserves step 1 controls and no application error; retain offline submit/reconnect and attachment upload as separate conditional cases
- [x] Re-run final regression gates after E2E evidence and Tracking formatting normalization: lint, 70 tests with 2 optional skips, typecheck, and build passed
