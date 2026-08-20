# OWNER ACTION REQUIRED

เอกสารนี้รวบรวมการตั้งค่าที่ต้องดำเนินการโดยเจ้าของระบบเอง รายการเหล่านี้ไม่ควรหยุดการพัฒนา frontend shell, schema, migrations, tests และเอกสาร แต่ต้องเสร็จก่อนยืนยันว่า Phase 0 เชื่อมต่อ Supabase และ deploy ใช้งานจริงครบตาม Exit Criteria

## Latest fixing-pass verification

พบ Supabase project ชื่อ `phatthalung-survival` ที่ active และใช้ migration path ของ PostgreSQL จริงแล้ว โดย apply atomic public intake RPC และ zone-aware RLS/phone validation สำเร็จ การทดสอบ rollback จริงผ่าน: child contact insert ที่ตั้งใจให้ผิดรูปแบบทำให้ไม่เหลือ request หรือ audit row ใด ๆ ระบบไม่ได้สร้าง persistent test user, zone, request หรือ staff data

ยังต้องให้เจ้าของระบบจัดเตรียม staff identities และ zone assignments ที่ได้รับอนุมัติ เพราะฐานปัจจุบันมี `zones` และ `user_profiles` เป็นศูนย์ จากนั้นจึงทดสอบ same-zone allowed, other-zone denied, inactive/unknown-role denied และ ADMIN/COMMANDER override จริง ห้ามส่ง password, access token, recovery link หรือ service-role key ในแชต

## 1. เลือกหรือสร้าง Supabase project สำหรับแอป

**ต้องทำอะไร:** ยืนยันว่า Supabase project `phatthalung-survival` ที่ active เป็นฐานข้อมูลจริงของ “แอปพัทลุงต้องรอด” และไม่ใช่ project อื่นขององค์กร

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

**สถานะล่าสุด:** GitHub Pages production deployment สำเร็จผ่าน workflow runs `32325960656` และ `32325737498`; HTTPS และ PWA shell/direct-route smoke ผ่านบางส่วน โดย Home CTA แบบ cache-busted ไปยัง `/phatthalung-survival/intake` และ direct Tracking route แสดง shell ได้ ส่วน offline reconnect drain, secure-header review และ backup/recovery ยังต้องทดสอบ/อนุมัติเพิ่มเติมก่อนเปิดใช้งานจริง

## 6. ยืนยันนโยบาย production สำหรับ attachments

ก่อนเปิดใช้งานจริง เจ้าของระบบต้องยืนยันระยะเวลาเก็บไฟล์ งบประมาณ storage กระบวนการตรวจ malware/antivirus และค่า rate limit สำหรับ public upload ปัจจุบัน implementation ใช้ storage boundary ของแพลตฟอร์ม, controlled server route, allowlist JPG/PNG/WebP/PDF, จำกัดไฟล์ละ 10 MB และกำหนดสูงสุด 3 ไฟล์ใน client policy แต่ยังไม่ถือว่าการสแกน malware หรือ rate limiting production เสร็จสมบูรณ์

## 9. ตั้งค่า GitHub Actions secrets สำหรับ Supabase production frontend

สถานะ **เสร็จแล้วตามที่ owner ยืนยัน**: repository secrets `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ถูกตั้งค่าใน `aodxx/phatthalung-survival` และ Pages workflow runs `32325960656`/`32325960697` ผ่าน โดย build ใช้ `VITE_RUNTIME_BACKEND=supabase`; ไม่มี secret ถูก commit หรือฝังใน source

## 9. Owner gate ก่อนเปิดใช้ Phase 2 Operations

โค้ด Phase 2 มี queue query, role/zone enforcement, audited RPCs และ Operations route แล้ว แต่ยังไม่ควรเปิด workflow ปฏิบัติการจริงจนกว่าเจ้าของระบบจะสร้าง staff users ใน Supabase Auth และเพิ่ม `user_profiles` ที่มี `role_code`, `zone_id` และ `active = true` ตาม policy ขององค์กร งานนี้ต้องทำกับบัญชีจริงที่ได้รับอนุญาตเท่านั้น ห้ามใช้ TEST fixture หรือ mock operational data ใน production

เจ้าของระบบต้องยืนยัน matrix สิทธิ์ของ `ADMIN`, `COMMANDER`, `TRIAGE`, `OPERATIONS`, `FIELD` และ `VIEWER`, รวมถึงกำหนดว่าบทบาทใดเห็นข้อมูลข้ามโซนได้ จากนั้นจึงให้ทดสอบ browser session ด้วย access token จริงในหน้า `/operations`: queue ต้องแสดงเฉพาะ zone ที่ได้รับอนุญาต, role ที่ไม่มีสิทธิ์ต้องได้สถานะปฏิเสธ, และ mutation ทุกชนิดต้องมีเหตุผลพร้อม audit row

Migration `phase2_operations` ถูก apply ใน Supabase project `ulawoqswzqfpqyssxggn` แล้ว โดย RPC เหล่านี้เปิด execute ให้เฉพาะ `service_role`; frontend ห้ามเรียก RPC โดยตรงและห้ามเก็บ service-role key ไว้ใน Pages bundle
