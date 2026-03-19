from flask import Flask, render_template, request, redirect, url_for, flash, send_file, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from models import db, ClassType, Program, Exam, Comment
import os
from datetime import datetime
from functools import wraps

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'exams.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ADMIN_PASSWORD'] = 'bm113tub17'  # Change this in production!

db.init_app(app)

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'exams'), exist_ok=True)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_name' not in session:
            flash('กรุณาเข้าสู่ระบบก่อน', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'is_admin' not in session or not session.get('is_admin'):
            flash('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'error')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

def init_db():
    """Initialize database with default data"""
    with app.app_context():
        db.create_all()
        
        # Add class types if they don't exist
        if ClassType.query.count() == 0:
            regular_class = ClassType(name='ห้องธรรมดา', description='ห้องเรียนธรรมดา')
            special_class = ClassType(name='ห้องพิเศษ', description='ห้องเรียนพิเศษ')
            db.session.add_all([regular_class, special_class])
            db.session.commit()
        
        # Add programs if they don't exist
        if Program.query.count() == 0:
            programs = [
                Program(name='EEP', description='Excellent Education Program'),
                Program(name='SMTE', description='Science Mathematics Technology Environment'),
                Program(name='YSP', description='Young Scientist Program'),
                Program(name='AP', description='Advance Program'),
                Program(name='EP', description='English Program')
            ]
            db.session.add_all(programs)
            db.session.commit()

@app.context_processor
def inject_user():
    """Inject user session into templates"""
    return dict(session=session)

@app.route('/')
def index():
    """Home page"""
    if 'user_name' not in session:
        return redirect(url_for('login'))
    
    # If admin, redirect to admin dashboard
    if session.get('is_admin'):
        return redirect(url_for('admin_dashboard'))
    
    # Regular user: show class selection
    class_types = ClassType.query.all()
    return render_template('index.html', class_types=class_types)

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page for regular users"""
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        
        if not name:
            flash('กรุณาใส่ชื่อของคุณ', 'error')
            return redirect(url_for('login'))
        
        session['user_name'] = name
        session['is_admin'] = False
        
        flash(f'ยินดีต้อนรับ {name}! 🎉', 'success')
        return redirect(url_for('index'))
    
    return render_template('login.html')

@app.route('/admin-login', methods=['GET', 'POST'])
def admin_login():
    """Admin login page"""
    if request.method == 'POST':
        password = request.form.get('password', '')
        
        if password != app.config['ADMIN_PASSWORD']:
            flash('รหัสผ่านแอดมินไม่ถูกต้อง', 'error')
            return redirect(url_for('admin_login'))
        
        session['user_name'] = 'Admin'
        session['is_admin'] = True
        
        flash('ยินดีต้อนรับแอดมิน! 👨‍💼', 'success')
        return redirect(url_for('admin_dashboard'))
    
    return render_template('admin_login.html')

@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    """Admin dashboard"""
    exams = Exam.query.all()
    total_exams = len(exams)
    total_comments = Comment.query.count()
    total_users = 0  # Could be enhanced with user tracking
    
    return render_template('admin_dashboard.html', 
                         exams=exams, 
                         total_exams=total_exams,
                         total_comments=total_comments,
                         now=datetime.now())

@app.route('/logout')
def logout():
    """Logout user"""
    name = session.get('user_name', 'ผู้ใช้')
    session.clear()
    flash(f'ลาก่อน {name}! 👋', 'success')
    return redirect(url_for('login'))

@app.route('/class/<int:class_id>')
@login_required
def select_class(class_id):
    """Show class details and exams"""
    class_type = ClassType.query.get_or_404(class_id)
    exams = Exam.query.filter_by(class_type_id=class_id).all()
    years = sorted(set(exam.year for exam in exams), reverse=True)
    programs = Program.query.all() if class_type.name == 'ห้องพิเศษ' else []
    
    return render_template('class_detail.html', class_type=class_type, exams=exams, 
                         years=years, programs=programs)

@app.route('/exam/<int:exam_id>')
@login_required
def exam_detail(exam_id):
    """Show exam details and comments"""
    exam = Exam.query.get_or_404(exam_id)
    comments = Comment.query.filter_by(exam_id=exam_id).order_by(Comment.created_at.desc()).all()
    return render_template('exam_detail.html', exam=exam, comments=comments)

@app.route('/upload', methods=['GET', 'POST'])
@admin_required
def upload_exam():
    """Upload new exam file (Admin only)"""
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('ไม่มีไฟล์ข้อสอบที่เลือก', 'error')
            return redirect(request.url)
        
        file = request.files['file']
        if file.filename == '':
            flash('ไม่มีไฟล์ข้อสอบที่เลือก', 'error')
            return redirect(request.url)
        
        if not allowed_file(file.filename):
            flash('ประเภทไฟล์ข้อสอบไม่ได้รับอนุญาต', 'error')
            return redirect(request.url)
        
        # Check answer file if provided
        answer_file = request.files.get('answer_file')
        if answer_file and answer_file.filename != '':
            if not allowed_file(answer_file.filename):
                flash('ประเภทไฟล์เฉลยไม่ได้รับอนุญาต', 'error')
                return redirect(request.url)
        
        title = request.form.get('title')
        year = request.form.get('year')
        description = request.form.get('description')
        class_type_id = request.form.get('class_type_id')
        program_id = request.form.get('program_id')
        
        if not title or not year or not class_type_id:
            flash('กรุณากรอกข้อมูลที่จำเป็น', 'error')
            return redirect(request.url)
        
        try:
            year = int(year)
            filename = secure_filename(file.filename)
            # Add timestamp to filename to avoid duplicates
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
            filename = timestamp + filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'exams', filename)
            file.save(filepath)
            
            answer_filename = None
            answer_filepath = None
            if answer_file and answer_file.filename != '':
                answer_filename = secure_filename(answer_file.filename)
                answer_filename = timestamp + 'answer_' + answer_filename
                answer_filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'exams', answer_filename)
                answer_file.save(answer_filepath)
            
            exam = Exam(
                title=title,
                year=year,
                filename=filename,
                filepath=filepath,
                answer_filename=answer_filename,
                answer_filepath=answer_filepath,
                description=description,
                class_type_id=int(class_type_id),
                program_id=int(program_id) if program_id else None
            )
            db.session.add(exam)
            db.session.commit()
            
            flash('อัปโหลดข้อสอบเรียบร้อย', 'success')
            return redirect(url_for('admin_dashboard'))
        except Exception as e:
            flash(f'เกิดข้อผิดพลาด: {str(e)}', 'error')
            return redirect(request.url)
    
    class_types = ClassType.query.all()
    programs = Program.query.all()
    current_year = datetime.now().year
    years = list(range(current_year - 10, current_year + 1))
    
    return render_template('admin_upload.html', class_types=class_types, programs=programs, years=years)

@app.route('/admin/exam/delete/<int:exam_id>', methods=['POST'])
@admin_required
def delete_exam(exam_id):
    """Delete exam (Admin only)"""
    exam = Exam.query.get_or_404(exam_id)
    
    try:
        # Delete files from system
        if exam.filepath and os.path.exists(exam.filepath):
            os.remove(exam.filepath)
        if exam.answer_filepath and os.path.exists(exam.answer_filepath):
            os.remove(exam.answer_filepath)
        
        # Delete from database
        db.session.delete(exam)
        db.session.commit()
        
        flash('ลบข้อสอบเรียบร้อย', 'success')
    except Exception as e:
        flash(f'เกิดข้อผิดพลาด: {str(e)}', 'error')
    
    return redirect(url_for('admin_dashboard'))

@app.route('/download/<int:exam_id>')
@login_required
def download_exam(exam_id):
    """Download exam file"""
    exam = Exam.query.get_or_404(exam_id)
    try:
        return send_file(exam.filepath, as_attachment=True, download_name=exam.filename)
    except Exception as e:
        flash(f'ไม่สามารถดาวน์โหลดไฟล์ได้: {str(e)}', 'error')
        return redirect(url_for('exam_detail', exam_id=exam_id))

@app.route('/download-answer/<int:exam_id>')
@login_required
def download_answer(exam_id):
    """Download answer file"""
    exam = Exam.query.get_or_404(exam_id)
    if not exam.answer_filepath:
        flash('ไม่มีไฟล์เฉลยสำหรับข้อสอบนี้', 'error')
        return redirect(url_for('exam_detail', exam_id=exam_id))
    try:
        return send_file(exam.answer_filepath, as_attachment=True, download_name=exam.answer_filename)
    except Exception as e:
        flash(f'ไม่สามารถดาวน์โหลดเฉลยได้: {str(e)}', 'error')
        return redirect(url_for('exam_detail', exam_id=exam_id))

@app.route('/comment/add/<int:exam_id>', methods=['POST'])
@login_required
def add_comment(exam_id):
    """Add comment to exam"""
    exam = Exam.query.get_or_404(exam_id)
    author = session.get('user_name', 'ไม่ระบุชื่อ')
    content = request.form.get('content')
    
    if not content:
        flash('กรุณากรอกความเห็น', 'error')
        return redirect(url_for('exam_detail', exam_id=exam_id))
    
    try:
        comment = Comment(
            exam_id=exam_id,
            author=author,
            content=content
        )
        db.session.add(comment)
        db.session.commit()
        flash('เพิ่มความเห็นเรียบร้อย', 'success')
    except Exception as e:
        flash(f'เกิดข้อผิดพลาด: {str(e)}', 'error')
    
    return redirect(url_for('exam_detail', exam_id=exam_id))

@app.route('/filter')
@login_required
def filter_exams():
    """Filter exams by year and program"""
    year = request.args.get('year', type=int)
    program_id = request.args.get('program_id', type=int)
    class_id = request.args.get('class_id', type=int)
    
    query = Exam.query
    
    if year:
        query = query.filter_by(year=year)
    if program_id:
        query = query.filter_by(program_id=program_id)
    if class_id:
        query = query.filter_by(class_type_id=class_id)
    
    exams = query.all()
    return render_template('exam_list.html', exams=exams)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000)

