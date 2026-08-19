# Staff Authentication Production Boundary

ระบบแยก **production staff authentication** ออกจาก development preview อย่างชัดเจน โดย production request ต้องส่ง Supabase Auth Bearer token ผ่าน `Authorization: Bearer <access-token>` เข้ามาที่ server context จากนั้น server เรียก Supabase Auth ตรวจ token และอ่าน `public.user_profiles` ด้วย user ID ที่ Supabase ยืนยันแล้วเท่านั้น

> Role และ zone ของเจ้าหน้าที่ต้องมาจาก `user_profiles.role_code` และ `user_profiles.zone_id` เสมอ ห้ามเชื่อค่าที่ส่งจาก client หรือ metadata ที่ผู้ใช้แก้ไขเองได้

| Environment         | Identity source            | Role source                                                                   | Intended use                             |
| ------------------- | -------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------- |
| Production          | Supabase Auth access token | `public.user_profiles.role_code`                                              | Staff operations and RLS                 |
| Development preview | Manus platform session     | Explicit development adapter maps `admin` to `ADMIN`, other users to `VIEWER` | Preview only; not a production authority |

The server-side `resolveSupabaseStaffPrincipal` resolver rejects missing, inactive, or unknown-role profiles. The `current_staff_zone()` database helper derives zone from `auth.uid()` and is used by zone-aware RLS policies. `ADMIN` and `COMMANDER` receive the global scope defined by policy; other staff roles are constrained to their active profile zone.

Before production use, the owner must create Supabase Auth staff users, apply migrations `20260820000004_public_intake_atomic.sql` and `20260820000005_zone_aware_rls.sql`, create matching `user_profiles` rows, and run real same-zone/other-zone/admin RLS checks. No password, recovery token, service-role key, or access token belongs in the repository or chat.
