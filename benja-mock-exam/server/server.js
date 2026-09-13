require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Exam, Result, Discussion } = require('./models');
const { authRequired, optionalAuth, adminRequired } = require('./middleware');

const app = express();
const port = process.env.PORT || 3000;
const clientPath = path.join(__dirname, '..', 'client');
const examFilesPath = path.join(__dirname, '..', 'uploads', 'exams');
const offlineDiscussions = [];
const memoryExams = [];
let databaseReady = false;
fs.mkdirSync(examFilesPath, { recursive: true });
const examFileUpload = multer({
  storage: multer.diskStorage({
    destination: examFilesPath,
    filename: (req, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 }
});
app.use(express.json({ limit: '1mb' }));
app.use(express.static(clientPath));
app.use('/exam-files', express.static(examFilesPath));

const buildExamDocument = payload => {
  const exam = payload && typeof payload === 'object' ? payload : {};
  const questions = Array.isArray(exam.questions) ? exam.questions.map((question, index) => ({
    prompt: String(question?.prompt || `คำถามข้อที่ ${index + 1}`),
    choices: Array.isArray(question?.choices) ? question.choices.slice(0, 4).map(choice => String(choice)) : ['ตัวเลือกที่ 1', 'ตัวเลือกที่ 2', 'ตัวเลือกที่ 3', 'ตัวเลือกที่ 4'],
    correctAnswer: Number.isInteger(question?.correctAnswer) ? Number(question.correctAnswer) : 0,
    explanation: String(question?.explanation || '')
  })) : [];
  return {
    _id: exam._id || `memory-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: String(exam.title || 'ชุดข้อสอบใหม่'),
    subject: String(exam.subject || 'รวมวิชา'),
    category: String(exam.category || 'สอบเข้า ม.1'),
    difficulty: String(exam.difficulty || 'ปานกลาง'),
    duration: Number(exam.duration) || 60,
    description: String(exam.description || 'ข้อสอบที่นำเข้าจากไฟล์'),
    fileUrl: exam.fileUrl ? String(exam.fileUrl) : '',
    fileName: exam.fileName ? String(exam.fileName) : '',
    fileType: exam.fileType ? String(exam.fileType) : '',
    questions,
    attempts: Number(exam.attempts) || 0,
    createdAt: exam.createdAt || new Date().toISOString()
  };
};

const signUser = user => jwt.sign({ id: user._id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET || 'development-secret', { expiresIn: '7d' });
const getLocalUser = name => {
  const safeName = String(name || '').trim();
  const normalized = safeName.toLowerCase();
  const isAdmin = normalized === 'lifreedod';
  return {
    _id: isAdmin ? 'local-admin' : `local-${Math.random().toString(36).slice(2, 10)}`,
    name: safeName,
    email: `${safeName.toLowerCase().replace(/\s+/g, '.') || 'guest'}@benja.local`,
    role: isAdmin ? 'admin' : 'user'
  };
};
const allowLocalAuth = name => {
  const safeName = String(name || '').trim();
  return safeName.toLowerCase() === 'lifreedod' || !isDatabaseReady();
};
const isDatabaseReady = () => databaseReady && mongoose.connection.readyState === 1;

app.get('/api/health', (req, res) => res.json({ ok: true, database: isDatabaseReady() ? 'connected' : 'disconnected' }));
app.post('/api/auth/register', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'กรุณาใส่ชื่อของคุณก่อนเข้าใช้งาน' });
  const normalized = name.trim();
  if (allowLocalAuth(normalized)) {
    const user = getLocalUser(normalized);
    return res.status(201).json({ token: signUser(user), user: { name: user.name, email: user.email, role: user.role } });
  }
  let user = await User.findOne({ name: normalized });
  if (!user) {
    user = await User.create({
      name: normalized,
      email: `${normalized.toLowerCase().replace(/\s+/g, '.') || 'guest'}@benja.local`,
      passwordHash: await bcrypt.hash('guest-password', 12)
    });
  }
  res.status(201).json({ token: signUser(user), user: { name: user.name, email: user.email, role: user.role } });
});
app.post('/api/auth/login', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'กรุณาใส่ชื่อของคุณก่อนเข้าใช้งาน' });
  if (allowLocalAuth(name)) {
    const user = getLocalUser(name);
    return res.json({ token: signUser(user), user: { name: user.name, email: user.email, role: user.role } });
  }
  let user = await User.findOne({ name });
  if (!user) {
    user = await User.create({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '.') || 'guest'}@benja.local`,
      passwordHash: await bcrypt.hash('guest-password', 12)
    });
  }
  res.json({ token: signUser(user), user: { name: user.name, email: user.email, role: user.role } });
});
app.get('/api/exams', async (req, res) => {
  if (!isDatabaseReady()) {
    const query = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const list = memoryExams.filter(exam => {
      if (req.query.subject && exam.subject !== req.query.subject) return false;
      if (req.query.category && !String(exam.category || '').includes(String(req.query.category))) return false;
      if (!query) return true;
      const haystack = `${exam.title} ${exam.subject} ${exam.category} ${exam.description || ''}`.toLowerCase();
      return haystack.includes(query);
    });
    return res.json(list.map(exam => ({ ...exam, questions: exam.questions?.length ? exam.questions : [] })));
  }
  const query = {};
  if (req.query.subject) query.subject = req.query.subject;
  if (req.query.category) query.category = req.query.category;
  if (req.query.search) query.title = { $regex: req.query.search, $options: 'i' };
  res.json(await Exam.find(query).select('-questions').sort({ createdAt: -1 }));
});
app.get('/api/exams/:id', async (req, res) => {
  if (!isDatabaseReady()) {
    const exam = memoryExams.find(item => item._id === req.params.id);
    if (!exam) return res.status(404).json({ message: 'ไม่พบข้อสอบชุดนี้' });
    return res.json(exam);
  }
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ message: 'ไม่พบข้อสอบชุดนี้' });
  res.json(exam);
});
app.get('/api/discussions', async (req, res) => {
  const category = ['ม.1', 'ม.4'].includes(req.query.category) ? req.query.category : null;
  if (!isDatabaseReady()) return res.json(offlineDiscussions.filter(post => !category || post.category === category).slice(-30).reverse());
  const query = category ? { category } : {};
  res.json(await Discussion.find(query).sort({ createdAt: -1 }).limit(30));
});
app.post('/api/discussions', async (req, res) => {
  const author = String(req.body.author || '').trim();
  const title = String(req.body.title || 'ข้อความใน community').trim();
  const content = String(req.body.content || '').trim();
  if (!author || !content) return res.status(400).json({ message: 'กรุณากรอกชื่อและข้อความให้ครบ' });
  if (author.length > 80 || title.length > 160 || content.length > 2000) return res.status(400).json({ message: 'ข้อความยาวเกินกำหนด' });
  const category = ['ม.1', 'ม.4'].includes(req.body.category) ? req.body.category : 'ม.1';
  const post = { author, title, content, category, createdAt: new Date() };
  if (!isDatabaseReady()) { offlineDiscussions.push(post); return res.status(201).json(post); }
  res.status(201).json(await Discussion.create(post));
});
app.post('/api/exams/:id/submit', optionalAuth, async (req, res) => {
  if (!isDatabaseReady()) {
    const memoryExam = memoryExams.find(item => item._id === req.params.id);
    if (!memoryExam) return res.status(404).json({ message: 'ไม่พบข้อสอบชุดนี้' });
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const score = memoryExam.questions.reduce((total, question, index) => total + (answers[index] === question.correctAnswer ? 1 : 0), 0);
    const total = memoryExam.questions.length;
    return res.status(201).json({ score, total, percentage: total ? Math.round(score / total * 100) : 0, saved: false });
  }
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ message: 'ไม่พบข้อสอบชุดนี้' });
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const score = exam.questions.reduce((total, question, index) => total + (answers[index] === question.correctAnswer ? 1 : 0), 0);
  const percentage = exam.questions.length ? Math.round(score / exam.questions.length * 100) : 0;
  if (!req.user) return res.status(201).json({ score, total: exam.questions.length, percentage, saved: false });
  const result = await Result.create({ userId: req.user.id, examId: exam.id, score, total: exam.questions.length, percentage, timeSpent: Number(req.body.timeSpent) || 0, answers });
  await Exam.updateOne({ _id: exam.id }, { $inc: { attempts: 1 } });
  res.status(201).json({ resultId: result.id, score: result.score, total: result.total, percentage: result.percentage });
});
app.get('/api/results/:id', authRequired, async (req, res) => {
  const result = await Result.findOne({ _id: req.params.id, userId: req.user.id }).populate('examId');
  if (!result) return res.status(404).json({ message: 'ไม่พบผลสอบนี้' });
  res.json(result);
});
app.get('/api/dashboard', authRequired, async (req, res) => {
  const results = await Result.find({ userId: req.user.id }).populate('examId', 'title subject').sort({ completedAt: -1 }).limit(10);
  const summary = await Result.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(req.user.id) } }, { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$percentage' }, best: { $max: '$percentage' } } }]);
  res.json({ user: req.user, summary: summary[0] || { count: 0, average: 0, best: 0 }, results });
});
app.post('/api/admin/exams', authRequired, adminRequired, async (req, res) => {
  const payload = buildExamDocument(req.body);
  if (!isDatabaseReady()) {
    memoryExams.unshift(payload);
    return res.status(201).json(payload);
  }
  const exam = await Exam.create(payload);
  res.status(201).json(exam);
});
app.post('/api/admin/exams/import', authRequired, adminRequired, async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : (req.body?.exams ? req.body.exams : [req.body]);
  const exams = payload.map(buildExamDocument).filter(exam => exam.questions.length > 0 || exam.title);
  if (!isDatabaseReady()) {
    memoryExams.unshift(...exams);
    return res.status(201).json(exams);
  }
  const saved = await Promise.all(exams.map(exam => Exam.create(exam)));
  res.status(201).json(saved);
});
app.post('/api/admin/exams/upload-file', authRequired, adminRequired, examFileUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'กรุณาเลือกไฟล์ข้อสอบ' });
  const category = String(req.body.category || 'สอบเข้าเบ็ญฯ ม.4');
  const title = String(req.body.title || req.file.originalname.replace(/\.[^.]+$/, ''));
  const payload = buildExamDocument({
    title,
    subject: 'เอกสารข้อสอบ',
    category,
    description: `ไฟล์ข้อสอบ ${req.file.originalname}`,
    fileUrl: `/exam-files/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
    questions: []
  });
  if (!isDatabaseReady()) {
    memoryExams.unshift(payload);
    return res.status(201).json(payload);
  }
  const exam = await Exam.create(payload);
  res.status(201).json(exam);
});
app.put('/api/admin/exams/:id', authRequired, adminRequired, async (req, res) => {
  if (!isDatabaseReady()) {
    const index = memoryExams.findIndex(exam => exam._id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'ไม่พบข้อสอบชุดนี้' });
    memoryExams[index] = { ...memoryExams[index], ...buildExamDocument(req.body), _id: req.params.id };
    return res.json(memoryExams[index]);
  }
  const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!exam) return res.status(404).json({ message: 'ไม่พบข้อสอบชุดนี้' });
  res.json(exam);
});
app.delete('/api/admin/exams/:id', authRequired, adminRequired, async (req, res) => {
  if (!isDatabaseReady()) {
    const index = memoryExams.findIndex(exam => exam._id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'ไม่พบข้อสอบชุดนี้' });
    memoryExams.splice(index, 1);
    return res.status(204).end();
  }
  const exam = await Exam.findByIdAndDelete(req.params.id);
  if (!exam) return res.status(404).json({ message: 'ไม่พบข้อสอบชุดนี้' });
  res.status(204).end();
});
app.get('/api/admin/exams', authRequired, adminRequired, async (req, res) => {
  if (!isDatabaseReady()) return res.json(memoryExams);
  res.json(await Exam.find().sort({ createdAt: -1 }));
});
app.get('/api/admin/users', authRequired, adminRequired, async (req, res) => res.json(await User.find().select('name email role createdAt').sort({ createdAt: -1 })));
app.get('/*splat', (req, res) => res.sendFile(path.join(clientPath, 'index.html')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/benja_mock_exam', {
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000,
  socketTimeoutMS: 3000
}).then(() => {
  databaseReady = true;
  app.listen(port, () => console.log(`Benja Mock Exam running at http://localhost:${port}`));
}).catch(error => {
  databaseReady = false;
  console.error('MongoDB connection failed:', error.message);
  app.listen(port, () => console.log(`Benja Mock Exam running without database at http://localhost:${port}`));
});
