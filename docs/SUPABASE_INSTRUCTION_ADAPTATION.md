# Supabase Instruction Adaptation

## ขอบเขตการตรวจ

ไฟล์แนบเสนอ workflow สำหรับ **Next.js App Router** โดยใช้ `@supabase/ssr`, `next/headers`, Server Components และ `middleware.ts` เพื่ออ่าน/เขียน cookies และ refresh session. โปรเจกต์ **แอปพัทลุงต้องรอด** ใช้ React 19 + Vite, deploy frontend แบบ static บน GitHub Pages และใช้ Supabase Edge Functions เป็น production transport ดังนั้นจึงต้องประยุกต์เฉพาะหลักการที่เข้ากันได้ ไม่คัดลอกไฟล์ Next.js มาใช้โดยตรง

## ผลการตรวจและการตัดสินใจ

| ส่วนในไฟล์แนบ                                     | การตัดสินใจ                                    | เหตุผล                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install @supabase/supabase-js @supabase/ssr` | ใช้เฉพาะ `@supabase/supabase-js` ที่มีอยู่แล้ว | Browser client ของโปรเจกต์ใช้ Vite และไม่ต้องใช้ Next.js SSR cookie adapter                                                               |
| `.env.local` และ `NEXT_PUBLIC_*`                  | ไม่เพิ่ม                                       | ค่าของ Vite ต้องผ่าน `VITE_*` และ Project/GitHub Actions Secrets; ห้าม commit `.env.local` หรือค่า credential                             |
| `utils/supabase/server.ts`                        | ไม่ใช้                                         | อาศัย `next/headers` และ Server Components ซึ่งไม่มีใน React/Vite static frontend                                                         |
| `utils/supabase/client.ts`                        | ประยุกต์แล้วใน `client/src/lib/supabase.ts`    | `getSupabaseBrowserClient()` ใช้ `VITE_SUPABASE_URL` กับ `VITE_SUPABASE_ANON_KEY`, singleton client, session persistence และ auto-refresh |
| `utils/supabase/middleware.ts`                    | ไม่ใช้ใน frontend                              | GitHub Pages ไม่มี Next.js middleware runtime; session/auth boundary อยู่ใน browser provider และ staff API/Edge Function boundary         |
| ตัวอย่าง `todos` Server Component                 | ไม่ใช้                                         | ไม่อยู่ใน Blueprint/PRD และไม่ควรเพิ่มตารางหรือ mock data นอก domain emergency management                                                 |
| `npx skills add supabase/agent-skills`            | ไม่รัน                                         | เป็นคำสั่งเสริมสำหรับ coding-agent tooling ไม่ใช่ runtime dependency และไม่จำเป็นต่อ production artifact                                  |

## Production security boundary

Public Supabase configuration ที่จำเป็นต่อ browser เช่น URL และ publishable/anonymous key ต้องมาจาก environment configuration ของ Vite และ GitHub Actions Secrets เท่านั้น. คีย์ดังกล่าวไม่ใช่ service-role credential; ห้ามนำ `SUPABASE_SERVICE_ROLE_KEY`, JWT secret หรือ credential ฝั่ง server ไปไว้ใน client bundle. Production public mutations และ tracking/attachment authorization ยังคงผ่าน Edge Function boundary, atomic RPC, RLS และ audit semantics ที่มีอยู่เดิม

## Session behavior

`client/src/contexts/SupabaseAuthContext.tsx` เรียก `getSession()` ครั้งแรกและ subscribe `onAuthStateChange()` เพื่อให้ staff session ใน browser สอดคล้องกับ Supabase Auth. การทำงานนี้เป็น browser-compatible equivalent ของ session observation สำหรับสถาปัตยกรรมนี้ โดยไม่เปิด citizen login gate และไม่เปลี่ยน public emergency flow

## Verification

หลังตรวจไฟล์แนบแล้ว ไม่ได้เพิ่ม package หรือ schema และไม่ได้สร้างข้อมูลตัวอย่าง. Regression gates ที่ใช้กับ implementation ปัจจุบันผ่านแล้ว ได้แก่ TypeScript check, Vitest suite 73 tests โดยมี optional Supabase integration 2 tests ที่ skip เมื่อไม่ได้เปิด flag, lint และ production build. ข้อสรุปคือ **นำหลักการ Supabase browser/session configuration มาใช้ผ่าน helper เดิม และไม่นำ Next.js-only server/middleware code มาใส่ในโปรเจกต์นี้**
