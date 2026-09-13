# Benja Mock Exam

แพลตฟอร์มข้อสอบออนไลน์สำหรับเตรียมสอบเข้าโรงเรียนเบ็ญจะมะมหาราชและสนามสอบ ม.1 ภายใต้ concept “สนามซ้อมก่อนสนามจริง” สร้างด้วย Express, MongoDB/Mongoose และ Vanilla HTML/CSS/JavaScript

## Run locally

1. ติดตั้ง Node.js 20 ขึ้นไป และ MongoDB local หรือสร้าง MongoDB Atlas database
2. เปิดโฟลเดอร์นี้แล้วติดตั้ง dependencies

```bash
npm install
```

3. คัดลอก `.env.example` เป็น `.env` แล้วกำหนด `MONGODB_URI` และ `JWT_SECRET`
4. seed ข้อมูลตัวอย่าง (ต้องเชื่อม MongoDB ได้)

```bash
npm run seed
```

5. เริ่ม server

```bash
npm run dev
```

เปิด `http://localhost:3000`

## API ที่มีให้

- `GET /api/health` ตรวจ server และสถานะ MongoDB
- `POST /api/auth/register` สมัครสมาชิก
- `POST /api/auth/login` เข้าสู่ระบบ
- `GET /api/exams` ค้นหาและกรองข้อสอบ
- `GET /api/exams/:id` ดูข้อสอบพร้อมคำถาม
- `POST /api/exams/:id/submit` ส่งคำตอบและบันทึกผล
- `GET /api/results/:id` ดูผลสอบของผู้ใช้
- `GET /api/dashboard` ดูสถิติของผู้ใช้
- `POST/PUT/DELETE /api/admin/exams` จัดการข้อสอบสำหรับ admin
- `GET /api/admin/users` ดูผู้ใช้สำหรับ admin

## Deploy บน Render

1. สร้าง MongoDB Atlas database และคัดลอก connection string
2. สร้าง Web Service จากโฟลเดอร์ `benja-mock-exam` หรือใช้ Blueprint จาก `render.yaml`
3. ตั้งค่า environment variables ใน Render:
	- `MONGODB_URI` = connection string จาก MongoDB Atlas
	- `JWT_SECRET` = สร้างค่าแบบสุ่มยาวๆ (Blueprint สร้างให้อัตโนมัติ)
	- `NODE_ENV` = `production`
4. Build command: `npm install`
5. Start command: `npm start`
6. หลัง deploy สำเร็จ ทดสอบ `https://โดเมนของคุณ/api/health` ต้องได้ `ok: true`

หมายเหตุ: Render free web service ใช้ดิสก์ชั่วคราว ไฟล์ PDF/รูปที่อัปโหลดอาจหายเมื่อ service restart หรือ redeploy หากต้องการเก็บไฟล์ถาวรควรย้ายไฟล์ไป Cloudinary, Amazon S3 หรือ Supabase Storage ก่อนเปิดใช้งานจริง

## สถานะ

หน้า marketing, auth API, exam listing/detail, timed exam runner, result persistence, dashboard API และ admin exam CRUD ถูกเตรียมไว้แล้ว โดย `Dashboard`, `Leaderboard` และหน้าจอ Admin แบบเต็มสามารถต่อยอดบน API ที่แยกไว้ได้ในขั้นถัดไป
