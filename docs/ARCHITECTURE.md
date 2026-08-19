# Architecture — แอปพัทลุงต้องรอด

## Locked decisions

ระบบใช้ React + Vite + TypeScript เป็น frontend แบบ mobile-first PWA ใช้ Supabase/PostgreSQL เป็น System of Record ใช้ Supabase Auth สำหรับ staff ใช้ Row Level Security เป็น enforcement หลัก และใช้ Edge Functions หรือ controlled API layer สำหรับ public intake, server validation, idempotency, rate limiting และการคืน tracking acknowledgement

Maps เป็น optional visualization layer และ Browser Geolocation เป็น primary location capture ห้าม Critical Submit พึ่ง Maps provider, รูปภาพ, Realtime หรือการ login ของประชาชน

## Product model

| Entity   | ความหมาย                                     | กฎสำคัญ                                                |
| -------- | -------------------------------------------- | ------------------------------------------------------ |
| Request  | คำร้องดิบหนึ่งครั้งจากประชาชนหรือช่องทางอื่น | คงอยู่ตลอดอายุระบบและมี `client_request_id` แบบ unique |
| Incident | เหตุจริงที่เจ้าหน้าที่กำลังจัดการ            | อาจรวมหลาย Request และมี lifecycle แยกต่างหาก          |
| Mission  | งานที่มอบหมายให้ทีม                          | Incident หนึ่งรายการมีหลาย Mission ได้                 |
| Alert    | ประกาศหรือคำเตือนที่เผยแพร่สาธารณะ           | ต้องมี source และ version history                      |

## Critical submission contract

```text
client validate
→ create clientRequestId
→ persist payload to IndexedDB as PENDING
→ POST controlled Intake API
→ server validate and enforce unique clientRequestId
→ insert durable Request
→ issue case code and secure tracking token
→ server acknowledgement
→ mark local record SENT
→ show “ส่งสำเร็จ”
```

หากไม่มี server acknowledgement ให้แสดงสถานะรอส่งเท่านั้น ไม่ว่า shell หรือ local queue จะทำงานแล้วก็ตาม

## Data boundaries

Public endpoints ต้องคืนเฉพาะ public-safe status และข้อมูล aggregate ที่ลดความละเอียดแล้ว ส่วนชื่อ เบอร์โทร พิกัดละเอียด ข้อมูลสุขภาพ รูปภาพ ข้อมูลทีม และ internal timeline อยู่ใน private operations boundary เท่านั้น

## Phase boundary

Phase 0 ทำ foundation, schema, migrations, auth/RLS skeleton, PWA shell, environment management, CI, lint และ tests เท่านั้น Phase 1 จึงเริ่ม 4-step Citizen Intake, IndexedDB Local Queue, Intake API, idempotency, Case ID, secure tracking และ optional attachment upload
