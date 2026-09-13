const state = { token: localStorage.getItem('benja_token'), authMode: 'login', exams: [], libraryCategory: 'all', librarySearch: '', adminCategory: 'all', adminSearch: '', adminUploadCategory: 'ม.4' };
const $ = selector => document.querySelector(selector);
const modal = $('#auth-modal');

function showAuth() { $('#auth-title').textContent = 'เข้าสู่ระบบ'; $('#auth-subtitle').textContent = 'ใส่ชื่อของคุณแล้วเริ่มฝึกได้ทันที'; $('#form-message').textContent = ''; $('#auth-form button').textContent = 'เข้าใช้งานเลย →'; modal.classList.remove('hidden'); }
function hideAuth() { modal.classList.add('hidden'); }
function setUser(user) { state.user = user; document.querySelectorAll('[data-action="login"]').forEach(button => button.classList.add('hidden')); const menu = $('.user-menu'); menu.classList.remove('hidden'); menu.innerHTML = `<span>สวัสดี, ${user.name}</span>${user.role === 'admin' ? '<button class="btn btn-ghost" id="open-admin">จัดการข้อสอบ</button>' : ''}<button class="btn btn-ghost" id="logout">ออกจากระบบ</button>`; $('#logout').onclick = () => { localStorage.removeItem('benja_token'); location.reload(); }; if (user.role === 'admin') $('#open-admin').onclick = openAdmin; }
async function loadExams() { try { const response = await fetch('/api/exams'); if (!response.ok) throw new Error(); state.exams = await response.json(); } catch { state.exams = [{ _id: 'demo-1', title: 'เบ็ญจะมะมหาราช ม.4 วิชาคณิตศาสตร์', description: 'แนวข้อสอบคณิตศาสตร์สำหรับเตรียมสอบเข้าโรงเรียนเบ็ญจะมะมหาราช', subject: 'คณิตศาสตร์', category: 'สอบเข้าเบ็ญฯ ม.4', difficulty: 'ปานกลาง', duration: 60, attempts: 1240, questions: [{ prompt: 'ถ้า 2x + 6 = 18 แล้ว x มีค่าเท่าใด?', choices: ['4', '6', '8', '12'], correctAnswer: 1 }] }, { _id: 'demo-2', title: 'สอบเข้า ม.1 รวมวิชาชุดที่ 1', description: 'ฝึกทำข้อสอบรวมสำหรับนักเรียน ป.6 ที่เตรียมสอบเข้า ม.1', subject: 'รวมวิชา', category: 'สอบเข้า ม.1', difficulty: 'ปานกลาง', duration: 90, attempts: 840, questions: [{ prompt: 'ข้อใดเป็นจำนวนเฉพาะ?', choices: ['21', '27', '31', '39'], correctAnswer: 2 }] }, { _id: 'demo-3', title: 'เบ็ญฯ ม.1 ภาษาอังกฤษ Reading', description: 'อ่านจับใจความและคำศัพท์ที่พบบ่อยในแนวข้อสอบเข้า ม.1', subject: 'ภาษาอังกฤษ', category: 'สอบเข้าเบ็ญฯ ม.1', difficulty: 'ปานกลาง', duration: 45, attempts: 612, questions: [{ prompt: 'Choose the closest meaning of “reliable”.', choices: ['สามารถเชื่อถือได้', 'รวดเร็ว', 'ซับซ้อน', 'สร้างสรรค์'], correctAnswer: 0 }] }]; } renderExams(); }
function getVisibleExams() {
  const needle = state.librarySearch.trim().toLowerCase();
  return state.exams.filter(exam => {
    if (exam.category === 'Mock Exam' || exam.title.toLowerCase().includes('mock exam')) return false;
    const matchesCategory = state.libraryCategory === 'all' ||
      (state.libraryCategory === 'mock' ? exam.category === 'Mock Exam' || exam.title.toLowerCase().includes('mock') : exam.category?.includes(state.libraryCategory));
    const haystack = `${exam.title} ${exam.subject} ${exam.category} ${exam.description || ''}`.toLowerCase();
    const matchesSearch = !needle || haystack.includes(needle);
    return matchesCategory && matchesSearch;
  });
}
function renderExams() {
  const visibleExams = getVisibleExams();
  $('#exam-list').innerHTML = visibleExams.length ? visibleExams.map(exam => `<article class="exam-card"><div class="exam-card-top"><span>${escapeHtml(exam.subject || 'เอกสารข้อสอบ')}</span><span>★ 4.9</span></div><h3>${escapeHtml(exam.title)}</h3><p>${escapeHtml(exam.description || 'ฝึกทำข้อสอบและวัดความพร้อมของคุณ')}</p><div class="exam-meta"><span>${exam.fileUrl ? '▤ ไฟล์เอกสาร' : `▣ ${exam.questions?.length || 50} ข้อ`}</span><span>◷ ${exam.duration} นาที</span><span>● ${escapeHtml(exam.difficulty || 'ปานกลาง')}</span></div>${exam.fileUrl ? `<button class="exam-action exam-file-link" data-file-url="${escapeHtml(exam.fileUrl)}" data-file-name="${escapeHtml(exam.fileName || exam.title)}" data-file-type="${escapeHtml(exam.fileType || '')}">เปิดไฟล์ข้อสอบ ↗</button>` : `<button class="exam-action" data-exam="${exam._id}">เริ่มทำข้อสอบ →</button>`}</article>`).join('') : '<div class="loading-card">ไม่พบข้อสอบตามคำค้นหาหรือหมวดที่เลือก</div>';
  document.querySelectorAll('[data-exam]').forEach(button => button.onclick = () => openExam(button.dataset.exam));
  bindFileButtons();
  document.querySelectorAll('.library-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.categoryFilter === state.libraryCategory));
}
function bindLibraryControls() {
  $('#exam-search').addEventListener('input', event => {
    state.librarySearch = event.target.value;
    renderExams();
  });
  document.querySelectorAll('.library-tab').forEach(tab => {
    tab.onclick = () => {
      state.libraryCategory = tab.dataset.categoryFilter;
      renderExams();
    };
  });
}
async function openExam(id) { try { const response = await fetch(`/api/exams/${id}`); if (!response.ok) throw new Error('ไม่สามารถโหลดข้อสอบได้'); state.exam = await response.json(); } catch { state.exam = state.exams.find(exam => exam._id === id); if (!state.exam?.questions?.length) { $('#runner-message').textContent = 'ตัวอย่างข้อสอบนี้จะพร้อมเมื่อเชื่อมต่อฐานข้อมูลแล้ว'; return; } } state.questionIndex = 0; state.answers = []; state.examStartedAt = Date.now(); $('#exam-modal').classList.remove('hidden'); renderQuestion(); state.timer = setInterval(updateTimer, 1000); }
function updateTimer() { const elapsed = Math.floor((Date.now() - state.examStartedAt) / 1000); $('#runner-timer').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`; }
function renderQuestion() { const question = state.exam.questions[state.questionIndex]; const total = state.exam.questions.length; $('#runner-title').textContent = state.exam.title; $('#runner-count').textContent = `ข้อ ${state.questionIndex + 1} / ${total}`; $('#runner-question').textContent = question.prompt; $('#runner-progress-bar').style.width = `${((state.questionIndex + 1) / total) * 100}%`; $('#runner-choices').innerHTML = question.choices.map((choice, index) => `<button class="runner-choice ${state.answers[state.questionIndex] === index ? 'selected' : ''}" data-choice="${index}">${String.fromCharCode(65 + index)}. ${choice}</button>`).join(''); document.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => { state.answers[state.questionIndex] = Number(button.dataset.choice); renderQuestion(); }); $('#runner-prev').disabled = state.questionIndex === 0; $('#runner-next').classList.toggle('hidden', state.questionIndex === total - 1); $('#runner-submit').classList.toggle('hidden', state.questionIndex !== total - 1); }
async function submitExam() { clearInterval(state.timer); if (state.exam._id.startsWith('demo-')) { const score = state.exam.questions.reduce((total, question, index) => total + (state.answers[index] === question.correctAnswer ? 1 : 0), 0); showExamResult(score, state.exam.questions.length, false); return; } const response = await fetch(`/api/exams/${state.exam._id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) }, body: JSON.stringify({ answers: state.answers, timeSpent: Math.floor((Date.now() - state.examStartedAt) / 1000) }) }); const result = await response.json(); if (!response.ok) { $('#runner-message').textContent = result.message || 'ส่งข้อสอบไม่สำเร็จ'; return; } showExamResult(result.score, result.total, result.saved); }
function showExamResult(score, total, saved) { const percentage = total ? Math.round(score / total * 100) : 0; $('#runner-question').textContent = `ส่งข้อสอบแล้ว: ${score} / ${total} คะแนน (${percentage}%)`; $('#runner-choices').innerHTML = `<p>${saved ? 'ผลสอบถูกบันทึกไว้ใน Dashboard ของคุณแล้ว' : 'คุณสามารถสมัครสมาชิกภายหลังเพื่อบันทึกสถิติการทำข้อสอบ'}</p>`; $('#runner-prev').classList.add('hidden'); $('#runner-next').classList.add('hidden'); $('#runner-submit').classList.add('hidden'); }
$('#runner-prev').onclick = () => { state.questionIndex -= 1; renderQuestion(); }; $('#runner-next').onclick = () => { state.questionIndex += 1; renderQuestion(); }; $('#runner-submit').onclick = submitExam; $('#exam-close').onclick = () => { clearInterval(state.timer); $('#exam-modal').classList.add('hidden'); };
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
function openFilePreview(url, name, type) {
  let modal = $('#file-preview-modal');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', '<div class="file-preview-modal hidden" id="file-preview-modal"><div class="file-preview-box"><button class="modal-close" id="file-preview-close" aria-label="ปิด">×</button><div class="file-preview-heading"><strong id="file-preview-name"></strong><a id="file-preview-download" class="btn btn-primary" download>ดาวน์โหลดไฟล์ ↓</a></div><div id="file-preview-content" class="file-preview-content"></div></div></div>');
    modal = $('#file-preview-modal');
    $('#file-preview-close').onclick = () => modal.classList.add('hidden');
    modal.onclick = event => { if (event.target === modal) modal.classList.add('hidden'); };
  }
  $('#file-preview-name').textContent = name;
  $('#file-preview-download').href = url;
  $('#file-preview-download').download = name;
  $('#file-preview-content').innerHTML = type.startsWith('image/') ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)}">` : `<iframe src="${escapeHtml(url)}" title="${escapeHtml(name)}"></iframe>`;
  modal.classList.remove('hidden');
}
function bindFileButtons() { document.querySelectorAll('[data-file-url]').forEach(button => button.onclick = () => openFilePreview(button.dataset.fileUrl, button.dataset.fileName, button.dataset.fileType)); }
function renderScoreCalculator() {
  const section = document.querySelector('.analytics-section');
  if (!section) return;
  section.innerHTML = '<div class="score-calculator-intro"><p class="kicker">YOUR SCORE CHECK</p><h2>กรอกคะแนนของคุณ<br><em>แล้วดูผลอย่างแม่นยำ</em></h2><p>กรอกคะแนนที่ได้และคะแนนเต็มของแต่ละวิชา ระบบจะคำนวณสัดส่วนคะแนนรวมและค่าเฉลี่ยให้โดยอัตโนมัติ</p></div><div class="score-calculator"><div class="score-input-grid"><label>คณิตศาสตร์<div class="score-pair"><input class="score-earned" type="number" min="0" placeholder="ได้"><span>/</span><input class="score-max" type="number" min="1" placeholder="เต็ม"></div></label><label>ภาษาไทย<div class="score-pair"><input class="score-earned" type="number" min="0" placeholder="ได้"><span>/</span><input class="score-max" type="number" min="1" placeholder="เต็ม"></div></label><label>ภาษาอังกฤษ<div class="score-pair"><input class="score-earned" type="number" min="0" placeholder="ได้"><span>/</span><input class="score-max" type="number" min="1" placeholder="เต็ม"></div></label><label>วิทยาศาสตร์<div class="score-pair"><input class="score-earned" type="number" min="0" placeholder="ได้"><span>/</span><input class="score-max" type="number" min="1" placeholder="เต็ม"></div></label><label>สังคมศึกษา<div class="score-pair"><input class="score-earned" type="number" min="0" placeholder="ได้"><span>/</span><input class="score-max" type="number" min="1" placeholder="เต็ม"></div></label><label>วิชาเพิ่มเติม<div class="score-pair"><input class="score-earned" type="number" min="0" placeholder="ได้"><span>/</span><input class="score-max" type="number" min="1" placeholder="เต็ม"></div></label></div><div class="score-results"><div><span>คะแนนที่ได้รวม</span><strong id="score-total">0</strong></div><div><span>คะแนนเต็มรวม</span><strong id="score-max-total">0</strong></div><div><span>เปอร์เซ็นต์รวม</span><strong id="score-average">0%</strong></div><div><span>วิชาที่กรอก</span><strong id="score-count">0</strong></div></div><div class="basic-calculator"><strong>คำนวณตัวเลข</strong><div><input id="calc-left" type="number" placeholder="ตัวเลขที่ 1"><select id="calc-operator" aria-label="เครื่องหมาย"><option value="+">+</option><option value="-">−</option><option value="*">×</option><option value="/">÷</option></select><input id="calc-right" type="number" placeholder="ตัวเลขที่ 2"><b id="calc-result">= 0</b></div></div></div>';
  const updateScores = () => {
    const pairs = [...document.querySelectorAll('.score-pair')].map(pair => ({ earned: Number(pair.querySelector('.score-earned').value), max: Number(pair.querySelector('.score-max').value) })).filter(score => Number.isFinite(score.earned) && Number.isFinite(score.max) && score.earned >= 0 && score.max > 0 && score.earned <= score.max);
    const earnedTotal = pairs.reduce((sum, score) => sum + score.earned, 0);
    const maxTotal = pairs.reduce((sum, score) => sum + score.max, 0);
    $('#score-total').textContent = earnedTotal.toFixed(2).replace(/\.00$/, '');
    $('#score-max-total').textContent = maxTotal.toFixed(2).replace(/\.00$/, '');
    $('#score-average').textContent = maxTotal ? `${(earnedTotal / maxTotal * 100).toFixed(2)}%` : '0%';
    $('#score-count').textContent = pairs.length;
  };
  const updateOperation = () => {
    const left = Number($('#calc-left').value);
    const right = Number($('#calc-right').value);
    const operator = $('#calc-operator').value;
    let result = 0;
    if (Number.isFinite(left) && Number.isFinite(right)) result = operator === '+' ? left + right : operator === '-' ? left - right : operator === '*' ? left * right : right === 0 ? 'หารด้วยศูนย์ไม่ได้' : left / right;
    $('#calc-result').textContent = `= ${typeof result === 'number' ? result.toFixed(2).replace(/\.00$/, '') : result}`;
  };
  document.querySelectorAll('.score-earned, .score-max').forEach(input => input.oninput = updateScores);
  ['#calc-left', '#calc-right', '#calc-operator'].forEach(selector => $(selector).oninput = updateOperation);
}
async function loadDiscussions() { const response = await fetch(`/api/discussions?category=${encodeURIComponent(state.chatRoom)}`); const posts = await response.json(); const list = $('#discussion-list'); list.innerHTML = posts.length ? posts.map(post => `<article class="discussion-post"><div class="discussion-avatar">${escapeHtml(post.author.charAt(0).toUpperCase())}</div><div><strong>${escapeHtml(post.author)}</strong><p>${escapeHtml(post.content)}</p><small>${new Date(post.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</small></div></article>`).join('') : '<div class="community-empty">ยังไม่มีข้อความในห้องนี้ เริ่มคุยเป็นคนแรกได้เลย</div>'; list.scrollTop = list.scrollHeight; }
function renderCommunity() { state.chatRoom = 'ม.1'; $('#category-subtitle').textContent = 'เลือกห้อง OpenChat เพื่อถาม ตอบ และแลกเปลี่ยนสรุปกับเพื่อนๆ'; $('#category-exams').innerHTML = '<div class="chat-room"><div class="chat-rooms"><button class="chat-room-tab active" data-room="ม.1">ห้องสอบเข้า ม.1</button><button class="chat-room-tab" data-room="ม.4">ห้องสอบเข้า ม.4</button></div><div class="chat-status"><span></span><strong id="chat-room-name">ห้องสอบเข้า ม.1</strong> · community เปิดให้พูดคุย</div><div id="discussion-list" class="discussion-list"></div><form id="discussion-form" class="discussion-form"><input name="author" required maxlength="80" placeholder="ชื่อที่ใช้คุย"><textarea name="content" required maxlength="2000" rows="2" placeholder="พิมพ์ข้อความ คำถาม หรือสรุปที่อยากแชร์..."></textarea><button class="btn btn-primary" type="submit">ส่งข้อความ →</button><p id="discussion-message" class="form-message"></p></form></div>'; document.querySelectorAll('.chat-room-tab').forEach(button => button.onclick = () => { state.chatRoom = button.dataset.room; document.querySelectorAll('.chat-room-tab').forEach(tab => tab.classList.toggle('active', tab === button)); $('#chat-room-name').textContent = `ห้องสอบเข้า ${state.chatRoom}`; loadDiscussions(); }); $('#discussion-form').onsubmit = async event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.target).entries()); body.category = state.chatRoom; const response = await fetch('/api/discussions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) { $('#discussion-message').textContent = data.message; return; } event.target.reset(); $('#discussion-message').textContent = ''; loadDiscussions(); }; loadDiscussions().catch(() => { $('#discussion-list').innerHTML = '<div class="community-empty">โหลดห้องแชทไม่สำเร็จ กรุณาลองใหม่</div>'; }); clearInterval(state.communityTimer); state.communityTimer = setInterval(loadDiscussions, 5000); }
function openFieldPicker() { $('#category-title').textContent = 'เลือกสนามสอบที่ใช่สำหรับคุณ'; $('#category-subtitle').textContent = 'เลือกประเภทที่ต้องการแล้วกดเริ่มทำข้อสอบ'; $('#category-exams').innerHTML = `
    <div class="field-choice-list">
      <button class="field-choice-item blue" data-field="ม.4"><div class="field-icon">⌁</div><div class="field-label"><strong>สอบเข้าเบ็ญฯ ม.4</strong><span>ฝึกแนวข้อสอบแบบเข้าโรงเรียนเบ็ญฯ</span></div><span>→</span></button>
      <button class="field-choice-item red" data-field="ม.1"><div class="field-icon">◌</div><div class="field-label"><strong>สอบเข้าเบ็ญฯ ม.1</strong><span>เตรียมพร้อมสำหรับสนามสอบ ม.1</span></div><span>→</span></button>
      <button class="field-choice-item yellow" data-field="community"><div class="field-icon">✦</div><div class="field-label"><strong>พูดคุยแลกเปลี่ยนสรุป</strong><span>ห้องแชทสำหรับแชร์ความรู้และสรุป</span></div><span>→</span></button>
    </div>
  `; document.querySelectorAll('[data-field]').forEach(button => button.onclick = () => openCategory(button.dataset.field)); $('#category-modal').classList.remove('hidden'); }
function openCategory(category) { const titles = { 'ม.4': 'ชุดข้อสอบเข้าเบ็ญฯ ม.4', 'ม.1': 'ชุดข้อสอบเข้าเบ็ญฯ ม.1', mock: 'ชุดข้อสอบจำลองจับเวลา' }; $('#category-title').textContent = titles[category] || 'พื้นที่พูดคุยแลกเปลี่ยนสรุป'; if (category === 'community') { renderCommunity(); } else { $('#category-subtitle').textContent = 'เลือกชุดที่ต้องการ แล้วเริ่มทำข้อสอบได้ทันที'; const matches = state.exams.filter(exam => category === 'mock' || exam.category.includes(category)); $('#category-exams').innerHTML = matches.length ? matches.map(exam => `<div class="category-exam-item"><div><h3>${escapeHtml(exam.title)}</h3><p>${escapeHtml(exam.subject || 'เอกสารข้อสอบ')} · ${exam.fileUrl ? 'ไฟล์เอกสาร' : `${exam.questions?.length || 0} ข้อ`} · ${exam.duration} นาที · ${escapeHtml(exam.difficulty || 'ปานกลาง')}</p></div>${exam.fileUrl ? `<button class="btn btn-primary" data-file-url="${escapeHtml(exam.fileUrl)}" data-file-name="${escapeHtml(exam.fileName || exam.title)}" data-file-type="${escapeHtml(exam.fileType || '')}">เปิดไฟล์ ↗</button>` : `<button class="btn btn-primary" data-category-exam="${exam._id}">เริ่มทำข้อสอบ →</button>`}</div>`).join('') : '<div class="community-note">ยังไม่มีชุดข้อสอบในหมวดนี้ กรุณากลับมาใหม่ภายหลัง</div>'; document.querySelectorAll('[data-category-exam]').forEach(button => button.onclick = () => { $('#category-modal').classList.add('hidden'); openExam(button.dataset.categoryExam); }); bindFileButtons(); } $('#category-modal').classList.remove('hidden'); }
document.querySelectorAll('.category-select').forEach(card => card.onclick = () => openCategory(card.dataset.category)); $('#field-picker-trigger').onclick = openFieldPicker; $('#category-close').onclick = () => { clearInterval(state.communityTimer); $('#category-modal').classList.add('hidden'); };
function addQuestionRow() { const index = document.querySelectorAll('.question-row').length; const row = document.createElement('div'); row.className = 'question-row'; row.innerHTML = `<textarea class="question-prompt" rows="2" required placeholder="คำถามข้อที่ ${index + 1}"></textarea><div class="choice-grid"><input class="choice" required placeholder="ตัวเลือกที่ 1"><input class="choice" required placeholder="ตัวเลือกที่ 2"><input class="choice" required placeholder="ตัวเลือกที่ 3"><input class="choice" required placeholder="ตัวเลือกที่ 4"></div><select class="correct-answer"><option value="0">คำตอบที่ถูก: ตัวเลือกที่ 1</option><option value="1">คำตอบที่ถูก: ตัวเลือกที่ 2</option><option value="2">คำตอบที่ถูก: ตัวเลือกที่ 3</option><option value="3">คำตอบที่ถูก: ตัวเลือกที่ 4</option></select><input class="question-explanation" placeholder="คำอธิบายเฉลย (ถ้ามี)">`; $('#question-list').appendChild(row); }
async function loadAdminExams() {
  const response = await fetch('/api/admin/exams', { headers: { Authorization: `Bearer ${state.token}` } });
  const exams = await response.json();
  let tools = $('#admin-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.id = 'admin-tools';
    tools.className = 'admin-tools';
    tools.innerHTML = '<div class="admin-stats"><span><strong id="admin-total-count">0</strong>ชุดทั้งหมด</span><span><strong id="admin-file-count">0</strong>ไฟล์เอกสาร</span></div><input id="admin-exam-search" type="search" placeholder="ค้นหาชุดข้อสอบ...">';
    $('#admin-exam-list').before(tools);
    $('#admin-exam-search').oninput = event => { state.adminSearch = event.target.value; loadAdminExams(); };
  }
  $('#admin-total-count').textContent = exams.length;
  $('#admin-file-count').textContent = exams.filter(exam => exam.fileUrl).length;
  $('#admin-exam-search').value = state.adminSearch;
  const categories = [...new Set(exams.map(exam => exam.category || 'ไม่ระบุหมวด'))].sort();
  let filters = $('#admin-category-filters');
  if (!filters) {
    filters = document.createElement('div');
    filters.id = 'admin-category-filters';
    filters.className = 'admin-category-filters';
    $('#admin-exam-list').before(filters);
  }
  filters.innerHTML = ['all', ...categories].map(category => `<button type="button" class="admin-category-filter ${state.adminCategory === category ? 'active' : ''}" data-admin-category="${escapeHtml(category)}">${category === 'all' ? 'ทั้งหมด' : escapeHtml(category)}</button>`).join('');
  document.querySelectorAll('[data-admin-category]').forEach(button => button.onclick = () => { state.adminCategory = button.dataset.adminCategory; loadAdminExams(); });
  const needle = state.adminSearch.trim().toLowerCase();
  const visibleExams = exams.filter(exam => {
    const matchesCategory = state.adminCategory === 'all' || (exam.category || 'ไม่ระบุหมวด') === state.adminCategory;
    const haystack = `${exam.title} ${exam.subject || ''} ${exam.category || ''}`.toLowerCase();
    return matchesCategory && (!needle || haystack.includes(needle));
  });
  $('#admin-exam-list').innerHTML = visibleExams.map(exam => `<div class="admin-exam-item"><div><strong>${escapeHtml(exam.title)}</strong><small>${escapeHtml(exam.category || 'ไม่ระบุหมวด')} · ${escapeHtml(exam.subject || 'รวมวิชา')} · ${exam.fileUrl ? 'ไฟล์เอกสาร' : `${(exam.questions || []).length} ข้อ`}</small></div><div class="admin-exam-actions">${exam.fileUrl ? `<button data-admin-file-url="${escapeHtml(exam.fileUrl)}" data-admin-file-name="${escapeHtml(exam.fileName || exam.title)}" data-admin-file-type="${escapeHtml(exam.fileType || '')}">ดูไฟล์</button>` : ''}<button data-delete-exam="${exam._id}">ลบ</button></div></div>`).join('') || '<p>ไม่พบชุดข้อสอบ</p>';
  document.querySelectorAll('[data-delete-exam]').forEach(button => button.onclick = () => deleteAdminExam(button.dataset.deleteExam));
  document.querySelectorAll('[data-admin-file-url]').forEach(button => button.onclick = () => openFilePreview(button.dataset.adminFileUrl, button.dataset.adminFileName, button.dataset.adminFileType));
}
function openAdmin() {
  $('#admin-modal').classList.remove('hidden');
  $('#admin-message').textContent = '';
  $('#question-list').innerHTML = '';
  addQuestionRow();
  const importBox = document.querySelector('.admin-import-box');
  if (!$('#admin-upload-categories')) {
    const categoryPicker = document.createElement('div');
    categoryPicker.id = 'admin-upload-categories';
    categoryPicker.className = 'admin-upload-categories';
    categoryPicker.innerHTML = '<strong>เลือกหมวดข้อสอบที่จะเพิ่ม</strong><div><button type="button" data-upload-category="ม.4">เพิ่มข้อสอบ ม.4</button><button type="button" data-upload-category="ม.1">เพิ่มข้อสอบ ม.1</button></div>';
    importBox.prepend(categoryPicker);
  }
  document.querySelectorAll('[data-upload-category]').forEach(button => {
    button.classList.toggle('active', button.dataset.uploadCategory === state.adminUploadCategory);
    button.onclick = () => { state.adminUploadCategory = button.dataset.uploadCategory; document.querySelectorAll('[data-upload-category]').forEach(item => item.classList.toggle('active', item === button)); };
  });
  loadAdminExams().catch(error => { $('#admin-message').textContent = error.message; });
}
async function deleteAdminExam(id) { if (!confirm('ต้องการลบชุดข้อสอบนี้หรือไม่?')) return; const response = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${state.token}` } }); if (response.ok) { loadAdminExams(); loadExams(); } else { $('#admin-message').textContent = 'ลบข้อสอบไม่สำเร็จ'; } }
async function importExamFile() {
  const input = $('#exam-file-import');
  const file = input?.files?.[0];
  if (!file) {
    $('#admin-message').textContent = 'กรุณาเลือกไฟล์ JSON ก่อนนำเข้า';
    return;
  }
  try {
    const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    if (!isJson) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', state.adminUploadCategory === 'mock' ? 'Mock Exam' : `สอบเข้าเบ็ญฯ ${state.adminUploadCategory}`);
      const response = await fetch('/api/admin/exams/upload-file', { method: 'POST', headers: { Authorization: `Bearer ${state.token}` }, body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'อัปโหลดไฟล์ไม่สำเร็จ');
      $('#admin-message').textContent = `เพิ่มไฟล์ ${file.name} ในหมวดเรียบร้อยแล้ว`;
      input.value = '';
      loadAdminExams();
      loadExams();
      return;
    }
    const text = await file.text();
    const data = JSON.parse(text);
    const exams = Array.isArray(data) ? data : [data];
    if (!exams.length || !exams[0]?.title || !Array.isArray(exams[0]?.questions)) {
      throw new Error('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
    }
    const categorizedExams = exams.map(exam => ({ ...exam, category: state.adminUploadCategory === 'mock' ? 'Mock Exam' : `สอบเข้าเบ็ญฯ ${state.adminUploadCategory}` }));
    const response = await fetch('/api/admin/exams/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
      body: JSON.stringify(categorizedExams)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'นำเข้าไฟล์ไม่สำเร็จ');
    $('#admin-message').textContent = `นำเข้า ${Array.isArray(result) ? result.length : 1} ชุดข้อสอบจากไฟล์สำเร็จ`;
    input.value = '';
    loadAdminExams();
    loadExams();
  } catch (error) {
    $('#admin-message').textContent = error.message || 'ไฟล์ JSON ไม่ถูกต้อง';
  }
}
$('#add-question').onclick = addQuestionRow; $('#import-file-btn').onclick = importExamFile; $('#admin-close').onclick = () => $('#admin-modal').classList.add('hidden'); $('#admin-form').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.target); const questions = [...document.querySelectorAll('.question-row')].map(row => ({ prompt: row.querySelector('.question-prompt').value, choices: [...row.querySelectorAll('.choice')].map(input => input.value), correctAnswer: Number(row.querySelector('.correct-answer').value), explanation: row.querySelector('.question-explanation').value })); const payload = { title: form.get('title'), subject: form.get('subject'), category: form.get('category'), difficulty: form.get('difficulty'), duration: Number(form.get('duration')), description: form.get('description'), questions }; const response = await fetch('/api/admin/exams', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) { $('#admin-message').textContent = data.message || 'บันทึกไม่สำเร็จ'; return; } $('#admin-message').textContent = 'บันทึกชุดข้อสอบเรียบร้อยแล้ว'; event.target.reset(); $('#question-list').innerHTML = ''; addQuestionRow(); loadAdminExams(); loadExams(); };
$('#auth-form').onsubmit = async event => { event.preventDefault(); const form = new FormData(event.target); const body = { name: String(form.get('name') || '').trim() }; if (!body.name) { $('#form-message').textContent = 'กรุณาใส่ชื่อของคุณก่อนเข้าใช้งาน'; return; } try { const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ'); state.token = data.token; localStorage.setItem('benja_token', data.token); hideAuth(); setUser(data.user); } catch (error) { $('#form-message').textContent = error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'; } };
document.querySelector('.modal-close').onclick = hideAuth; modal.onclick = event => { if (event.target === modal) hideAuth(); }; document.querySelectorAll('[data-action="login"]').forEach(button => button.onclick = () => showAuth()); document.querySelectorAll('[data-scroll]').forEach(button => button.onclick = () => document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }));
document.querySelector('.menu-toggle').onclick = () => document.querySelector('.site-header').classList.toggle('nav-open'); document.querySelectorAll('.main-nav a').forEach(link => link.onclick = () => document.querySelector('.site-header').classList.remove('nav-open'));
if (state.token) { try { const payload = JSON.parse(atob(state.token.split('.')[1])); setUser(payload); } catch { localStorage.removeItem('benja_token'); } }
document.querySelectorAll('.category-select[data-category="mock"], .library-tab[data-category-filter="mock"]').forEach(element => element.remove());
$('#exam-file-import').setAttribute('accept', '*/*');
document.querySelector('.upload-label').childNodes[0].textContent = 'เลือกไฟล์ข้อสอบ (JSON, PDF หรือรูปภาพ)';
renderScoreCalculator(); bindLibraryControls(); loadExams();
