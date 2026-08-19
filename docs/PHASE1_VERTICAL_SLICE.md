# Phase 1 Vertical Slice Status

## Implemented

Emergency Home เปิดให้ประชาชนเข้าถึงโดยไม่ต้อง login และปุ่มขอความช่วยเหลือนำไปยัง `/intake` Citizen Intake มี 4 ขั้นตอน ได้แก่ จุดเกิดเหตุ ประเภทเหตุ จำนวนผู้ต้องการความช่วยเหลือ และช่องทางติดต่อ พร้อม Back/Next และคงข้อมูลใน React wizard state เมื่อย้อนกลับ

Client-side validation ครอบคลุมตำแหน่ง ประเภทเหตุ จำนวนผู้ต้องการความช่วยเหลือ เบอร์โทร และ consent การติดต่อกลับ ส่วน IndexedDB queue ใช้ `clientRequestId` เป็น key, persist payload ก่อน acknowledgement, แยก PENDING/SENDING/SENT/FAILED และมี bounded exponential retry กับ jitter

## Not yet implemented

Controlled server acknowledgement, durable Request insert, Case ID และ hashed tracking token ถูกเพิ่มใน `server/intake.ts` และ `intake.submit` แล้ว โดยใช้ service-role boundary, `clientRequestId` idempotency lookup และ audit ก่อน mutation ส่วน public-safe tracking read path, rate limit ที่ production edge และการตรวจ live write กับข้อมูลจริงยังรอ owner approval/operational rollout จึงยังไม่แสดงรายละเอียดเคสหรือ tracking token ใน public tracking page

## Verification

`client/src/lib/offlineQueue.test.ts` ตรวจ persistence, retry schedule, SENT transition หลัง acknowledgement และ FAILED retryable state โดยใช้ fake IndexedDB ขณะที่ `QueueRuntime` เรียก drain ตอน app start และ browser online event ผ่าน `trpc.intake.submit` ทุกครั้งที่มีการเปลี่ยนแปลง queue contract ต้องเพิ่ม test ก่อนส่งมอบ
