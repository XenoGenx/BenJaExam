const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  choices: { type: [String], required: true },
  correctAnswer: { type: Number, required: true },
  explanation: String
}, { _id: true });

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  subject: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ['ง่าย', 'ปานกลาง', 'ยาก'], default: 'ปานกลาง' },
  duration: { type: Number, default: 60 },
  attempts: { type: Number, default: 0 },
  fileUrl: String,
  fileName: String,
  fileType: String,
  questions: [questionSchema],
  createdAt: { type: Date, default: Date.now }
});

const resultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  score: Number,
  total: Number,
  percentage: Number,
  timeSpent: Number,
  answers: [Number],
  completedAt: { type: Date, default: Date.now }
});

const discussionSchema = new mongoose.Schema({
  author: { type: String, required: true, trim: true, maxlength: 80 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  category: { type: String, default: 'ทั่วไป' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Exam: mongoose.model('Exam', examSchema),
  Result: mongoose.model('Result', resultSchema),
  Discussion: mongoose.model('Discussion', discussionSchema)
};
