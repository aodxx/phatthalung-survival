# PHASE 0/1 FINAL VERIFICATION

วันที่ตรวจ: **2026-08-20** ตามเวลางานของโครงการ ตรวจบน preview HTTPS ของ `phatthalung-survival` โดยใช้ข้อมูล TEST-only เท่านั้น

## Executive decision

> **ผลตัดสิน: CONDITIONAL — ยังไม่ formally exit Phase 0/1 และยังไม่เริ่ม implementation ของ Phase 2**

Foundation และ Citizen Intake มีหลักฐานผ่านในส่วน atomic acknowledgement, idempotency, RLS zone authorization, public tracking boundary, attachment storage boundary และ PWA shell. TEST attachment rows และ dependent request/audit data ถูก cleanup แบบ fail-closed แล้ว และ post-cleanup counts เป็นศูนย์. อย่างไรก็ตาม ยังขาดการจำลอง offline network/browser restart จริง, full preview smoke matrix และการยืนยัน deployment smoke. ตามหลัก Blueprint/PRD จึงยังไม่ควรประกาศ READY FOR PHASE 2 แบบไม่มีเงื่อนไข แม้เอกสารออกแบบ Phase 2 จะถูกจัดทำไว้แล้วก็ตาม

## Verification matrix

| Area                                             | Evidence                                                                                                                                                      |  Result | Notes                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository and quality gates                     | Frozen install, TypeScript check, 70 passing tests, 2 opt-in Supabase integration tests skipped by default, lint, production build                            |    PASS | Build มีเพียง warning เรื่อง bundle ขนาดใหญ่ ไม่ใช่ error                                                                                                |
| Public no-login Home                             | Preview direct navigation to `/`; emergency CTA, tracking CTA, contacts and Thai crisis copy rendered                                                         |    PASS | ไม่มี citizen login gate                                                                                                                                 |
| Atomic public intake                             | Real Supabase rollback integration and concurrent `client_request_id` race evidence from fixing checkpoints                                                   |    PASS | Failed child insert left zero request/audit rows; duplicate race returned one RECEIVED and one tokenless ALREADY_RECEIVED                                |
| Citizen acknowledgement/tracking                 | TEST Case `PTL-2026-79516B57` received; valid tracking lookup returned `RECEIVED`; wrong-token denial recorded                                                |    PASS | Tracking token is not reproduced in this report                                                                                                          |
| Staff auth and zone RLS                          | Real TEST fixtures for ADMIN, TRIAGE A/B and FIELD A/B; same-zone, other-zone, wrong-role, unassigned FIELD and admin assertions passed; cleanup verified     |    PASS | No real staff or citizen PII used                                                                                                                        |
| Shared offline storage                           | IndexedDB schema coordination changed both queues to version 3; regression tests cover attachment→request and request→attachment opening order                |    PASS | 10 queue tests passed; previous browser `VersionError` is resolved in preview reload                                                                     |
| Attachment upload                                | TEST `TEST_ATTACHMENT.png`, 68 bytes; `POST /api/public/attachments` returned HTTP 200 and `status: READY` for two retry records after unique-index migration |    PASS | Initial 503 root cause was PostgreSQL inability to infer `onConflict: client_attachment_id` from a partial index; fixed with full unique index migration |
| Attachment public metadata                       | Valid tracking lookup returned two READY metadata records with filename/MIME/size/timestamp and `/api/public/attachments/{id}` boundary only                  |    PASS | Storage paths were not exposed in tracking payload                                                                                                       |
| Authorized attachment download                   | Authorized public boundary returned HTTP 200; signed storage fetch returned HTTP 200, `image/png`, 68 bytes                                                   |    PASS | TEST-only object; no secret included in report                                                                                                           |
| PWA shell                                        | Home reload on HTTPS returned service worker supported, one registration, active controller, and `phatthalung-survival-shell-v1` cache                        |    PASS | Confirms shell control after reload                                                                                                                      |
| Offline network interruption and browser restart | Not physically simulated in this pass                                                                                                                         | PENDING | Must be completed before unconditional Phase 0/1 exit                                                                                                    |
| TEST cleanup                                     | Exact TEST request, attachments, contacts, people summary and audit counts returned zero after transactional cleanup                                          |    PASS | Storage objects are unreferenced per platform storage contract                                                                                           |
| Final deploy/production smoke                    | Preview evidence exists; full production deployment smoke and all direct routes not exhaustively re-run in this pass                                          | PENDING | Owner/environment gate                                                                                                                                   |

## Changes delivered in this fixing pass

The client now coordinates both offline queues through IndexedDB schema version 3. Each queue’s upgrade handler creates both object stores, so an existing version-1 or version-2 database can be upgraded regardless of which queue opens first. A regression suite protects this behavior.

The active Supabase schema now includes a full unique index on `public.attachments(client_attachment_id)`, recorded in `supabase/migrations/20260820000012_attachments_client_attachment_id_unique_full.sql` and applied to project `ulawoqswzqfpqyssxggn`. This matches the server’s atomic retry upsert contract. The earlier partial index was insufficient for PostgreSQL conflict-target inference.

The runtime evidence file `docs/RUNTIME_SMOKE_EVIDENCE.md` now records TEST attachment READY, tracking metadata, authorized download, PWA controller/cache, and the remaining limitations. No tracking token, secret, or real PII is included.

## Required closing actions before formal exit

First, run a controlled preview smoke matrix with a real network-offline interval and browser reload/restart: Home, Intake, GPS fallback, queue persistence, reconnect drain, acknowledgement, tracking, wrong token, attachment pending/retry/READY, mobile viewport, HTTPS and direct routes. Second, rerun the final quality gates and CI/deployment smoke after the completed cleanup. Only after the offline/restart and deployment gates pass should the owner change the decision to **READY FOR PHASE 2**.

## Owner action required

The remaining actions are environment-verification actions, not a request for product redesign. The owner must provide or approve the controlled preview network-offline test window and confirm the cleanup policy for the TEST Case and attachment objects. Production malware scanning, retention, rate limiting, and staff bootstrap remain documented in `OWNER_ACTION_REQUIRED.md` and are not silently treated as implemented.
