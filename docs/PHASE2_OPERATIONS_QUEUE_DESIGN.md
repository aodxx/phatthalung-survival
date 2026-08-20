# Phase 2 — Staff Intake และ Operations Queue

เอกสารนี้เป็น design boundary สำหรับ Phase 2 ของ **แอปพัทลุงต้องรอด** โดยยึด `16 - System Blueprint ฉบับหลัก แอปพัทลุงต้องรอด.md` และ `17 - PRD.md ฉบับพัฒนาจริง แอปพัทลุงต้องรอด.md` เป็นแหล่งอ้างอิงหลัก งานในเอกสารนี้ยังไม่ถือว่าเป็นการเปิดใช้ workflow ปฏิบัติการจริงจนกว่าจะมี Supabase migration, role bootstrap, audited mutation และ browser verification ครบถ้วน

> หลักการสำคัญ: Request, Incident และ Mission เป็นคนละ entity; เจ้าหน้าที่ต้อง login; ทุก mutation ต้องมี actor, เวลา, entity ID และเหตุผลหรือ metadata ที่เหมาะสม; Public layer ห้ามเปิด PII หรือพิกัดละเอียด

## ขอบเขตระยะแรก

Phase 2 ระยะแรกจะเริ่มจาก **Staff Intake และ Operations Queue** ก่อนการทำ triage/mission เต็มรูปแบบ โดยมีเป้าหมายให้เจ้าหน้าที่เห็นคำร้องที่ server รับรองแล้ว ค้นหาและกรองได้ตามสถานะ ความเร่งด่วน โซน และการมอบหมาย พร้อมเปิดรายละเอียดในขอบเขต role ที่ได้รับอนุญาต

| พื้นที่          | ระยะแรก                                                                           | ยังไม่รวมใน slice แรก               |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| Staff access     | Staff session, role และ zone boundary                                             | การ bootstrap เจ้าหน้าที่อัตโนมัติ  |
| Manual Intake    | กรอกแทน PHONE, RADIO หรือ WALK_IN ผ่าน schema กลาง                                | LINE/social ingestion               |
| Operations Queue | status, priority, zone, unassigned และ sorting ตาม P1 → waiting time → created_at | realtime ที่เป็น critical path      |
| Request detail   | ข้อมูลรับแจ้งที่จำเป็นต่อการคัดกรองและประวัติ audit                               | การเปิด PII ให้ role ที่ไม่มีสิทธิ์ |
| Triage handoff   | ปุ่มส่งต่อเข้าสถานะ review พร้อม audit                                            | auto-merge หรือ AI triage           |

## Vocabulary และ lifecycle

`Request` คือคำร้องดิบหนึ่งรายการจากประชาชนหรือเจ้าหน้าที่ ส่วน `Incident` คือเหตุจริงที่อาจเชื่อมหลาย Request และ `Mission` คืองานที่มอบหมายให้ทีม การออกแบบนี้ห้ามนำข้อมูลทั้งสามมาปนกันใน queue เดียวโดยไม่มี entity reference ที่ชัดเจน

| Entity   | สถานะที่เกี่ยวข้องกับ queue แรก                                             | เจ้าของการเปลี่ยนสถานะ                           |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| Request  | RECEIVED, NEEDS_REVIEW, VERIFIED, DUPLICATE, UNREACHABLE, NEEDS_RECHECK     | INTAKE, TRIAGE, COMMANDER, ADMIN ตาม policy      |
| Incident | NEW, NEEDS_REVIEW, VERIFIED, ASSIGNED, EN_ROUTE, ON_SCENE, RESOLVED, CLOSED | TRIAGE, OPERATIONS, COMMANDER, ADMIN             |
| Mission  | ASSIGNED, ACCEPTED, EN_ROUTE, ON_SCENE, COMPLETED                           | OPERATIONS/FIELD และผู้ override ที่ได้รับอนุญาต |

## Queue query contract

Operations Queue ต้องคืนเฉพาะข้อมูลที่ผู้ใช้ปัจจุบันมีสิทธิ์เห็น โดย server เป็นผู้บังคับ role และ zone ไม่ใช่เพียงการซ่อนปุ่มที่ frontend รายการเริ่มต้นควรใช้ page size จำกัดและ cursor หรือ offset ที่ชัดเจนเมื่อเชื่อมฐานข้อมูลจริง

```text
filters:
  status?: RequestStatus[]
  priority?: P1 | P2 | P3 | P4
  zoneId?: UUID
  unassigned?: boolean
  search?: caseCode หรือ sourceReference ที่ไม่ใช่ full-text PII
sort:
  priority ascending
  waiting time descending
  created_at ascending
pagination:
  limit bounded by server policy
  cursor/offset explicit
```

ลำดับการจัดคิวต้องคำนวณที่ server เพื่อให้หน้าจอเจ้าหน้าที่หลายคนเห็นลำดับเดียวกัน โดยไม่ใช้ client-local time เป็นตัวตัดสิน และต้องแสดง empty, loading, error และ stale-data state อย่างชัดเจน

## Role และ zone boundary

`ADMIN` และ `COMMANDER` เห็นภาพรวมตาม policy และสามารถ override ได้เมื่อระบุเหตุผล ส่วน `INTAKE` เห็นและแก้ข้อมูลรับแจ้งในขอบเขตงาน `TRIAGE` เห็นข้อมูลที่จำเป็นต่อการ verify และ deduplication `OPERATIONS` เห็น Incident/Mission ที่เกี่ยวข้องกับการปฏิบัติการ และ `VIEWER` เป็น read-only ตามขอบเขตที่กำหนด การตรวจสิทธิ์ต้องเกิดใน tRPC procedure และ query helper ทุกครั้ง

ข้อมูลชื่อ เบอร์โทร สุขภาพ พิกัดละเอียด และ attachment เป็น private operations data การส่ง response ต้องเลือก field ตาม use case ไม่ใช้ `select *` และไม่ส่ง raw storage path ไปยัง public client

## Audit requirements

ทุก mutation ของ Manual Intake, การแก้ Request, การเปลี่ยนสถานะ, การแก้ priority, การ link Request เข้ากับ Incident และการ assign Mission ต้องเรียก audited mutation boundary เดียวกัน โดยอย่างน้อยต้องบันทึก actor, actor type, action, entity type, entity ID, occurredAt และ metadata เช่น previous value, next value, reason, source และ zone

> ห้ามใช้ optimistic UI เพื่อบอกว่าการเปลี่ยนสถานะสำเร็จจนกว่า server acknowledgement และ audit write จะเสร็จสมบูรณ์

## Implementation order

1. ตรวจ schema จริงกับ migrations และเพิ่ม index/query fields ที่จำเป็นโดยไม่ทำลายข้อมูลเดิม
2. เพิ่ม staff session/role/zone resolver และ procedure tests สำหรับ unauthorized role
3. เพิ่ม server query helper สำหรับ Operations Queue ที่ใช้ bounded pagination และ server-side sorting
4. เพิ่ม `admin`/`operations` dashboard route ด้วย `DashboardLayout` ที่มี loading, empty, error และ authorization states
5. เพิ่ม Manual Intake ที่ใช้ schema กลางเดียวกับ public intake พร้อม `source`, `sourceReference`, `reporterType`, `receivedAt` และ `operatorId`
6. เพิ่ม audited mutations สำหรับ status/priority/assignment แล้วทดสอบ transition ที่อนุญาตและปฏิเสธ
7. ทดสอบ mobile/tablet/desktop, slow network และ regression ของ public intake ก่อน checkpoint

## Owner actions ก่อน production

การเปิดใช้ Phase 2 จริงยังต้องมีการ bootstrap staff profile/role/zone ใน Supabase, ยืนยัน policy ของแต่ละ role, ตั้งค่า retention และตรวจ RLS กับข้อมูล production โดย owner งานเหล่านี้ต้องอยู่ใน `OWNER_ACTION_REQUIRED.md` และไม่ควรใช้ seed หรือ mock operational data ใน production

## สถานะ implementation รอบ Phase 2 kickoff

ณ วันที่ 20 สิงหาคม 2026 มีการวาง implementation boundary ลงใน codebase แล้ว ได้แก่ `server/operations.ts` สำหรับ bounded queue query, role/zone enforcement และ deterministic sorting; audited RPCs สำหรับ request/incident transition, mission assignment และ mission lifecycle; `client/src/pages/Operations.tsx` สำหรับ mobile-first queue UI; และ `/operations` route ที่รองรับ GitHub Pages subpath ผ่าน `BASE_URL` นอกจากนี้ production Supabase project `ulawoqswzqfpqyssxggn` ได้รับ migration `phase2_operations` แล้ว โดย RPCs เปิด execute เฉพาะ `service_role` และบันทึก audit ใน transaction เดียวกับ mutation

Contract tests ครอบคลุม queue ordering, same-zone/other-zone access, role denial, transition guards, completion-result requirement และ fail-closed database behavior โดยไม่สร้างข้อมูล production ทั้งนี้การใช้งานจริงยังขึ้นกับการ bootstrap `auth.users` และ `user_profiles` ของเจ้าหน้าที่, การกำหนด `zone_id`, การยืนยัน role policy รายหน่วยงาน และการทดสอบ browser session ของ staff ตามรายการใน `OWNER_ACTION_REQUIRED.md`
