# Live Tracking Smoke — 20 August 2026

Production URL: `https://aodxx.github.io/phatthalung-survival/tracking`

The latest GitHub Pages bundle loaded the Tracking page at the `/phatthalung-survival/` subpath. The page rendered the Thai Case ID and secure tracking-token form with no blank screen and no application-error overlay. A TEST-only lookup using `PTL-2026-TESTSMOKE` and `TEST-only-wrong-token-000000` displayed the loading skeleton text `กำลังตรวจสอบโดยไม่เปิดเผยข้อมูลส่วนตัว` and then the sanitized not-found message `ไม่พบข้อมูลที่ตรงกัน กรุณาตรวจสอบ Case ID และ token หรือโทรเบอร์ฉุกเฉินหากต้องการความช่วยเหลือทันที`.

This smoke is PASS for direct production route loading, loading state, and wrong-token sanitized empty/error state. It does not claim a valid citizen lookup or attachment lifecycle; those remain owner/environment-gated and are covered in the closure report.
