# TEST E2E credential (local evidence only)

สร้างจาก Citizen Intake บน HTTPS preview ด้วยข้อมูล TEST เท่านั้น เมื่อ 2026-08-20:

- Case ID: `PTL-2026-79516B57`
- Tracking token: `6A_Fcv1DkswflMQu39JqpXBms_zp0SrF`
- Source flow: Intake UI → IndexedDB pending → manual retry → server acknowledgement

ห้าม commit หรือเผยแพร่ไฟล์นี้ใน production artifacts. ใช้เฉพาะระหว่าง final verification แล้วลบ/ทำให้หมดอายุด้วย cleanup procedure ที่ owner อนุญาต.
