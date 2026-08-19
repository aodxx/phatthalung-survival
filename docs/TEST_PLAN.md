# Test Plan — แอปพัทลุงต้องรอด

## Phase 0 automated checks

| Area        | Test                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------- |
| Type safety | `pnpm check` ต้องผ่าน                                                                         |
| Unit        | role/status vocabulary, PWA assets, Supabase fail-closed boundary                             |
| Build       | `pnpm build` ต้องสร้าง client และ server bundle ได้                                           |
| PWA         | manifest มี standalone display, service worker cache/fallback ทำงานตาม contract               |
| Migration   | SQL ต้องมี entity separation, unique client request ID, indexes, RLS และ no public PII policy |
| Repository  | `.env`, service role key, node_modules และ build output ต้องไม่อยู่ใน commit                  |

## Required before Phase 0 sign-off

ต้องเปิด preview ตรวจ desktop และ mobile viewport, ตรวจ empty/error states, ตรวจ keyboard focus และ screen reader landmarks ตรวจว่าหน้า public ไม่มี login gate และตรวจว่า primary action ยังมองเห็นได้บนมือถือ 320px ขึ้นไป

## Required before Phase 1 sign-off

ต้องทดสอบ IndexedDB queue จริงเมื่อ offline, reconnect retry, duplicate retry ด้วย clientRequestId เดิม, server acknowledgement, tracking token, map outage, storage outage และไม่แสดง success ก่อน server acknowledgement

## Required before MVP go-live

ต้องทำ RLS unauthorized access, PII leakage, concurrency, rate limit, abuse simulation, slow 3G, Android รุ่นเก่า, backup/recovery, monitoring และ accessibility QA

## Reporting rule

ผลที่ยังไม่ได้รันจริงให้รายงานเป็น `NOT VERIFIED` หรือ `BLOCKED` พร้อมสาเหตุ ไม่ใช้การตรวจจาก source code แทน runtime verification
