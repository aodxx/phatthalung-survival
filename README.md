# แอปพัทลุงต้องรอด

ระบบ **Emergency Case & Incident Operations System** สำหรับรับแจ้งและบริหารเหตุฉุกเฉินระดับชุมชน ตั้งแต่ประชาชนแจ้งเหตุ ไปจนถึงการคัดกรอง สร้าง Incident มอบหมาย Mission บันทึกผล และปิดเหตุพร้อม Audit Trail

> เอกสาร Blueprint และ PRD ที่นำเข้าจาก Google Drive เป็น Source of Truth ของระบบ ส่วนเอกสาร implementation ใน repository นี้ต้องไม่ขัดกับ Product Model, Supabase/Postgres architecture, offline-first rules หรือ security boundaries

## สถานะปัจจุบัน

กำลังดำเนินการ **Phase 0 — Foundation** โค้ดที่มีอยู่ใน checkpoint นี้ประกอบด้วย PWA shell ภาษาไทย, visual foundation สำหรับภาวะฉุกเฉิน, service-worker baseline, shared role/status vocabulary, Supabase integration boundary ที่ fail-closed, migration ฉบับร่างทำซ้ำได้, RLS baseline, owner setup checklist และ unit tests ระดับ foundation

Citizen Intake เต็มรูปแบบยังไม่เริ่มจนกว่า Phase 0 จะผ่าน Exit Criteria ตาม master prompt ได้แก่ build, PWA shell, Supabase connection, reproducible migrations, auth skeleton, RLS, lint, tests, CI และ security checks

## คำสั่งพัฒนา

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
```

ห้ามถือว่า Local Cache หรือ PWA shell เท่ากับการส่ง Request สำเร็จ การส่งสำเร็จจะเกิดขึ้นเมื่อ controlled API ตอบ acknowledgement จาก server เท่านั้น

## โครงสร้างสำคัญ

| Path                       | หน้าที่                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `client/`                  | React/Vite frontend และ PWA shell                              |
| `server/`                  | tRPC server, auth boundary, Supabase server boundary และ tests |
| `shared/`                  | role, status และ audit vocabulary ที่ใช้ร่วมกัน                |
| `supabase/migrations/`     | PostgreSQL schema, RLS และ index migrations                    |
| `docs/`                    | architecture, security, runbook และ test plan                  |
| `OWNER_ACTION_REQUIRED.md` | รายการตั้งค่าที่ต้องทำโดยเจ้าของระบบ                           |
| `todo.md`                  | รายการงานทั้งหมดและประวัติการดำเนินงาน                         |

## Security rules

ระบบไม่ใส่ service-role secret ใน client หรือ repository, ไม่เปิด public direct read ต่อ PII tables, ไม่ใช้การซ่อนปุ่มเป็น authorization หลัก, ไม่ auto-merge emergency request และไม่ให้ AI ปฏิเสธเหตุฉุกเฉินโดยอัตโนมัติ

## Source of Truth

- System Blueprint: เอกสารใน project shared files ชื่อ `16 - System Blueprint ฉบับหลัก แอปพัทลุงต้องรอด.md`
- PRD: เอกสารใน project shared files ชื่อ `17 - PRD.md ฉบับพัฒนาจริง แอปพัทลุงต้องรอด.md`
- Master implementation prompt: `OWNER_ACTION_REQUIRED.md` และข้อกำหนด Phase 0 ที่ผู้ใช้ส่งให้ในงานนี้
