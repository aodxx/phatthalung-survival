# Phase 1 Vertical Slice Status

## Implemented

Emergency Home เปิดให้ประชาชนเข้าถึงโดยไม่ต้อง login และปุ่มขอความช่วยเหลือนำไปยัง `/intake` Citizen Intake มี 4 ขั้นตอน ได้แก่ จุดเกิดเหตุ ประเภทเหตุ จำนวนผู้ต้องการความช่วยเหลือ และช่องทางติดต่อ พร้อม Back/Next และคงข้อมูลใน React wizard state เมื่อย้อนกลับ

Client-side validation ครอบคลุมตำแหน่ง ประเภทเหตุ จำนวนผู้ต้องการความช่วยเหลือ เบอร์โทร และ consent การติดต่อกลับ ส่วน IndexedDB queue ใช้ `clientRequestId` เป็น key, persist payload ก่อน acknowledgement, แยก PENDING/SENDING/SENT/FAILED และมี bounded exponential retry กับ jitter

## Not yet implemented

Controlled server acknowledgement, durable Request insert, Case ID, secure tracking token และ public-safe tracking ยังไม่เปิดใช้งานใน vertical slice นี้ เพราะต้องสร้าง Intake API/Edge boundary ที่มี service role configuration, rate limit, idempotency และ audit integration ครบก่อน จึงยังไม่แสดงข้อความ “ส่งสำเร็จ” ให้ประชาชน

## Verification

`client/src/lib/offlineQueue.test.ts` ตรวจ persistence, retry schedule, SENT transition หลัง acknowledgement และ FAILED retryable state โดยใช้ fake IndexedDB ทุกครั้งที่มีการเปลี่ยนแปลง queue contract ต้องเพิ่ม test ก่อนส่งมอบ
