# Runbook — แอปพัทลุงต้องรอด

## Local development

ใช้ `pnpm install`, `pnpm dev`, `pnpm check`, `pnpm test` และ `pnpm build` ตามลำดับที่เหมาะสม ห้ามสร้างไฟล์ `.env` หรือใส่ secret ใน repository

## Supabase setup

เมื่อ owner ระบุ project และตั้ง secrets แล้ว ให้ตรวจ `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` และ `SUPABASE_PROJECT_REF` จาก project Secrets จากนั้น apply migration `supabase/migrations/20260820000000_phase0_foundation.sql` ผ่าน migration workflow ที่ควบคุมได้ แล้วตรวจ tables, RLS และ advisors

## Fail-closed behavior

ถ้า Supabase secrets ยังไม่พร้อม server integration boundary ต้องรายงาน configured=false และไม่ควรพยายามใช้ credentials ที่ไม่มีอยู่ ถ้า storage ล่มใน Phase 1 Request ต้องยังสร้างได้ และ attachment ต้องเปลี่ยนเป็น FAILED พร้อม retryable state

## Incident response basics

หากพบ PII รั่วไหล ให้หยุด public endpoint ที่เกี่ยวข้อง, เก็บ timestamp/request ID, ตรวจ audit logs และไม่ลบ operational records หากพบ schema drift ให้หยุด destructive migration, compare migration history และใช้ rollback/recovery procedure ที่เจ้าของอนุมัติ

## Deployment gate

ห้ามรายงานว่า deploy แล้วจนกว่าจะมี URL ที่เปิดตรวจจริง, build ผ่าน, PWA installability ผ่าน, mobile smoke ผ่าน, public-safe API ผ่าน และ unauthorised access test ผ่าน
