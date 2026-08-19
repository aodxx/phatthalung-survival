# Environment Management

ค่าลับของโปรเจคนี้ต้องจัดการผ่าน **Project Secrets** เท่านั้น ห้ามสร้างหรือ commit `.env`, `.env.local` หรือ `.env.example` ลง repository เพราะ runtime ของแพลตฟอร์ม inject ค่าให้โดยตรง

| Variable                    | ใช้สำหรับ                         | Client-safe     |
| --------------------------- | --------------------------------- | --------------- |
| `VITE_SUPABASE_URL`         | URL ของ Supabase project          | ใช่             |
| `VITE_SUPABASE_ANON_KEY`    | publishable/anon key ภายใต้ RLS   | ใช่             |
| `SUPABASE_URL`              | server-side Supabase URL          | ไม่ใช้ใน client |
| `SUPABASE_SERVICE_ROLE_KEY` | controlled server/Edge operation  | ห้ามเปิดเผย     |
| `SUPABASE_PROJECT_REF`      | migration and operations workflow | ไม่ใช้ใน client |

ค่าที่จำเป็นสำหรับการทดสอบ read-only Supabase และ migration ถูกตั้งผ่าน Project Secrets แล้ว ส่วน service role key ต้องตั้งก่อนเปิดใช้ server mutation จริงตาม `OWNER_ACTION_REQUIRED.md`

ระบบจะ fail closed เมื่อค่าฝั่ง server ไม่ครบ และ browser client จะไม่ถูกสร้างเมื่อ URL หรือ publishable key ไม่ครบ
