from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class ClassType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # "ห้องพิเศษ" or "ห้องธรรมดา"
    description = db.Column(db.String(200))
    
    exams = db.relationship('Exam', backref='class_type', lazy=True)

class Program(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # EEP, SMTE, YSP, AP, EP
    description = db.Column(db.String(200))
    
    exams = db.relationship('Exam', backref='program', lazy=True)

class Exam(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    filename = db.Column(db.String(300), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    answer_filename = db.Column(db.String(300))
    answer_filepath = db.Column(db.String(500))
    description = db.Column(db.Text)
    class_type_id = db.Column(db.Integer, db.ForeignKey('class_type.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('program.id'))
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    comments = db.relationship('Comment', backref='exam', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Exam {self.title} ({self.year})>'

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exam.id'), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Comment {self.author}>'
