require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Exam } = require('./models');

const exams = [
  { title: 'เบ็ญจะมะมหาราช ม.4 วิชาคณิตศาสตร์', description: 'แนวข้อสอบคณิตศาสตร์สำหรับเตรียมสอบเข้าโรงเรียนเบ็ญจะมะมหาราช', subject: 'คณิตศาสตร์', category: 'สอบเข้าเบ็ญฯ ม.4', difficulty: 'ปานกลาง', duration: 60, questions: [{ prompt: 'ถ้า 2x + 6 = 18 แล้ว x มีค่าเท่าใด?', choices: ['4', '6', '8', '12'], correctAnswer: 1, explanation: 'ย้าย 6 ไปอีกข้าง จะได้ 2x = 12 ดังนั้น x = 6' }] },
  { title: 'สอบเข้า ม.1 รวมวิชาชุดที่ 1', description: 'ฝึกทำข้อสอบรวมสำหรับนักเรียนชั้นประถมศึกษาปีที่ 6 ที่เตรียมสอบเข้า ม.1', subject: 'รวมวิชา', category: 'สอบเข้า ม.1', difficulty: 'ปานกลาง', duration: 90, questions: [{ prompt: 'ข้อใดเป็นจำนวนเฉพาะ?', choices: ['21', '27', '31', '39'], correctAnswer: 2, explanation: '31 หารลงตัวเฉพาะ 1 และ 31' }] },
  { title: 'เบ็ญฯ ม.1 ภาษาอังกฤษ Reading', description: 'อ่านจับใจความและคำศัพท์ที่พบบ่อยในแนวข้อสอบเข้า ม.1', subject: 'ภาษาอังกฤษ', category: 'สอบเข้าเบ็ญฯ ม.1', difficulty: 'ปานกลาง', duration: 45, questions: [{ prompt: 'Choose the closest meaning of “reliable”.', choices: ['สามารถเชื่อถือได้', 'รวดเร็ว', 'ซับซ้อน', 'สร้างสรรค์'], correctAnswer: 0, explanation: 'Reliable หมายถึงน่าเชื่อถือ' }] }
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/benja_mock_exam');
  await Exam.deleteMany({});
  await Exam.insertMany(exams);
  const adminName = 'lifreedod';
  const email = process.env.ADMIN_EMAIL || 'lifreedod@benja.local';
  await User.updateOne({ email }, { name: adminName, email, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'change-this-password', 12), role: 'admin' }, { upsert: true });
  console.log('Seed complete');
  await mongoose.disconnect();
})().catch(error => { console.error(error); process.exit(1); });
