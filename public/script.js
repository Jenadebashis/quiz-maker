let questions = [];
let current = 0;
let answers = []; // store selected option index or null
// Fixed timer: 25 minutes = 1500 seconds
let totalTime = 3600; // default 1 hour, overridden on start
let remaining = 0;
let timerId = null;
let sessionId = null;
let sessionToken = null;
let offlineMode = false; // if server unavailable, operate in offline/local-only mode

const el = id => document.getElementById(id);

function escapeHtml(str){
  if(!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadQuestions(){
  const res = await fetch('questions.json');
  questions = await res.json();
  answers = new Array(questions.length).fill(null);
}

function renderQuestion(idx){
  const q = questions[idx];
  const box = el('questionBox');
  box.innerHTML = '';
  const h = document.createElement('h2');
  h.textContent = `Q${idx+1}. ` + q.question;
  box.appendChild(h);

  q.options.forEach((opt, i) => {
    const label = document.createElement('label');
    label.className = 'option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'q';
    radio.value = i;
    radio.checked = answers[idx] === i;
    radio.addEventListener('change', ()=>{
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

  el('progress').textContent = `Question ${idx+1} / ${questions.length}`;
  el('prevBtn').disabled = idx === 0;
  // next button text: Submit on last
  el('nextBtn').textContent = idx === questions.length - 1 ? 'Finish (go to end)' : 'Continue';
}

function updateProgressUI(){
  // small dots indicator (optional)
}

function startTimer(sec){
  remaining = sec;
  el('timer').textContent = formatTime(remaining);
  timerId = setInterval(()=>{
    remaining--;
    el('timer').textContent = formatTime(remaining);
    if(remaining <= 0){
      clearInterval(timerId);
      submitFromTimer();
    }
  },1000);
}

function formatTime(seconds){
  if(seconds < 0) seconds = 0;
  const m = Math.floor(seconds/60);
  const s = seconds % 60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

function saveProgress(){
  try{ localStorage.setItem('quiz_answers', JSON.stringify(answers)); }
  catch(e){}
}

function loadProgress(){
  try{
    const raw = localStorage.getItem('quiz_answers');
    if(raw){
      const arr = JSON.parse(raw);
      if(Array.isArray(arr) && arr.length === questions.length) answers = arr;
    }
  }catch(e){}
}

function persistSessionToStorage(){
  try{
    if(sessionId && sessionToken){
      localStorage.setItem('quiz_session', sessionId);
      localStorage.setItem('quiz_token', sessionToken);
      localStorage.setItem('quiz_start', Date.now().toString());
      localStorage.setItem('quiz_totalTime', String(totalTime));
    }
    // always save answers
    saveProgress();
  }catch(e){ }
}

function loadSessionFromStorage(){
  try{
    const s = localStorage.getItem('quiz_session');
    const t = localStorage.getItem('quiz_token');
    const st = localStorage.getItem('quiz_start');
    const tt = localStorage.getItem('quiz_totalTime');
    if(s && t){
      sessionId = s;
      sessionToken = t;
      if(st) clientStartTime = Number(st); else clientStartTime = Date.now();
      if(tt) totalTime = Number(tt);
      return true;
    }
  }catch(e){}
  return false;
}

function clearSessionStorage(){
  try{
    localStorage.removeItem('quiz_session');
    localStorage.removeItem('quiz_token');
    localStorage.removeItem('quiz_start');
    localStorage.removeItem('quiz_totalTime');
    localStorage.removeItem('quiz_answers');
  }catch(e){}
}

function updateSubmitState(){
  const allAnswered = answers.every(a=>a !== null);
  el('submitBtn').disabled = !allAnswered;
}

function goto(idx){
  if(idx < 0 || idx >= questions.length) return;
  current = idx;
  renderQuestion(current);
}

function finishAndSubmitLocal(){
  // local fallback scoring
  clearInterval(timerId);
  let score = 0;
  questions.forEach((q,i)=>{
    if(answers[i] !== null && answers[i] === q.answerIndex) score++;
  });
  showResult({ score, total: questions.length, offline:true });
}

async function submitToServer(){
  // send session, token and answers to server
  if(!sessionId || !sessionToken) return finishAndSubmitLocal();
  try{
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: sessionId, token: sessionToken, answers })
    });
    if(!res.ok) throw new Error('server error');
    const data = await res.json();
    // server returns { ok:true, score, total, durationMs, suspicious }
    // clear session storage on successful submit
    clearSessionStorage();
    showResult(data);
  }catch(e){
    console.warn('Submit failed, falling back to local scoring', e);
    finishAndSubmitLocal();
  }
}

async function submitFromTimer(){
  // called when time runs out
  clearInterval(timerId);
  if(offlineMode) return finishAndSubmitLocal();
  await submitToServer();
}

function showResult(score){
  el('quizArea').classList.add('hidden');
  const r = el('result');
  // score may be number (old local) or an object from server
  let html = '';
  if(typeof score === 'object'){
    const s = score;
    const displayName = s.name || (localStorage.getItem && localStorage.getItem('quiz_name')) || '';
    if(displayName) html += `<p><strong>Name:</strong> ${escapeHtml(displayName)}</p>`;
    html += `<h2>Result</h2><p>Score: ${s.score} / ${s.total}</p>`;
    if(s.suspicious) html += `<p style="color:darkorange">Note: submission flagged as suspicious</p>`;
    if(s.offline) html += `<p style="color:gray">(Calculated locally — server unavailable)</p>`;
  } else {
    html += `<h2>Result</h2><p>Score: ${score} / ${questions.length}</p>`;
  }
  r.innerHTML = html;
  // optional: show per-question review
  const list = document.createElement('div');
  questions.forEach((q,i)=>{
    const d = document.createElement('div');
    d.className = 'card';
    const correct = q.options[q.answerIndex] || '(no answer key)';
    const given = answers[i] !== null ? q.options[answers[i]] : '<em>Not answered</em>';
    d.innerHTML = `<strong>Q${i+1}.</strong> ${q.question}<br><strong>Your:</strong> ${given}<br><strong>Answer:</strong> ${correct}`;
    list.appendChild(d);
  });
  r.appendChild(list);
  r.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await loadQuestions();
  loadProgress();
  // restore previously-entered name if present
  try{
    const storedName = localStorage.getItem('quiz_name');
    if(storedName && el('userName')) el('userName').value = storedName;
  }catch(e){}
  // bind buttons
  el('startBtn').addEventListener('click', ()=>{
    startQuiz();
  });

  el('prevBtn').addEventListener('click', ()=>{
    goto(current-1);
  });

  el('nextBtn').addEventListener('click', ()=>{
    if(current < questions.length - 1) goto(current+1);
    else {
      // last question - move to review/submit area: focus submit
      // we keep user on last q so they can click submit
      alert('You are on the last question. Click Submit when all questions are answered.');
    }
  });

  el('submitBtn').addEventListener('click', ()=>{
    const allAnswered = answers.every(a=>a !== null);
    if(!allAnswered){
      if(!confirm('Not all questions are answered. Submit anyway?')) return;
    }
    // normal submit path
    if(offlineMode) finishAndSubmitLocal();
    else submitToServer();
  });
});

async function startQuiz(){
  // enforce fixed 25-minute timer regardless of any UI input
  totalTime = 1500;
  el('setup').classList.add('hidden');
  el('quizArea').classList.remove('hidden');
  renderQuestion(0);
  updateSubmitState();

  // try to create server session
  // If a saved session exists in localStorage, offer to resume
  const hadSaved = loadSessionFromStorage();
  if(hadSaved){
    // validate saved session with server for safer resume
    try{
      const resp = await fetch(`/api/session/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(sessionToken)}`);
      if(resp.ok){
        const info = await resp.json();
        if(!info.exists){
          alert('Saved session was not found on server. Starting a new session.');
          clearSessionStorage();
        } else if(info.submitted){
          alert('This saved session was already submitted on the server. Starting a new session.');
          clearSessionStorage();
        } else if(!info.token_valid){
          const keep = confirm('Saved session token is invalid on the server. Do you want to discard and start a new session?');
          if(keep) clearSessionStorage();
          else return; // abort start
        } else {
          const resume = confirm('A valid server session was found. Resume previous session?');
          if(resume){
            // load answers if present
            loadProgress();
            // compute remaining time using server start_time if available, else client stored start
            const serverStart = info.start_time ? Number(info.start_time) : Number(localStorage.getItem('quiz_start')) || Date.now();
            const storedTotal = Number(localStorage.getItem('quiz_totalTime')) || totalTime;
            const elapsed = Math.floor((Date.now() - serverStart) / 1000);
            const remainingSec = storedTotal - elapsed;
            if(remainingSec <= 0){
              // time already elapsed — submit immediately
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
        // server responded non-OK; fallback to local resume prompt
        const resume = confirm('A quiz session exists locally but the server could not be contacted to validate it. Resume locally?');
        if(resume){
          loadProgress();
          const storedStart = Number(localStorage.getItem('quiz_start')) || Date.now();
          const storedTotal = Number(localStorage.getItem('quiz_totalTime')) || totalTime;
          const elapsed = Math.floor((Date.now() - storedStart) / 1000);
          const remainingSec = storedTotal - elapsed;
          if(remainingSec <= 0){ submitFromTimer(); return; }
          totalTime = storedTotal;
          startTimer(remainingSec);
          return;
        } else {
          clearSessionStorage();
        }
      }
    }catch(e){
      // network error — server unreachable. Offer local resume.
      const resume = confirm('Could not reach server to validate saved session. Resume locally?');
      if(resume){
        loadProgress();
        const storedStart = Number(localStorage.getItem('quiz_start')) || Date.now();
        const storedTotal = Number(localStorage.getItem('quiz_totalTime')) || totalTime;
        const elapsed = Math.floor((Date.now() - storedStart) / 1000);
        const remainingSec = storedTotal - elapsed;
        if(remainingSec <= 0){ submitFromTimer(); return; }
        totalTime = storedTotal;
        startTimer(remainingSec);
        return;
      } else {
        clearSessionStorage();
      }
    }
  }

  try{
    const name = (el('userName') && el('userName').value.trim()) || '';
    const res = await fetch('/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if(!res.ok) throw new Error('start failed');
    const body = await res.json();
    sessionId = body.session;
    sessionToken = body.token;
    // persist name client-side for later display
    try{ localStorage.setItem('quiz_name', body.name || name); }catch(e){}
    // persist session + answers
    persistSessionToStorage();
    // start timer using client's requested totalTime
    // also save start time
    localStorage.setItem('quiz_start', Date.now().toString());
    localStorage.setItem('quiz_totalTime', String(totalTime));
    startTimer(totalTime);
  }catch(e){
    console.warn('Could not reach server, running in offline mode', e);
    offlineMode = true;
    // persist answers locally as well
    persistSessionToStorage();
    startTimer(totalTime);
  }
}
