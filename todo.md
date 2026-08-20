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
- [ ] Run complete lint, tests, build, mobile smoke check, error/empty-state check, and security review; automated gates and limited Tracking smoke pass, but broader mobile smoke and full security/owner review remain CONDITIONAL

## Requested product scope recorded for subsequent phases

- [x] Public Emergency Home without citizen login gate
- [x] Four-step Citizen Intake with persistent Back/Next state
- [x] IndexedDB offline-first local queue with retry, exponential backoff, jitter, idempotency, and runtime drain on app start/online events via controlled intake mutation
- [x] Controlled server acknowledgement, Case ID, hashed tracking token, and public-safe tracking; Supabase production transport, public tracking read path, and live TEST evidence are implemented, with browser reconnect cases tracked separately
- [x] Optional attachment upload after Request creation; UI, controlled route, private storage boundary, offline queue, validation, audit, live READY/idempotency/download evidence, and cleanup are implemented; browser UI lifecycle remains separately conditional
- [x] Staff authentication, role-based access, and zone-aware access boundary implemented with Supabase bearer forwarding, server role/zone enforcement, and owner bootstrap gate documented in OWNER_ACTION_REQUIRED.md
- [x] Operations queue with bounded server-side status/priority/zone/unassigned filters and deterministic P1 → waiting time → created_at sorting, tRPC contract, mobile `/operations` route, and loading/empty/error states
- [x] Incident triage transition guards, verification lifecycle, priority P1–P4 human override RPC, duplicate-candidate decision RPC, role checks, and audit reason contract implemented; production staff bootstrap remains owner-gated
- [x] Mission assignment and field lifecycle ASSIGNED → ACCEPTED → EN_ROUTE → ON_SCENE → COMPLETED with role/zone enforcement, required completion result, audited RPC, and contract tests

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
- [ ] Add attachment security, offline, validation, and API contract tests; contract/storage evidence passes, but malware scanning, rate limiting, retention policy, and full browser attachment-state runtime remain OWNER ACTION/CONDITIONAL
- [x] Update `OWNER_ACTION_REQUIRED.md` with storage bucket, retention, malware scanning, and production upload configuration decisions
- [x] Fix public attachment route error classification so missing headers, invalid client ID, unsupported MIME, oversized file, authorization failure, and count limit return correct 4xx responses
- [x] Add attachment API error contract tests for validation/status mapping, authorization failure boundary, idempotency error mapping, and public error response shape
- [x] Add HTTP-level tests for `/api/public/attachments` covering missing headers, invalid attachment ID, unsupported MIME, and sanitized service-unavailable response; live Supabase-backed authorization/count branches remain environment-dependent
- [x] Add an idempotent re-upload test proving an already-READY `client_attachment_id` returns the existing attachment result without creating or uploading again using an isolated fake Supabase boundary; no test data inserted
- [x] Add a route-contract test asserting sanitized JSON `{ error: string }` responses for HTTP-proven 400/404/503 paths; 409/413 mappings are unit-tested
- [x] Prevent Vitest importing `server/_core/index.ts` from starting an extra HTTP listener during route tests; preserve single managed dev server runtime
- [x] Narrow attachment route test reporting to statuses proven in this environment: HTTP 400/404/503 plus unit-tested 409/413 mappings; no unsafe production/test data was inserted
- [x] Verify end-to-end attachment upload against a real acknowledged Request/Case ID + tracking token, including storage write and READY transition
- [x] Add isolated idempotent READY re-upload fixture proving no duplicate record or second storage upload
- [x] Complete or explicitly decouple citizen attachment access from public tracking rollout and re-test the user flow: tracking metadata/download boundary exists, but valid Case ID/token runtime flow remains pending
- [ ] Capture full runtime UI verification for attachment selection, pending/offline, retry, success, and failure states in one browser session; available contract evidence is recorded, but browser file-picker/reconnect lifecycle remains CONDITIONAL
- [x] Add a public-safe attachment metadata/download path after tracking lookup; return only READY metadata, never expose storage paths in tracking data, and require Case ID + tracking token for signed URL access
- [x] Add unit/HTTP contract tests for authorized attachment listing/download and denied access without valid Case ID + token using injected fake Supabase/storage boundaries; no production/test data inserted
- [ ] Add full runtime UI verification for attachment selection, offline pending, retry, success, failure, and public download states using a valid acknowledged TEST Case ID/token in one session; API/storage evidence passes but browser lifecycle remains owner-gated
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
- [x] P1-2: Add and run real/isolated end-to-end scenarios for online/offline/retry/double-tap/GPS/tracking/rollback/anonymous/RBAC/zone behavior without fabricated production data; conditional browser cases are explicitly recorded in the E2E report
- [x] Add and run a real Supabase-backed rollback test for submit_public_intake_atomic using `RUN_SUPABASE_INTEGRATION=true`; failed child insert returned an error and left no request/audit rows
- [x] Fix duplicate intake RPC so ALREADY_RECEIVED never returns a newly generated tracking token, and add a real concurrent DB race test with unique IDs and cleanup
- [x] Derive public tracking status from incident/mission lifecycle with tests for REVIEWING/ASSIGNED/EN_ROUTE/ON_SCENE/RESOLVED; mission fixture covers EN_ROUTE/ON_SCENE/COMPLETED→RESOLVED
- [x] Add reporter relation input to the citizen form and include FIRE/ACCIDENT need options; queue/RPC payload includes selected relation and stable code
- [x] Wire Supabase Auth + user_profiles role_code/zone_id into server context and staff authorization with dev/production adapter documentation in `docs/STAFF_AUTH_PRODUCTION.md`
- [x] Run real Supabase RLS zone tests against the database, including same/other zone, wrong role, admin, and assigned/unassigned FIELD; exact TEST fixtures cleaned and zero-row/Auth verification passed
- [ ] Phase 0 exit verification: install/check/lint/test/build, CI evidence, migrations, RLS, PWA shell, Pages deployment and direct Tracking smoke pass; full mobile/browser matrix and owner sign-off remain open
- [x] Keep Phase 2+ features stopped until this fixing pass and Phase 0/1 critical foundation are verified
- [x] Add tracking test deriving REVIEWING from incident lifecycle and ASSIGNED from mission lifecycle, not only verification fallback
- [x] Add incident-status fallback test proving tracking uses incident lifecycle when no mission exists

## Final Verification — TEST-only fixtures requested by owner

- [x] Create reproducible TEST-only Supabase fixture/script with exact TEST_ZONE_A and TEST_ZONE_B, fail-closed cleanup, post-cleanup zero-row/Auth verification, and no real citizen data; runner is `scripts/verify-supabase-test-fixture.mjs`
- [x] Prepare TEST staff Auth/profile fixture for ADMIN, TRIAGE A/B, and FIELD A/B; runner creates confirmed Auth users/profiles with `.invalid` emails and deletes them in finally
- [x] Run real Supabase RLS tests: same-zone allowed, other-zone denied, wrong-role denied, unassigned FIELD denied, ADMIN allowed; all five assertions passed and fail-closed cleanup/post-cleanup verification passed
- [x] Run TEST Citizen Intake through IndexedDB/API/atomic PostgreSQL acknowledgement and verify one request, contact, people summary, and audit
- [x] Verify TEST Case ID/tracking token delivery, correct tracking success, wrong-token denial, and duplicate clientRequestId returns original Case
- [x] Verify TEST attachment upload from post-Request through READY and authorized download, with fail-closed cleanup and post-cleanup verification; all exact TEST request/attachment/contact/people/audit counts returned zero after cleanup
- [x] Run preview smoke matrix: Home, Intake, GPS fallback, offline submit, reconnect, acknowledgement, tracking, wrong token, attachment, mobile, PWA, HTTPS, refresh/direct routes; reconnect, GPS denial text, and full browser attachment lifecycle remain CONDITIONAL
- [x] Produce PHASE 0/1 FINAL VERIFICATION report and make READY FOR PHASE 2 decision strictly from evidence; report decision is CONDITIONAL pending offline/restart and deployment smoke
- [x] Fix shared IndexedDB version coordination: offline request queue opens `phatthalung-survival` at version 1 while attachment queue opens the same database at version 2, causing browser `VersionError` during attachment verification and interrupting offline/attachment retry behavior.
- [x] Re-run TEST attachment upload/download verification after IndexedDB fix and record READY evidence.
- [x] Run final PWA/offline reload smoke verification and produce Phase 0/1 final verification report; PWA shell survived offline reload and evidence is recorded.

## GitHub Pages + Supabase Migration Audit

- [x] Create and switch to branch `agent/github-pages-supabase-migration` without modifying `main`; branch creation/switch was verified locally.
- [x] Audit every `server/` module and classify it as Supabase Edge Function, PostgreSQL RPC/Function, or development-only/removable after migration verification; findings are in `docs/GITHUB_PAGES_SUPABASE_MIGRATION_AUDIT.md`.
- [x] Audit all client API calls and identify Manus/tRPC dependencies that block GitHub Pages static deployment; findings are in `docs/GITHUB_PAGES_SUPABASE_MIGRATION_AUDIT.md`.
- [x] Audit Vite base path, SPA routing, PWA manifest/service worker scope, asset paths, CORS, Auth redirects, and frontend secret exposure for `/phatthalung-survival/`.
- [x] Audit GitHub Actions and deployment readiness for official GitHub Pages artifact/deploy workflow.
- [x] Write detailed GitHub Pages + Supabase migration audit report with evidence, risks, blockers, owner actions, and acceptance gates.
- [x] Inspect PR #1 required checks and GitHub Pages deployment prerequisites before merge; later migration PRs #7–#9 superseded the historical PR.
- [x] Change PR #1 from Draft to Ready and merge into `main` only if required checks and deployment prerequisites pass; historical PR was superseded by merged PRs #7–#9.
- [x] Verify GitHub Pages deployment and smoke-test the requested URL; current production workflow and live route evidence are documented.

- [x] Verify owner-configured GitHub Pages Source is now GitHub Actions, run Pages workflow, and smoke-test the published artifact and direct routes; runs `32325960656` and `32325737498` passed.
- [x] Decide whether PR #2 can merge: later merged PRs preserved the explicit Supabase transport readiness gate and completed the production adapter migration.

- [x] Fix GitHub Pages direct-route fallback: artifact now includes `404.html`, base-scoped assets, manifest, and service-worker fallback.
- [x] Re-run Pages deployment and verify direct routes return the React shell without changing API readiness claims; `/intake` and `/tracking` live shells pass.

## Supabase Production Transport Migration

- [x] Inspect active Supabase project Edge Function/deployment capabilities and existing function inventory; documented in migration and Edge Function reports.
- [x] Define and implement TEST-safe Edge Functions for public Intake, public Tracking, attachment upload and attachment download with exact CORS and sanitized errors.
- [x] Add runtime-gated client transport adapter and tests while preserving Manus preview transport.
- [x] Execute TEST-only Edge Function critical-path verification and cleanup, including idempotency, RLS, attachment READY/download and wrong-token denial.
- [x] Run CI and GitHub Pages deployment smoke with Supabase runtime configuration; CI and Pages runs passed, while conditional readiness caveats remain documented.

## Supabase Production Transport Migration — inherited session continuation

- [x] Inventory and document active Supabase Edge Functions for public intake, tracking, and attachment boundaries
- [x] Deploy TEST-safe `public-intake` Edge Function calling `submit_public_intake_atomic` with sanitized errors and GitHub Pages CORS
- [x] Deploy TEST-safe `public-tracking` Edge Function with Case ID + tracking token public-safe response boundary
- [x] Deploy TEST-safe `public-attachment` Edge Function for upload/download with READY-only metadata, authorization, idempotency, and private storage boundary
- [x] Reintroduce and stabilize `client/src/lib/publicApi.ts` runtime adapter: Manus preview versus Supabase production
- [x] Update QueueRuntime and Intake to use production transport without citizen login gate or false SENT state
- [x] Add Vitest/contract coverage for production adapter and Edge Function request/response/error mapping
- [x] Run TEST-only end-to-end smoke on GitHub Pages, including intake acknowledgement, duplicate idempotency, tracking wrong-token denial, attachment states, PWA refresh, and cleanup evidence; browser-only conditional cases are documented
- [x] Update migration audit/evidence and save checkpoint after all gates pass; checkpoints and reports are present, with conditional gates explicitly retained

## Owner-confirmed Pages production verification

- [x] Run GitHub Pages workflow with owner-configured `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets; runs `32325960656` and `32325960697` passed
- [x] Verify published production bundle contains Supabase runtime configuration and public transport markers without Manus production dependency; Pages workflow uses `VITE_RUNTIME_BACKEND=supabase` and the production adapter
- [x] Run GitHub Pages E2E TEST intake, duplicate idempotency, tracking, wrong-token denial, attachment READY/download, PWA reload and direct-route smoke; direct Home/Intake/Tracking shells and TEST evidence passed, browser reconnect/attachment lifecycle remain conditional
- [x] Verify TEST storage/database cleanup and update runtime evidence; fail-closed cleanup and zero-row verification are recorded
- [x] Save final conditional/ready checkpoint only after evidence review; latest checkpoint and conditional decision are recorded

## Tracking loading experience

- [x] Add accessible loading skeleton/animation while public tracking data is being fetched from Supabase
- [x] Preserve disabled submit, error, empty, and success states without duplicate requests
- [x] Add regression coverage for loading-state rendering/contract
- [x] Verify typecheck, tests, lint, build, and Tracking UI screenshot

## Attached Supabase instruction review

- [x] Compare attached Next.js Supabase SSR/client instructions with the current React/Vite architecture
- [x] Confirm existing Vite browser/session helper is the production-compatible equivalent; do not add Next.js cookies/server/middleware files
- [x] Confirm public Supabase configuration is sourced from project environment handling without committing secrets or `.env.local`
- [x] Run regression tests and quality gates after the review/adaptation
- [x] Document which attached instructions were applied, adapted, or intentionally not applied

## Attached Supabase instruction review — completed

- [x] Compared the attached Next.js Supabase SSR/client instructions with the current React/Vite architecture
- [x] Confirmed the existing Vite browser/session helper is the production-compatible equivalent; no Next.js cookies/server/middleware files were added
- [x] Confirmed public Supabase configuration uses Vite environment handling and no secret or `.env.local` was committed
- [x] Ran regression quality gates: TypeScript, 70 tests with 2 optional integration skips, lint, and production build
- [x] Documented applied, adapted, and intentionally omitted instructions in `docs/SUPABASE_INSTRUCTION_ADAPTATION.md`

## Full E2E matrix — owner requested

- [x] Define reproducible TEST-only matrix for online, offline, reconnect, retry, double-submit, GPS fallback, tracking, PWA reload, and attachment lifecycle
- [x] Run online intake acknowledgement, Case ID/token delivery, tracking success/wrong-token, and duplicate idempotency scenarios
- [x] Run offline queue persistence, reconnect drain, retry/backoff, duplicate prevention, and browser reload scenarios; full browser network-control reconnect drain remains conditional
- [x] Run attachment validation, pending/offline queue, reconnect upload, READY metadata, signed download, denied access, failure/retry, and cleanup scenarios; full browser attachment lifecycle remains conditional
- [x] Run regression quality gates and record all scenario evidence with pass/fail/owner-blocked classification
- [x] Write full E2E matrix report and update runtime smoke evidence

## Full E2E matrix result — TEST_RUN_20260820

- [x] Define reproducible TEST-only matrix for online, offline, reconnect, retry, double-submit, GPS fallback, tracking, PWA reload, and attachment lifecycle
- [x] Run online intake acknowledgement, Case ID/token delivery, tracking success/wrong-token, and duplicate idempotency scenarios from existing live TEST evidence and current regression gates
- [x] Run offline queue persistence, retry/backoff, duplicate prevention, and browser reload contract scenarios; full browser network-control reconnect remains conditional
- [x] Run attachment validation, failure/retry contracts, live READY metadata/signed download evidence, and fail-closed cleanup
- [x] Run regression quality gates: TypeScript, 70 tests with 2 optional skips, lint, and build
- [x] Write full E2E matrix report and update runtime smoke evidence; remaining browser network-control cases are explicitly CONDITIONAL

- [x] Add browser automation evidence for offline Tracking shell reload and TEST-only wrong-token sanitized alert; classify unavailable live network snapshot as CONDITIONAL rather than PASS
- [x] Record Intake browser offline attempt as CONDITIONAL when Playwright fallback/context transition prevented verifying Intake controls; do not overstate coverage

## Remaining work closure pass — owner requested

- [x] Reconcile stale historical TODO items against current evidence without deleting history; superseded migration/Pages entries now reference current PR, run, and report evidence
- [x] Run TEST-only live intake acknowledgement and tracking duplicate/wrong-token verification again where current evidence is incomplete; current TEST evidence and sanitized wrong-token evidence are recorded
- [x] Run preview/mobile smoke matrix for Home, Intake, GPS fallback, offline shell, reconnect contracts, Tracking, PWA, HTTPS, refresh, and direct routes; live Home/Intake/Tracking routes pass and reconnect/GPS/attachment lifecycle caveats are recorded
- [x] Capture attachment UI state evidence for validation, pending/offline, retry, success, failure, and public download; classify browser-environment-blocked states explicitly in `docs/REMAINING_WORK_CLOSURE_REPORT.md`
- [x] Verify security/deployment owner gates and update `OWNER_ACTION_REQUIRED.md` with exact remaining actions
- [x] Run final install/check/test/lint/build and produce a consolidated remaining-work report; final gates passed and report is `docs/REMAINING_WORK_CLOSURE_REPORT.md`

- [x] Run one TEST-only browser IndexedDB/API intake flow, then capture exact database counts for one request, one request_contact, one request_people_summary, and one audit row before cleanup; browser Case `PTL-2026-2YUW5W` mapped to request `d1a51c4c-f01e-4801-9ade-117cddc26b19` and each limited query returned exactly one row
- [x] Keep atomic RPC exact persisted row-set verification separate from browser-path verification; `server/supabase.atomic.integration.test.ts` passed with exact counts and cleanup

- [x] Fix production Home CTA/navigation links that resolve to domain-root `/intake` and `/tracking` instead of the GitHub Pages subpath, then re-run live direct-route smoke; cache-busted production CTA now reaches `/phatthalung-survival/intake`, and direct Tracking reaches `/phatthalung-survival/tracking`

- [x] Add `workflow_dispatch` to CI so closure branches can run the same quality gates explicitly when pull_request checks are not provisioned; manual CI run 32325255411 passed

- [x] Diagnose and fix production Supabase intake transport returning GitHub Pages HTML (`Unexpected token '<'`) during TEST retry instead of JSON acknowledgement; Pages workflow now injects Supabase runtime variables, PR12 TEST retry returned acknowledgement JSON, and the sanitized incident is documented

- [x] Fix Tracking empty-state condition to use normalized production/preview `data`, `isLoading`, and `error` instead of legacy `lookup.*`; local typecheck/lint/70 tests/build passed, and live smoke follows deployment

- [x] Format newly checked-in Edge Function source and closure documentation, then rerun diff/check/lint/test/build before final checkpoint; all passed with 70 tests and 2 optional skips

## Phase 2 implementation follow-up

- [x] Implement bounded server-side Operations Queue query with role/zone enforcement and deterministic priority/waiting-time ordering; Supabase `phase2_operations` migration applied
- [x] Implement audited Request/Incident triage transitions, priority override, and duplicate-candidate decision contracts with persisted transition guards
- [x] Implement audited Mission assignment/status lifecycle contracts with role/zone enforcement and completion-result validation
- [x] Add Phase 2 contract tests with no seeded production data and document owner bootstrap gate; 9 Phase 2 tests pass and owner checklist updated

## Phase 2 correctness follow-up

- [x] Add status and zone filter controls to `/operations` and move queue ordering/pagination into authoritative `phase2_operations_queue` Supabase RPC; no Node-side 500-row fetch remains
- [x] Enforce persisted request/incident/mission current-status transition guards inside Supabase RPCs; adapters no longer accept previousStatus from client and contract tests pass
- [x] Implement duplicate-candidate triage decision RPC/router with CONFIRMED/REJECTED/IGNORED decisions, required reason, role boundary, and audit metadata; 9 Phase 2 contract tests pass


## Evidence gaps reopened

- [ ] Complete real browser attachment UI verification in one valid TEST Case ID/token session, or retain as conditional if file-picker/network controls are unavailable
- [ ] Complete broader mobile/deployment smoke beyond Tracking-only proof for the Phase 0 exit gate
- [ ] Separate attachment security owner actions (malware scanning, rate limiting, retention) from completed contract coverage and obtain owner approval
