# Mobile smoke evidence — 20 August 2026

The managed preview screenshot capture for `/`, `/intake`, `/tracking`, and `/operations` at 390x844 returned blank images because the managed Vite preview had stale `/src/main.tsx` pre-transform errors; the server was restarted, but the preview URL was temporarily unavailable. This is recorded as an environment limitation, not a product PASS.

A separate Playwright production session loaded `https://aodxx.github.io/phatthalung-survival/` at viewport 390x844. The page title was `แอปพัทลุงต้องรอด`, console errors were zero, and the accessibility snapshot showed the mobile Home shell, Thai heading, system-ready status, 44px-scale CTAs for emergency intake and tracking, and emergency phone links `1669`, `191`, and `1784`. No application-error overlay or blank content was observed in the production browser session.

This is PASS for production Home mobile shell and CONDITIONAL for the broader managed-preview multi-route smoke until a stable preview URL or additional production route snapshots are available.


The production browser direct navigation to `/phatthalung-survival/intake` returned HTTP 404 at the network layer, but GitHub Pages served the SPA fallback and the React Intake shell rendered at 390x844. The snapshot showed the Home link scoped to `/phatthalung-survival/`, step 1/4, location controls, and enabled Next/disabled Back buttons. Console errors were zero. This is classified as a **conditional Pages fallback** result: application navigation works, but the deployment should ideally return a 200 document response for direct routes if the hosting configuration can provide it.


The production direct route `/phatthalung-survival/operations` returned HTTP 404 and rendered the app's `404 / Page Not Found` screen at 390x844, with zero console errors. This is a real deployment blocker for the new Phase 2 route: the current GitHub Pages artifact does not expose Operations through the deployed SPA fallback even though the local route is registered. The Operations production route must be deployed/rechecked before it can be claimed as live.
