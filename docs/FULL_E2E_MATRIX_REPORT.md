# Full E2E Matrix Report

**Run tag:** `TEST_RUN_20260820`  
**Data policy:** TEST data only; fixture cleanup completed.

## Result

The full matrix is **CONDITIONAL**, not a full PASS. Automated and live TEST evidence covers online intake, atomic rollback, concurrent idempotency, public tracking, wrong-token denial, RLS, offline queue contracts, attachment validation, READY upload, signed download, and cleanup. Stable browser network-control evidence for offline reconnect with real queued blobs, GPS permission-denied states, and the complete attachment browser lifecycle remains owner/environment bounded.

| Area                                         | Result      | Evidence                                                                                                 |
| -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| Supabase RLS                                 | PASS        | TEST fixture: same-zone, other-zone, ADMIN, wrong-role, and field-assignment all true; cleanup completed |
| Atomic intake rollback                       | PASS        | Real Supabase integration evidence; failed child leaves zero request/audit rows                          |
| Concurrent idempotency                       | PASS        | One RECEIVED and one tokenless ALREADY_RECEIVED; cleanup completed                                       |
| Tracking success/wrong token                 | PASS        | Live TEST evidence and tracking tests; public-safe response only                                         |
| Offline request queue                        | PASS        | `offlineQueue.test.ts`, persistence/retry/idempotency contracts                                          |
| Offline attachment queue                     | PASS        | `attachmentQueue.test.ts`, binary queue and retry contracts                                              |
| Reconnect drain in browser                   | CONDITIONAL | Runtime wiring and unit contracts pass; browser network toggle/reload trace remains                      |
| PWA root/manifest/service worker             | PASS        | Published `/` 200, `/manifest.webmanifest` 200, `/sw.js` 200                                             |
| Direct `/intake` and `/tracking` HTTP status | CONDITIONAL | curl returns 404 while browser renders React through `404.html` fallback                                 |
| Attachment validation/failure                | PASS        | MIME, size, count, error mapping and retryable 503 tests pass                                            |
| Live attachment READY/download               | PASS        | TEST upload, READY metadata, authorized signed download and object/database cleanup previously verified  |
| Attachment offline-to-READY browser trace    | CONDITIONAL | Queue/service contracts pass; stable browser network-control run remains                                 |
| GPS denied/unavailable browser trace         | CONDITIONAL | Fallback code exists; permission matrix remains environment-dependent                                    |
| Double-submit prevention                     | PASS        | UI gating and server idempotency contracts pass                                                          |

## Current gates

Vitest: 16 files passed, 70 tests passed, 2 optional integration tests skipped. The TEST fixture created and removed 5 users, 2 zones, 2 teams, 2 requests, 2 incidents, and 2 missions. No real citizen data was used. Published endpoint checks returned `/` 200, manifest 200, service worker 200, and fallback 404.html 200.

## Remaining gates

A formal browser automation run must control network offline/online state, reload with queued TEST blobs, observe reconnect drain, and capture GPS-denied/unavailable and attachment pending/retry/READY/download states. These must remain TEST-only and fail-closed cleanup.

## Browser automation addendum

A Playwright browser run set the context offline and reloaded the published Tracking route. The page still rendered the Tracking heading and Case ID field with no application-error overlay, so offline shell resilience passed. A TEST-only wrong-token submission rendered the sanitized Thai alert state. The browser session reported one console error and the final network snapshot was unavailable after the page context reset; therefore the live production wrong-token transport result is recorded as CONDITIONAL for this run, while the previously verified live Edge Function/unit evidence remains PASS.
