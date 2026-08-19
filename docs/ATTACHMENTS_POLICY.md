# Attachments Policy — Source of Truth

เอกสารนี้สรุปข้อกำหนดจากเอกสารอ้างอิงของโปรเจคสำหรับระบบแนบไฟล์ โดยยึด System Blueprint, PRD และ Research ที่อยู่ใน project shared files

## Locked product requirements

| Requirement       | Decision                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Critical path     | สร้าง Request ก่อน แล้วค่อย upload attachment แยกภายหลัง                                                             |
| Failure isolation | รูป/เอกสาร upload ล้มเหลวต้องไม่ทำให้ Request หลักล้มเหลว                                                            |
| Optionality       | Attachment เป็น optional ไม่บังคับก่อนส่งเหตุ                                                                        |
| Lifecycle         | `PENDING` → `UPLOADING` → `READY` หรือ `FAILED`                                                                      |
| Access            | Private/controlled storage; public ห้ามอ่านไฟล์ตรงและห้าม public-write bucket                                        |
| Security          | Validate type/size ฝั่ง client และ server, จำกัด content length, audit เหตุการณ์, ไม่เปิด service role ให้ client    |
| Resilience        | รองรับ storage outage, offline pending, retry และไม่อ้างว่าสำเร็จก่อน server acknowledgement                         |
| Privacy           | ไม่เปิดเผยเบอร์โทรหรือพิกัดบ้านใน public surface; attachment ใช้ signed/authorized access และต้องมี retention policy |

## Implementation contract

Request payload ต้องถูกบันทึก durable ก่อน ไฟล์จะใช้ `request_id` ที่ได้รับจาก server เป็น parent reference และมี client-side attachment idempotency key แยกต่างหาก ไฟล์ที่รอส่งในเครื่องต้องมี metadata เท่านั้นเท่าที่จำเป็นต่อการ retry และต้องลบหรือเปลี่ยนสถานะเมื่อ upload สำเร็จ/ล้มเหลวตาม retention policy

ชนิดไฟล์และขนาดที่ใช้ใน MVP จะต้องกำหนดเป็น allowlist แบบ explicit ไม่เชื่อ extension เพียงอย่างเดียว และต้องตรวจ MIME ที่ server อีกครั้ง ขนาดรวมและจำนวนไฟล์ต้องถูกจำกัดเพื่อป้องกัน abuse ส่วน malware scanning และ retention duration ต้องเป็น owner action ก่อน production rollout

## Sources

- `16 - System Blueprint ฉบับหลัก แอปพัทลุงต้องรอด.md`: ระบุให้ upload รูปแยกจาก Request, ใช้ Supabase Storage และ Edge/API layer
- `17 - PRD.md ฉบับพัฒนาจริง แอปพัทลุงต้องรอด.md`: ระบุ upload หลัง Request, failure isolation และสถานะ `PENDING/UPLOADING/READY/FAILED`; ยังกำหนด validation, private storage, controlled upload และ rate-limit/security requirements
- `05 - Research ความทนทาน Offline แผนที่ และต้นทุนระบบ.md`: ระบุให้บีบอัดรูปฝั่งมือถือ, ไม่บังคับรูป, ส่งข้อความก่อนแล้ว upload รูปภายหลัง
- `09 - Research Privacy PDPA และสิทธิ์การเข้าถึงข้อมูล.md`: ระบุ private storage, signed/authorized access และ retention policy
- `13 - Research Resilience Load Testing Anti-Abuse และ Recovery.md`: ระบุ storage outage เป็น failure mode, optional attachment pipeline และ critical path ที่ต้องไม่พึ่งรูป

## WebDev storage constraint

ตาม `/home/ubuntu/skills/webdev-file-storage/SKILL.md` ไฟล์จริงต้องเก็บผ่าน `storagePut` ใน server storage boundary และ metadata/key ต้องเก็บในฐานข้อมูล ห้ามเก็บ bytes ใน database และห้ามนำ service credentials ไปฝั่ง client
