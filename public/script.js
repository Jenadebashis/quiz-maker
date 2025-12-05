let questions = [];
let current = 0;
let answers = []; // store selected option index or null
let totalTime = 3600; // default 1 hour, overridden on start
let remaining = 0;
let timerId = null;
let sessionId = null;
let sessionToken = null;
let offlineMode = false; // if server unavailable, operate in offline/local-only mode
let quizId = null;

const el = (id) => document.getElementById(id);

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadQuestions(selectedQuizId) {
  quizId = selectedQuizId;
  const res = await fetch(`Test Json Files/${quizId}.json`);
  const quizData = await res.json();
  questions = quizData.questions || quizData; // Support both formats
  answers = new Array(questions.length).fill(null);
}

function renderQuestion(idx) {
  const q = questions[idx];
  const box = el('questionBox');
  box.innerHTML = '';
  const h = document.createElement('h2');
  h.textContent = `Q${idx + 1}. ` + q.question;
  box.appendChild(h);

  q.options.forEach((opt, i) => {
    const label = document.createElement('label');
    label.className = 'option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'q';
    radio.value = i;
    radio.checked = answers[idx] === i;
    radio.addEventListener('change', () => {
      answers[idx] = i;
      saveProgress();
      updateProgressUI();
      updateSubmitState();
    });
    label.appendChild(radio);
    const span = document.createElement('span');
    span.textContent = opt;
    label.appendChild(span);
    box.appendChild(label);
  });

  el('progress').textContent = `Question ${idx + 1} / ${questions.length}`;
  el('prevBtn').disabled = idx === 0;
  el('nextBtn').textContent =
    idx === questions.length - 1 ? 'Finish (go to end)' : 'Continue';
}

function updateProgressUI() {
  // small dots indicator (optional)
}

function startTimer(sec) {
  remaining = sec;
  el('timer').textContent = formatTime(remaining);
  timerId = setInterval(() => {
    remaining--;
    el('timer').textContent = formatTime(remaining);
    if (remaining <= 0) {
      clearInterval(timerId);
      submitFromTimer();
    }
  }, 1000);
}

function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function saveProgress() {
  try {
    localStorage.setItem(`quiz_answers_${quizId}`, JSON.stringify(answers));
  } catch (e) {}
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(`quiz_answers_${quizId}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === questions.length) answers = arr;
    }
  } catch (e) {}
}

function persistSessionToStorage() {
  try {
    if (sessionId && sessionToken) {
      localStorage.setItem('quiz_session', sessionId);
      localStorage.setItem('quiz_token', sessionToken);
      localStorage.setItem('quiz_start', Date.now().toString());
      localStorage.setItem('quiz_totalTime', String(totalTime));
      localStorage.setItem('quiz_id', quizId);
    }
    saveProgress();
  } catch (e) {}
}

function loadSessionFromStorage() {
  try {
    const s = localStorage.getItem('quiz_session');
    const t = localStorage.getItem('quiz_token');
    const st = localStorage.getItem('quiz_start');
    const tt = localStorage.getItem('quiz_totalTime');
    const qid = localStorage.getItem('quiz_id');
    if (s && t && qid) {
      sessionId = s;
      sessionToken = t;
      quizId = qid;
      if (st) clientStartTime = Number(st);
      else clientStartTime = Date.now();
      if (tt) totalTime = Number(tt);
      return true;
    }
  } catch (e) {}
  return false;
}

function clearSessionStorage() {
  try {
    localStorage.removeItem('quiz_session');
    localStorage.removeItem('quiz_token');
    localStorage.removeItem('quiz_start');
    localStorage.removeItem('quiz_totalTime');
    localStorage.removeItem('quiz_id');
    // Clear all quiz answers
    Object.keys(localStorage)
      .filter((k) => k.startsWith('quiz_answers_'))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
}

function updateSubmitState() {
  const allAnswered = answers.every((a) => a !== null);
  el('submitBtn').disabled = !allAnswered;
}

function goto(idx) {
  if (idx < 0 || idx >= questions.length) return;
  current = idx;
  renderQuestion(current);
}

function finishAndSubmitLocal() {
  clearInterval(timerId);
  let score = 0;
  questions.forEach((q, i) => {
    if (answers[i] !== null && answers[i] === q.answerIndex) score++;
  });
  showResult({ score, total: questions.length, offline: true });
}

async function submitToServer() {
  if (!sessionId || !sessionToken || !quizId) return finishAndSubmitLocal();
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: sessionId, token: sessionToken, answers, quizId }),
    });
    if (!res.ok) throw new Error('server error');
    const data = await res.json();
    clearSessionStorage();
    showResult(data);
  } catch (e) {
    console.warn('Submit failed, falling back to local scoring', e);
    finishAndSubmitLocal();
  }
}

async function submitFromTimer() {
  clearInterval(timerId);
  if (offlineMode) return finishAndSubmitLocal();
  await submitToServer();
}

function showResult(score) {
  el('quizArea').classList.add('hidden');
  const r = el('result');
  let html = '';
  if (typeof score === 'object') {
    const s = score;
    const displayName =
      s.name ||
      (localStorage.getItem && localStorage.getItem('quiz_name')) ||
      '';
    if (displayName)
      html += `<p><strong>Name:</strong> ${escapeHtml(displayName)}</p>`;
    html += `<h2>Result</h2><p>Score: ${s.score} / ${s.total}</p>`;
    if (s.suspicious)
      html += `<p style="color:darkorange">Note: submission flagged as suspicious</p>`;
    if (s.offline)
      html += `<p style="color:gray">(Calculated locally — server unavailable)</p>`;
  } else {
    html += `<h2>Result</h2><p>Score: ${score} / ${questions.length}</p>`;
  }
  r.innerHTML = html;
  const list = document.createElement('div');
  questions.forEach((q, i) => {
    const d = document.createElement('div');
    d.className = 'card';
    const correct = q.options[q.answerIndex] || '(no answer key)';
    const given =
      answers[i] !== null ? q.options[answers[i]] : '<em>Not answered</em>';
    d.innerHTML = `<strong>Q${i + 1}.</strong> ${q.question}<br><strong>Your:</strong> ${given}<br><strong>Answer:</strong> ${correct}`;
    list.appendChild(d);
  });
  r.appendChild(list);
  r.classList.remove('hidden');
}

async function populateQuizOptions() {
  try {
    const res = await fetch('/api/quizzes');
    const quizzes = await res.json();
    const select = el('quizOptions');
    select.innerHTML = '<option value="">Select a Quiz</option>';
    quizzes.forEach((quiz) => {
      const option = document.createElement('option');
      option.value = quiz.id;
      option.textContent = quiz.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load quizzes:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await populateQuizOptions();

  try {
    const storedName = localStorage.getItem('quiz_name');
    if (storedName && el('userName')) el('userName').value = storedName;
  } catch (e) {}

  el('startBtn').addEventListener('click', () => {
    const selectedQuiz = el('quizOptions').value;
    if (selectedQuiz) {
      startQuiz(selectedQuiz);
    } else {
      alert('Please select a quiz to start.');
    }
  });

  el('prevBtn').addEventListener('click', () => {
    goto(current - 1);
  });

  el('nextBtn').addEventListener('click', () => {
    if (current < questions.length - 1) goto(current + 1);
    else {
      alert(
        'You are on the last question. Click Submit when all questions are answered.'
      );
    }
  });

  el('submitBtn').addEventListener('click', () => {
    const allAnswered = answers.every((a) => a !== null);
    if (!allAnswered) {
      if (!confirm('Not all questions are answered. Submit anyway?')) return;
    }
    if (offlineMode) finishAndSubmitLocal();
    else submitToServer();
  });
});

async function startQuiz(selectedQuizId) {
  await loadQuestions(selectedQuizId);
  loadProgress();

  totalTime = 3600; // 1 hour
  el('setup').classList.add('hidden');
  el('quizArea').classList.remove('hidden');
  renderQuestion(0);
  updateSubmitState();

  const hadSaved = loadSessionFromStorage();
  if (hadSaved && quizId === selectedQuizId) {
    try {
      const resp = await fetch(
        `/api/session/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(
          sessionToken
        )}`
      );
      if (resp.ok) {
        const info = await resp.json();
        if (!info.exists) {
          alert('Saved session was not found on server. Starting a new session.');
          clearSessionStorage();
        } else if (info.submitted) {
          alert(
            'This saved session was already submitted on the server. Starting a new session.'
          );
          clearSessionStorage();
        } else if (!info.token_valid) {
          const keep = confirm(
            'Saved session token is invalid on the server. Do you want to discard and start a new session?'
          );
          if (keep) clearSessionStorage();
          else return;
        } else {
          const resume = confirm(
            'A valid server session was found. Resume previous session?'
          );
          if (resume) {
            loadProgress();
            const serverStart =
              info.start_time ||
              Number(localStorage.getItem('quiz_start')) ||
              Date.now();
            const storedTotal =
              Number(localStorage.getItem('quiz_totalTime')) || totalTime;
            const elapsed = Math.floor((Date.now() - serverStart) / 1000);
            const remainingSec = storedTotal - elapsed;
            if (remainingSec <= 0) {
              submitFromTimer();
              return;
            }
            totalTime = storedTotal;
            startTimer(remainingSec);
            return;
          } else {
            clearSessionStorage();
          }
        }
      } else {
        const resume = confirm(
          'A quiz session exists locally but the server could not be contacted to validate it. Resume locally?'
        );
        if (resume) {
          loadProgress();
          const storedStart =
            Number(localStorage.getItem('quiz_start')) || Date.now();
          const storedTotal =
            Number(localStorage.getItem('quiz_totalTime')) || totalTime;
          const elapsed = Math.floor((Date.now() - storedStart) / 1000);
          const remainingSec = storedTotal - elapsed;
          if (remainingSec <= 0) {
            submitFromTimer();
            return;
          }
          totalTime = storedTotal;
          startTimer(remainingSec);
          return;
        } else {
          clearSessionStorage();
        }
      }
    } catch (e) {
      const resume = confirm(
        'Could not reach server to validate saved session. Resume locally?'
      );
      if (resume) {
        loadProgress();
        const storedStart =
          Number(localStorage.getItem('quiz_start')) || Date.now();
        const storedTotal =
          Number(localStorage.getItem('quiz_totalTime')) || totalTime;
        const elapsed = Math.floor((Date.now() - storedStart) / 1000);
        const remainingSec = storedTotal - elapsed;
        if (remainingSec <= 0) {
          submitFromTimer();
          return;
        }
        totalTime = storedTotal;
        startTimer(remainingSec);
        return;
      } else {
        clearSessionStorage();
      }
    }
  }

  try {
    const name = (el('userName') && el('userName').value.trim()) || '';
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, quizId }),
    });
    if (!res.ok) throw new Error('start failed');
    const body = await res.json();
    sessionId = body.session;
    sessionToken = body.token;
    try {
      localStorage.setItem('quiz_name', body.name || name);
    } catch (e) {}
    persistSessionToStorage();
    localStorage.setItem('quiz_start', Date.now().toString());
    localStorage.setItem('quiz_totalTime', String(totalTime));
    startTimer(totalTime);
  } catch (e) {
    console.warn('Could not reach server, running in offline mode', e);
    offlineMode = true;
    persistSessionToStorage();
    startTimer(totalTime);
  }
}
