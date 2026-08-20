# แอปพัทลุงต้องรอด — Remaining Work Closure Report

วันที่ตรวจสอบ: 20 สิงหาคม 2026

## สรุปผู้บริหาร

การปิดงานรอบนี้ทำให้ **Phase 0/1 transport และ GitHub Pages production path ใช้งานได้ตามหลักฐานหลัก** โดย CI และ Pages deployment ผ่าน, Supabase runtime adapter ถูกใช้งานใน production build, Home CTA แบบ cache-busted ไปยัง `/phatthalung-survival/intake`, และ direct Tracking route แสดง React shell ได้จริง

สถานะโดยรวมยังเป็น **Conditional Ready** ไม่ควรประกาศเปิดใช้งานประชาชนเต็มรูปแบบจนกว่าจะผ่าน browser-controlled reconnect/attachment lifecycle, security/retention approval สำหรับ attachments และ staff bootstrap ของเจ้าของระบบ

## หลักฐานที่ปิดแล้ว

| ด้าน                  | หลักฐานล่าสุด                                                                                                | สถานะ |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| CI                    | PR #9 quality check ผ่าน และ main CI run `32325960697` ผ่าน                                                  | PASS  |
| Pages build/deploy    | Deploy run `32325960656` ผ่าน; build, fallback, manifest/service-worker rewrite ผ่าน                         | PASS  |
| Production navigation | Cache-busted Home CTA ไป `/phatthalung-survival/intake`; direct Tracking ไป `/phatthalung-survival/tracking` | PASS  |
| Supabase transport    | `public-intake`, `public-tracking`, `public-attachment` และ runtime adapter มีอยู่ใน source/reports          | PASS  |
| Atomic intake         | Exact persisted set และ cleanup ผ่าน integration test: request, contact, people summary, audit               | PASS  |
| RLS and cleanup       | TEST-only fixtures, zone matrix, attachment cleanup และ zero-row verification ผ่าน                           | PASS  |
| Tracking loading      | Skeleton, disabled/error/empty/success states และ quality gates ผ่าน                                         | PASS  |
| Documentation         | E2E, runtime smoke, migration audit, Supabase adaptation และ owner action docs อัปเดต                        | PASS  |

## Conditional / environment-gated work

| งาน                                        | เหตุผลที่ยังไม่ถือเป็น PASS เต็มรูปแบบ                                                                                  | ผู้รับผิดชอบถัดไป               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Offline submit → reconnect acknowledgement | ต้องควบคุม network transition และ browser lifecycle จริงให้เห็น queued item drain และ SENT acknowledgement ใน tab เดียว | Engineering / browser harness   |
| Attachment pending/offline → READY         | ต้องทดสอบ file picker, IndexedDB blob, reconnect upload, retry, READY และ public signed download ใน browser เดียว       | Engineering / owner environment |
| GPS denial localized message               | browser permission-denied path ยังไม่ตรวจพบข้อความ localized exact text แม้ manual fallback ผ่าน                        | Engineering                     |
| Malware scan/rate limit/retention          | ต้องมี policy และ service configuration ที่ owner อนุมัติ                                                               | Owner                           |
| Staff bootstrap                            | ต้องสร้าง staff identities, roles และ zone assignments ที่อนุมัติใน Supabase Auth/profile                               | Owner                           |
| Security headers/backup-recovery           | ต้องมี operational policy และตรวจ deployment configuration เพิ่ม                                                        | Owner / Operations              |

## งานที่ยังไม่ควรปิดเป็น “เสร็จสมบูรณ์”

รายการ Staff authentication/zone bootstrap, Operations Queue, Incident Triage และ Mission lifecycle เป็น **Phase 2 product work** และยังไม่ได้ implement เป็น production feature ตาม Blueprint/PRD จึงคงสถานะ pending ใน `todo.md` ต่อไป

การ browser verification ที่ต้องใช้ exact database counts จาก flow IndexedDB จริงยังไม่ควรอ้างว่าเสร็จ เพราะการตรวจ exact persisted row set ที่ผ่านเป็น atomic Supabase integration path แยกจาก browser path การแยกนี้ถูกบันทึกไว้เพื่อป้องกันการ overclaim

## Owner Action Required

เจ้าของระบบต้องยืนยัน staff identities/roles/zones, attachment retention budget, malware scanning, public-upload rate limit, security-header policy และ backup/recovery ก่อนเปลี่ยนจาก Conditional Ready เป็น production open-use การตั้งค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ใน GitHub Secrets ถือว่าเสร็จแล้วตาม owner confirmation และ workflow runs ที่ผ่าน

## คำตัดสิน

**Conditional Ready for continued controlled verification and Phase 2 preparation.** ยังไม่ใช่ unrestricted public launch approval และไม่ควรใช้ข้อมูลประชาชนจริงในการทดสอบเพิ่มเติม

## Final quality gate

รอบสุดท้ายหลังแก้ production navigation ผ่าน `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm lint`, `pnpm test -- --run` และ `pnpm build` โดยผลคือ 70 tests ผ่าน, 2 optional Supabase integration tests ถูก skip ตามค่าเริ่มต้น, typecheck/lint/build ผ่าน การแจ้งเตือน chunk ใหญ่กว่า 500 kB เป็น performance warning ไม่ใช่ build failure
