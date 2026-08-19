# Security Baseline — แอปพัทลุงต้องรอด

## Threat boundaries

Public Citizen ไม่ต้อง login แต่เข้าถึงได้เฉพาะ controlled intake/tracking boundary ไม่ใช่ direct read ของ PII tables Staff ใช้ Supabase Auth และ role mapping ใน `user_profiles` โดย RLS เป็น enforcement หลัก

## Phase 0 controls

| Control          | Baseline                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Default deny     | เปิด RLS บน operational tables ทั้งหมด และไม่มี public policy สำหรับ PII                             |
| Staff access     | จำกัดด้วย role และจะเพิ่ม zone-aware policy ก่อนใช้งานจริง                                           |
| Secrets          | service role key อยู่ server/Edge เท่านั้นและต้องจัดการผ่าน project Secrets                          |
| Audit            | mutation contract ต้องบันทึก actor, action, entity, entity ID, timestamp และ reason/metadata ตามกรณี |
| Attachments      | เก็บ path/metadata ไม่เก็บ bytes ใน database และห้าม public write bucket                             |
| Public response  | ห้ามส่งชื่อ เบอร์ พิกัดละเอียด ข้อมูลสุขภาพ รูปภาพ และ internal notes                                |
| Emergency safety | ห้าม auto-merge และห้าม AI ปฏิเสธเหตุฉุกเฉินโดยอัตโนมัติ                                             |

## Required verification before Phase 0 sign-off

ต้องทดสอบ unauthorised access ต่อ requests, contacts, people summary, incidents, missions, audit logs และ attachments ต้องตรวจ bundle ว่าไม่มี service-role secret ต้องตรวจ migration ใน Supabase project จริง และต้องทดสอบว่าการเข้าถึง public tracking คืนเฉพาะ public-safe fields

ผลที่ยังไม่ได้ทดสอบต้องรายงานเป็น `NOT VERIFIED` ไม่รายงานว่า RLS ปลอดภัยเพียงเพราะมี policy ในไฟล์ migration

## Current Supabase advisor result

หลัง apply migration และ security hardening แล้ว คำเตือนของ `current_staff_role()` และ `is_staff_role()` หายไปจาก advisor ผลที่ยังเหลือคือ INFO สำหรับตารางที่ตั้งใจเปิด RLS แต่ยังไม่มี policy เพราะ Phase 0 ใช้ default-deny และรอ controlled server/Edge policies ใน phases ถัดไป นอกจากนี้ยังมี WARN ต่อ `public.rls_auto_enable()` ซึ่งเป็น function เดิมของ Supabase project ที่ไม่ได้สร้างโดย migration นี้ จึงยังไม่แก้ไขโดยพลการและต้องให้เจ้าของอนุมัติการเปลี่ยนแปลงแยกต่างหาก

## Anonymous RLS verification contract

การทดสอบ `server/supabase.rls.test.ts` ตรวจตาราง `requests`, `request_contacts`, `request_people_summary`, `incidents`, `incident_requests`, `incident_status_history`, `duplicate_candidates`, `teams`, `missions`, `mission_status_history`, `audit_logs`, `attachments`, `roles` และ `user_profiles` ด้วย publishable key แบบ anonymous

ผลที่ยอมรับได้สำหรับแต่ละตารางคือ HTTP `401` หรือ `403` จาก default-deny หรือ HTTP `200` ที่มีผลลัพธ์ว่างเท่านั้น หาก anonymous client ได้ข้อมูลแถวใด ๆ ถือเป็น security failure และต้องหยุดการส่งมอบ Phase 0 เพื่อแก้ policy/grant ก่อน

## Server enforcement wiring

`server/_core/trpc.ts` มี `roleProcedure` และ `staffProcedure` ที่ตรวจ authenticated user, active staff policy และ allowed roles ก่อนเข้า resolver จริง ส่วน mutation ใน feature phases ต้องใช้ `runAuditedMutation` จาก `server/mutation.ts` ซึ่งเรียก audit ก่อน business mutation และไม่เรียก business mutation หาก audit เขียนไม่ได้

`server/routers.staff.test.ts` ตรวจ viewer/admin behavior และ `server/mutation.test.ts` ตรวจลำดับ audit-before-mutation รวมถึงกรณี audit ล้มเหลว
