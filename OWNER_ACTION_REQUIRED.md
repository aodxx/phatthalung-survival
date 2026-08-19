# OWNER ACTION REQUIRED

เอกสารนี้รวบรวมการตั้งค่าที่ต้องดำเนินการโดยเจ้าของระบบเอง รายการเหล่านี้ไม่ควรหยุดการพัฒนา frontend shell, schema, migrations, tests และเอกสาร แต่ต้องเสร็จก่อนยืนยันว่า Phase 0 เชื่อมต่อ Supabase และ deploy ใช้งานจริงครบตาม Exit Criteria

## 1. เลือกหรือสร้าง Supabase project สำหรับแอป

**ต้องทำอะไร:** เลือก Supabase project ที่จะเป็นฐานข้อมูลจริงของ “แอปพัทลุงต้องรอด” ปัจจุบันยังไม่พบ project ที่ระบุชื่อนี้ และยังไม่ควรนำ project อื่นที่มีอยู่มาใช้โดยไม่ยืนยัน เพราะอาจทำให้ข้อมูลคนละระบบปะปนกัน

**เข้าเว็บไหน:** [Supabase Dashboard](https://supabase.com/dashboard)

**กดตรงไหน:** สร้าง project ใหม่ใน organization ที่ต้องการ หรือระบุ project เดิมที่เจ้าของยืนยันว่าใช้กับแอปนี้โดยเฉพาะ

**ต้องกรอกอะไร:** ชื่อ project, database password, region ที่เหมาะกับผู้ใช้ในไทย และ billing/plan ตามนโยบายของเจ้าของระบบ

**ห้ามส่งอะไรเข้า Chat:** ห้ามส่ง database password, service role key, access token หรือ secret ใด ๆ ในแชต

**หลังทำเสร็จ:** แจ้งเพียง project reference/URL ผ่านช่องทางตั้งค่า Secrets ของโปรเจค หรือกรอกค่าผ่านการ์ด Secrets ที่ระบบจัดเตรียมให้ แล้วให้ระบบทดสอบ migration และ RLS ต่อ

## 2. ตั้งค่า Supabase environment variables

ค่าที่ต้องตั้งผ่านระบบ Secrets ของโปรเจค ไม่ควร commit ลง repository:

| Variable                    | ใช้สำหรับ                                                     | เปิดเผยฝั่งไหน                             |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| `VITE_SUPABASE_URL`         | URL ของ Supabase project                                      | Frontend ได้เฉพาะ URL                      |
| `VITE_SUPABASE_ANON_KEY`    | publishable/anon key สำหรับ client ตาม RLS                    | Frontend ได้ แต่ต้องไม่ใช้แทนสิทธิ์ server |
| `SUPABASE_SERVICE_ROLE_KEY` | controlled server/Edge operations เช่น intake acknowledgement | Server/Edge เท่านั้น ห้ามอยู่ client       |
| `SUPABASE_PROJECT_REF`      | อ้างอิง project สำหรับ migration/deployment workflow          | Server/CI เท่านั้น                         |

**หลังทำเสร็จ:** ทดสอบว่า client ต่อ URL ได้, server ไม่ส่ง service role key ออกมา และ migration สามารถ apply ได้ใน project ที่เลือก

## 3. ตั้งค่า Staff Auth และ role bootstrap

**ต้องทำอะไร:** เปิดวิธีเข้าสู่ระบบเจ้าหน้าที่ใน Supabase Auth และกำหนดผู้ดูแลเริ่มต้นอย่างน้อยหนึ่งราย

**กดตรงไหน:** Supabase Dashboard → Authentication → Providers และ Authentication → Users

**ต้องกรอกอะไร:** provider ที่องค์กรอนุมัติ เช่น email/password หรือ provider อื่นที่ตั้งค่าแล้ว พร้อมสร้าง staff user ที่ได้รับอนุญาต

**ห้ามส่งอะไรเข้า Chat:** password, OAuth client secret, recovery token หรือ magic-link token

**หลังทำเสร็จ:** ให้ระบบสร้าง/ตรวจ `user_profiles` และ role code โดยใช้ migration/SQL ที่มี audit และ RLS ควบคุม ไม่แก้สิทธิ์ด้วยการซ่อนปุ่มใน UI อย่างเดียว

## 4. ตั้งค่า Storage สำหรับ attachments เมื่อเข้าสู่ Phase 1

**ต้องทำอะไร:** สร้าง private bucket สำหรับรูปแนบ และกำหนด policy ให้ไม่มี public write

**กดตรงไหน:** Supabase Dashboard → Storage → New bucket

**ต้องกรอกอะไร:** bucket แบบ private, จำกัด MIME type และขนาดไฟล์ตามนโยบายที่อนุมัติ

**หลังทำเสร็จ:** ทดสอบว่า request ยังสร้างได้เมื่อ storage ใช้งานไม่ได้ และไฟล์เข้าถึงได้เฉพาะ signed/authorized path

## 5. ตั้งค่าการเผยแพร่เว็บไซต์และโดเมนเมื่อพร้อม deploy

**ต้องทำอะไร:** ตรวจชื่อโดเมน, HTTPS, PWA installability และ policy สำหรับข้อมูลสาธารณะ

**หลังทำเสร็จ:** ทดสอบ mobile viewport, offline shell, secure headers, public API ที่ไม่ส่ง PII และ workflow backup/recovery ก่อนเปิดให้ประชาชนใช้
