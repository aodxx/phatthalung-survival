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
