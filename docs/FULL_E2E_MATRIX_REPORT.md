## Intake offline reload follow-up

Using a fresh browser tab and a confirmed Intake accessibility snapshot, offline reload preserved the same production route and rendered `ขั้นตอน 1 จาก 4`, `จุดเกิดเหตุ`, and `ถัดไป` with no application-error overlay. This closes the earlier context-transition ambiguity for the Intake shell. It does not yet prove queued offline submit/reconnect acknowledgement or attachment upload while offline.

## Final regression gate

After the browser addendum, `Tracking.tsx` formatting was normalized. The final gate passed Prettier/lint, Vitest with 70 passed and 2 skipped tests, TypeScript, and production build. The E2E report remains conditional only for offline submit/reconnect acknowledgement, GPS permission-denied/unavailable, and complete browser attachment pending/retry/READY/download sequencing.

## GPS permission fallback follow-up

With browser permissions cleared, a fresh production Intake route clicked `ใช้ตำแหน่ง GPS`. The page retained the manual-location option, produced no application-error overlay, and had no console error at navigation time. The exact localized GPS failure message was not detected by the simple text assertion, so permission-denied behavior is recorded as **CONDITIONAL** rather than PASS; the manual fallback itself is PASS.
