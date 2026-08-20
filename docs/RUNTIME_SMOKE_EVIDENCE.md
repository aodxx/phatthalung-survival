# Runtime smoke evidence

วันที่ตรวจ: 2026-08-20 (sandbox preview)

ตรวจหน้า `/tracking` บน preview mobile viewport โดยไม่สร้างข้อมูลจริง ผลคือฟอร์มแสดง Case ID และ secure tracking token อย่างชัดเจน เมื่อกรอก `PTL-2026-INVALID` และ `invalid-token` แล้วกดตรวจสอบ ระบบแสดงข้อความภาษาไทยว่าไม่สามารถตรวจสอบได้ในขณะนี้และแนะนำให้ลองใหม่เมื่อเครือข่ายพร้อม/โทรเบอร์ฉุกเฉินเมื่อมีอันตรายเร่งด่วน โดยไม่เปิดเผยข้อมูลภายในหรือ PII

หลักฐานนี้ครอบคลุม empty/error state ของ public tracking เท่านั้น ยังไม่ใช่หลักฐานของ acknowledged Request จริง, attachment READY download, offline browser restart, หรือ production deployment smoke.

ตรวจหน้า `/` ใน preview ต่อ: Home โหลดสำเร็จและยังคง no-login emergency CTA, tracking CTA, emergency contacts และข้อความ offline-safe ตามที่ออกแบบไว้ Browser runtime รายงาน `serviceWorkerSupported: true` และ `controller: true` ซึ่งยืนยันว่า PWA service worker ควบคุมหน้าอยู่ใน preview ขณะตรวจนี้ยังไม่ได้จำลอง network offline แบบตัดการเชื่อมต่อจริงหรือ browser restart.

Citizen Intake E2E บน HTTPS preview ด้วย TEST data: UI เก็บคำร้องไว้ในเครื่องก่อน แล้ว manual retry ส่งสำเร็จและแสดง Case ID `PTL-2026-79516B57` กับ tracking token เฉพาะหลัง server acknowledgement. Tracking ด้วย token ที่ถูกต้องแสดงสถานะ `RECEIVED` และส่วนแนบไฟล์; ใช้ Case ID เดิมกับ `wrong-test-token` แสดง “ไม่พบข้อมูลที่ตรงกัน” โดยไม่เปิดข้อมูลภายใน.

Attachment runtime verification (TEST-only, preview HTTPS, 2026-08-20): หลังแก้ shared IndexedDB เป็น schema version 3 และ apply migration `attachments_client_attachment_id_unique_full` บน Supabase project `ulawoqswzqfpqyssxggn` แล้ว การ retry ของ TEST Case `PTL-2026-79516B57` ส่ง `TEST_ATTACHMENT.png` ขนาด 68 bytes ผ่าน `POST /api/public/attachments` ได้ HTTP 200 พร้อม `status: READY` จำนวน 2 รายการจาก retry attempts ที่มี client attachment IDs ต่างกัน; ไม่มี token หรือ PII ถูกบันทึกในเอกสารนี้. `tracking.lookup` ด้วย credential ที่ถูกต้องคืน attachment metadata แบบ public-safe จำนวน 2 รายการ (ชื่อไฟล์, MIME, byte size, uploadedAt และ download boundary เท่านั้น; ไม่คืน storage path). การเรียก `GET /api/public/attachments/{attachmentId}` พร้อม Case ID และ tracking token ที่ถูกต้องคืน HTTP 200 และ signed storage fetch คืน HTTP 200, `content-type: image/png`, `content-length: 68`, และอ่าน bytes ได้ 68 bytes. ก่อนแก้ schema พบ HTTP 503 จาก PostgreSQL เพราะ partial unique index ไม่สามารถใช้กับ `onConflict: client_attachment_id` ได้; migration เปลี่ยนเป็น full unique index และผล retry หลังแก้ผ่านแล้ว.

ข้อจำกัดที่ยังเหลือ: หลักฐานนี้ยืนยัน online upload, READY transition, public-safe listing และ authorized download ใน preview เท่านั้น ยังไม่ใช่หลักฐานของการลบข้อมูล TEST หลังตรวจ, malware scanning, rate limiting หรือการจำลอง offline browser restart จริง.

PWA reload smoke (preview HTTPS, 2026-08-20): direct navigation to `/` loaded the no-login emergency Home shell. Browser runtime check returned `secure: true`, `serviceWorkerSupported: true`, `controller: true`, one active registration, and cache `phatthalung-survival-shell-v1`. This confirms the PWA shell is controlled after reload; a physical network-disconnect/offline browser restart was not simulated in this run.

TEST cleanup verification (active Supabase project `ulawoqswzqfpqyssxggn`, 2026-08-20): หลังตรวจ attachment READY/download แล้ว ลบเฉพาะ request ID, Case ID และ attachment IDs ที่ยืนยันเป็น TEST พร้อม request contacts, people summary และ audit rows ที่ผูกกับ entity เหล่านั้นใน transaction. Post-cleanup query returned `requests_remaining: 0`, `attachments_remaining: 0`, `contacts_remaining: 0`, `people_remaining: 0`, and `audit_remaining: 0`. Storage objects are unreferenced after metadata deletion per the platform storage contract; no real PII was used.

Deployment smoke (published domain, 2026-08-20): `https://phatsurvive-gwfre5qo.manus.space/`, `/tracking`, `/intake`, and `/manifest.webmanifest` each returned HTTP 200 over HTTPS. Full production browser interaction was not re-run because the configured Playwright MCP browser engine was unavailable in the sandbox; the existing preview browser evidence remains the source for interactive UI states.

Offline browser-restart limitation: an attempted Playwright context offline/reload run was blocked before execution because the configured Firefox executable was not installed and the MCP server did not expose an install tool. Therefore no claim is made that a physical network-offline browser restart passed; this remains the final verification gate.

## Router/base-path production verification — 2026-08-20

PR #5, `fix: support GitHub Pages subpath routing`, was merged into `main`, and Pages workflow run `32316093421` completed successfully for commit `cdbaeb2fe6bb56ecef0fa6f542b45f159307c328`. The live root `https://aodxx.github.io/phatthalung-survival/` renders the emergency Home shell instead of the application 404 page. Direct routes `/intake` and `/tracking` also render their intended pages successfully on the GitHub Pages subpath. The workflow produced the GitHub Pages artifact and reported the live deployment URL. Remaining workflow annotations are Node.js 20 deprecation warnings, not application failures.

## Full E2E matrix run — TEST_RUN_20260820

- Supabase TEST RLS fixture passed same-zone, other-zone, ADMIN, wrong-role, and field-assignment assertions; fixture cleanup completed.
- Automated online/offline/attachment regression suite passed 16 files and 70 tests; 2 optional Supabase integration tests were skipped.
- Published `/` returned 200; manifest and service worker returned 200; direct `/intake` and `/tracking` returned HTTP 404 but browser navigation rendered React through the `404.html` fallback.
- Live TEST evidence covers atomic rollback, concurrent idempotency, tracking wrong-token denial, attachment READY/signed download, private object deletion, and database cleanup.
- Full browser network-control evidence for offline reload/reconnect drain, GPS permission-denied, and attachment pending-to-READY remains CONDITIONAL and must use TEST data only.

- Playwright network-control addendum: offline reload of published Tracking retained the Tracking heading and Case ID field with no application-error overlay. TEST-only wrong-token form rendered the sanitized alert. The browser network snapshot became unavailable after context reset, so live transport classification for this single browser attempt is CONDITIONAL; prior Edge Function/unit wrong-token evidence remains PASS.
