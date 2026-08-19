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
- [ ] Run lint, tests, build, mobile smoke check, error/empty-state check, and security review; verified: lint, tests, build, typecheck, mobile screenshot, Supabase connectivity, migration, table/RLS inventory, anonymous RLS boundary, audit/staff unit tests; remaining: formal empty/error runtime check, GitHub CI execution, and deploy verification

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
- [ ] Add attachment security, offline, validation, and API contract tests; verified: validation, fail-closed API, binary offline queue, HTTP 400/503 route contract, 14 Vitest files / 45 tests, typecheck, lint, and production build; remaining: live storage upload verification, isolated READY idempotency fixture, malware scanning, rate limiting, and visual screenshot because preview URL was unavailable after restart
- [x] Update `OWNER_ACTION_REQUIRED.md` with storage bucket, retention, malware scanning, and production upload configuration decisions
- [x] Fix public attachment route error classification so missing headers, invalid client ID, unsupported MIME, oversized file, authorization failure, and count limit return correct 4xx responses
- [x] Add attachment API error contract tests for validation/status mapping, authorization failure boundary, idempotency error mapping, and public error response shape
- [x] Add HTTP-level tests for `/api/public/attachments` covering missing headers, invalid attachment ID, unsupported MIME, and sanitized service-unavailable response; live Supabase-backed authorization/count branches remain environment-dependent
- [ ] Add an idempotent re-upload test proving an already-READY `client_attachment_id` returns the existing attachment result without creating or uploading again (requires isolated Supabase fixture or mock boundary; no test data inserted)
- [x] Add a route-contract test asserting sanitized JSON `{ error: string }` responses for the HTTP-proven 400/503 paths; 404/409/413 mappings are unit-tested and remain pending isolated Supabase route fixtures
- [x] Prevent Vitest importing `server/_core/index.ts` from starting an extra HTTP listener during route tests; preserve single managed dev server runtime
- [x] Narrow attachment route test reporting to statuses proven in this environment: HTTP 400/503 plus unit-tested 404/409/413 mappings; no unsafe production/test data was inserted
- [ ] Verify end-to-end attachment upload against a real acknowledged Request/Case ID + tracking token, including storage write and READY transition
- [ ] Add isolated idempotent READY re-upload fixture proving no duplicate record or second storage upload
- [ ] Complete or explicitly decouple citizen attachment access from public tracking rollout and re-test the user flow
- [ ] Capture runtime UI verification for attachment selection, pending/offline, retry, success, and failure states when preview is available
