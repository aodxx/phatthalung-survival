# Mobile smoke evidence — 20 August 2026

The managed preview screenshot capture for `/`, `/intake`, `/tracking`, and `/operations` at 390x844 returned blank images because the managed Vite preview had stale `/src/main.tsx` pre-transform errors; the server was restarted, but the preview URL was temporarily unavailable. This is recorded as an environment limitation, not a product PASS.

A separate Playwright production session loaded `https://aodxx.github.io/phatthalung-survival/` at viewport 390x844. The page title was `แอปพัทลุงต้องรอด`, console errors were zero, and the accessibility snapshot showed the mobile Home shell, Thai heading, system-ready status, 44px-scale CTAs for emergency intake and tracking, and emergency phone links `1669`, `191`, and `1784`. No application-error overlay or blank content was observed in the production browser session.

This is PASS for production Home mobile shell and CONDITIONAL for the broader managed-preview multi-route smoke until a stable preview URL or additional production route snapshots are available.

The production browser direct navigation to `/phatthalung-survival/intake` returned HTTP 404 at the network layer, but GitHub Pages served the SPA fallback and the React Intake shell rendered at 390x844. The snapshot showed the Home link scoped to `/phatthalung-survival/`, step 1/4, location controls, and enabled Next/disabled Back buttons. Console errors were zero. This is classified as a **conditional Pages fallback** result: application navigation works, but the deployment should ideally return a 200 document response for direct routes if the hosting configuration can provide it.

The production direct route `/phatthalung-survival/operations` returned HTTP 404 and rendered the app's `404 / Page Not Found` screen at 390x844, with zero console errors. This is a real deployment blocker for the new Phase 2 route: the current GitHub Pages artifact does not expose Operations through the deployed SPA fallback even though the local route is registered. The Operations production route must be deployed/rechecked before it can be claimed as live.

After Pages deploy run `32330775028` succeeded, production `/phatthalung-survival/operations?smoke=309031b` loaded the Operations Queue React shell at 390x844. The snapshot showed the queue heading, search, priority combobox, status combobox, Zone ID textbox, unassigned filter, and a sanitized `ไม่สามารถโหลดคิวปฏิบัติการ` state. Network status remained 404 because the Pages fallback document is used, but the app route rendered and console contained one expected query-related error from the absent staff session. This is PASS for deployed route/UI shell and fail-closed unauthenticated behavior; real queue data still requires owner-created staff credentials.

During a TEST-only production Intake flow, the location text was filled but the app correctly required selecting the explicit `พิมพ์ตำแหน่งเอง` mode before allowing Next. The snapshot showed the accessible alert `กรุณากรอกข้อมูลที่จำเป็นให้ครบก่อนดำเนินการต่อ`; no citizen data was submitted. This confirms validation behavior, but the session did not yet reach the attachment picker.

Selecting `พิมพ์ตำแหน่งเอง` cleared the required-field alert while retaining the TEST-only location and enabled the Next button. The control is keyboard/accessibility-visible in the 390px snapshot. No submission was made.

The TEST-only Intake session advanced to step 2/4 after selecting manual location. Production mobile snapshot showed eight incident-type buttons, including flood, illness/accident, evacuation, food/water, medical supplies, fire/smoke, and other hazards, with accessible Back/Next controls. No submission or real-citizen data was used.

The TEST-only Intake session advanced to step 3/4. The production mobile snapshot showed numeric fields for total people and vulnerable groups (children, older adults, disability, bed-bound, urgent medical need), explicit unknown-data checkboxes, and a special-needs text area. The viewport was scrolled to the step content; no request was submitted.

The TEST-only Intake session reached step 4/4. The production mobile snapshot showed reporter name, reporter relationship, callback phone, and explicit consent controls before the `ตรวจข้อมูล` review action. This confirms the multi-step mobile form and consent boundary; the session intentionally stopped before submission because no fresh owner-approved TEST Case/token was available for a one-session attachment lifecycle.

The TEST-only review flow did not submit a server request in this browser environment; it correctly transitioned to `บันทึกไว้ในเครื่อง รอส่ง` with `ลองส่งอีกครั้ง`, demonstrating offline-first acknowledgement discipline. A retry was attempted, but no fresh acknowledged Case ID/token or attachment picker was reached in this session. Therefore full attachment UI lifecycle remains pending/conditional and no request cleanup was required from this attempt.

Network inspection of the TEST-only retry showed a successful `POST https://ulawoqswzqfpqyssxggn.supabase.co/functions/v1/public-intake` with HTTP 200 and response `{status:"RECEIVED", caseCode:"PTL-2026-SSFNPQ", receivedAt:"2026-08-20T04:15:54.114+00:00", trackingToken:"IHPiu5JvGkM7nA0G42XMplKDmA5wLuDU"}`. The earlier offline screen was a stale intermediate snapshot before retry completion. These are TEST-only credentials and will be used only for immediate browser verification and cleanup.

The same TEST-only Case ID/token session reached production Tracking. The mobile snapshot showed the public-safe Case ID and secure tracking-token fields with the `ตรวจสอบสถานะ` action; the route rendered with zero application-error overlay. The next step is to submit the recorded TEST-only credentials and inspect the attachment section.

The TEST-only Tracking lookup succeeded with `PTL-2026-SSFNPQ` and the recorded token. The production mobile snapshot showed status `RECEIVED` and the public attachment section `แนบรูปหรือเอกสารเพิ่มเติม`, with the accessible `เลือกไฟล์` control and policy text (maximum 3 files, 10 MB each, JPG/PNG/WebP/PDF). This confirms the live acknowledged Case/token flow reaches the attachment UI; the next step is file selection/upload evidence.

The live TEST Tracking session successfully opened the file chooser and selected `/opt/.manus/current/test-attachment.pdf`. The mobile snapshot showed `test-attachment.pdf`, `1 KB`, and an enabled `อัปโหลด` button under the attachment policy. This is PASS for browser file-picker/selection/validation UI; upload acknowledgement, retry/failure state, public download, and cleanup remain to be verified.

After clicking `อัปโหลด`, the live Tracking UI retained `test-attachment.pdf` and displayed the accessible status `บันทึกไว้แล้ว จะลองส่งใหม่เมื่อเครือข่ายพร้อม` with a retry indicator. This proves selection and pending/offline state, but not successful server acknowledgement/READY in this browser session. The exact TEST Case ID/token remains available for a controlled retry; no real-citizen data was used.

After Pages deploy run for commit `e83529a`, a fresh production Tracking route loaded the expected mobile lookup shell with zero console errors. This is the starting point for the post-fix TEST attachment retry.

On the fresh post-fix Tracking lookup, Playwright reported two console errors after clicking `ตรวจสอบสถานะ`; the exact console file path was not available for local reading. The operation must be treated as CONDITIONAL until the current snapshot/network response is inspected. No upload success is claimed from this attempt.

In the fresh e83529a production bundle, TEST PDF selection still renders correctly with filename, size, and upload control. The adapter fix is now in the bundle; the next network capture will distinguish Supabase Edge Function upload from the previous GitHub Pages 405 path.

After the e83529a adapter fix, the live upload request went to `https://ulawoqswzqfpqyssxggn.supabase.co/functions/v1/public-attachment-upload` (HTTP 200), not GitHub Pages. The response was `{status:"READY", attachmentId:"0e04eb91-aede-4d06-81f2-8e4b0ec209ac", requestId:"b43b8773-2536-4cb4-8772-7c751e4915cf", fileName:"test-attachment.pdf", mimeType:"application/pdf", byteSize:482}`. This is PASS for production adapter routing and server READY acknowledgement with TEST-only data.

After a second Tracking lookup, the live UI retained the TEST PDF with `อัปโหลดสำเร็จ` icon. The attachment metadata list is not shown in the same snapshot because the returned public-tracking payload did not include the newly uploaded row in this refresh; upload itself is independently proven by the Supabase `READY` response and success icon. Download must be verified via the public attachment boundary/response evidence rather than claiming a UI button that is not rendered here.

Fresh production commit `77ff419` loaded the mobile Tracking shell with HTTP 404 fallback, zero console errors, and the expected Case ID/token form. This confirms the relookup-fix artifact is serving the route; the next browser actions verify attachment listing and download.

The 77ff419 first lookup now shows the authoritative READY attachment list: `test-attachment.pdf`, `1 KB · application/pdf`, and the accessible button `เปิด test-attachment.pdf`. This confirms the repeated-submit relookup fix closes the metadata-refresh gap. The next action is the public signed-download check.

The 77ff419 live public download check passed: clicking `เปิด test-attachment.pdf` invoked `public-attachment-download` on Supabase with HTTP 200, and Playwright downloaded `0e04eb91-aede-4d06-81f2-8e4b0ec209ac-test-attachment.pdf` to its controlled workspace. This closes the live TEST selection → READY → tracking-list → signed-download browser path. The test fixture remains scheduled for database/storage cleanup.

Cleanup completed for the TEST fixture: the exact storage object was deleted from Supabase Storage, the exact attachment metadata row was deleted with the matching request ID, and a follow-up bounded query returned an empty result. No real citizen data was used; the original request row remains as the TEST-only intake fixture for existing verification history.

The same acknowledged TEST Tracking session also exercised the failure state with `test-invalid.txt`. The UI displayed `รองรับเฉพาะ JPG, PNG, WebP และ PDF` and `อัปโหลดไม่สำเร็จ`; no upload button was offered for the invalid item. This is PASS for browser invalid-MIME validation/failure state, with the valid PDF path already covering selection, pending, READY, listing, and download.

A controlled 77ff419 browser session forced Playwright context offline during a valid TEST PDF upload and visibly reached the pending state `บันทึกไว้แล้ว จะลองส่งใหม่เมื่อเครือข่ายพร้อม`. After restoring context connectivity and dispatching `online`, the final snapshot still showed `รอส่งใหม่`; no READY drain was claimed. This is evidence of real offline enqueue, but the automatic reconnect drain remains a conditional failure requiring further diagnosis.

After deploying 35d7dd5, the controlled rerun produced both failed and HTTP 200 `public-attachment-upload` requests, but the final UI snapshot still showed one pending item. This indicates the reconnect request path executes, while UI/IndexedDB state reconciliation or concurrent stale queue items still needs diagnosis; no drain PASS is claimed yet.


The explicit `ลองส่งใหม่` recovery attempt in the clean 6c30e88 session also timed out waiting for `อัปโหลดสำเร็จ`; the network log showed only the forced offline failure and no subsequent successful upload. This environment therefore does not yet provide a reliable post-reconnect browser drain PASS, even though the production adapter and explicit retry code are present and unit-tested. The item remains CONDITIONAL and owner/browser-environment gated.
