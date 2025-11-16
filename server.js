const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '200kb' }));

// serve the existing static public folder at project root
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// initialize sqlite db
const dbPath = path.join(__dirname, 'quiz_results.sqlite3');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS sessions (
      session TEXT PRIMARY KEY,
      token TEXT,
      name TEXT,
      start_time INTEGER,
      submit_time INTEGER,
      duration INTEGER,
      score INTEGER,
      answers TEXT,
      ip TEXT,
      user_agent TEXT,
      suspicious INTEGER DEFAULT 0
    )`
  );
  // ensure legacy DBs get a `name` column added if missing
  db.all("PRAGMA table_info(sessions)", [], (err, cols) => {
    if(!err && Array.isArray(cols)){
      const hasName = cols.some(c => c.name === 'name');
      if(!hasName){
        db.run(`ALTER TABLE sessions ADD COLUMN name TEXT`, () => {});
      }
    }
  });
});

function loadQuestions(){
  const qPath = path.join(publicPath, 'questions.json');
  try{
    const raw = fs.readFileSync(qPath, 'utf8');
    return JSON.parse(raw);
  }catch(e){
    console.error('Could not load questions.json:', e.message);
    return null;
  }
}

// API: create a session when user starts the quiz
app.post('/api/start', (req, res) => {
  const session = uuidv4();
  const token = uuidv4();
  const startTime = Date.now();
  const ip = req.ip || req.headers['x-forwarded-for'] || '';
  const ua = req.get('User-Agent') || '';
  const name = (req.body && typeof req.body.name === 'string') ? req.body.name.trim() : '';

  db.run(
    `INSERT INTO sessions(session, token, name, start_time, ip, user_agent) VALUES (?,?,?,?,?,?)`,
    [session, token, name, startTime, ip, ua],
    function(err){
      if(err){
        console.error('DB insert start error', err);
        return res.status(500).json({ error: 'internal' });
      }
      res.json({ session, token, startTime, name });
    }
  );
});

// API: submit quiz answers — server re-calculates score and stores record
app.post('/api/submit', (req, res) => {
  const { session, token, answers } = req.body || {};
  if(!session || !token || !Array.isArray(answers)) return res.status(400).json({ error: 'invalid_payload' });

  db.get(`SELECT * FROM sessions WHERE session = ?`, [session], (err, row) => {
    if(err) return res.status(500).json({ error: 'db_error' });
    if(!row) return res.status(404).json({ error: 'session_not_found' });
    if(row.token !== token) return res.status(401).json({ error: 'invalid_token' });
    if(row.submit_time) return res.status(409).json({ error: 'already_submitted' });

    const questions = loadQuestions();
    if(!questions) return res.status(500).json({ error: 'no_questions' });
    if(answers.length !== questions.length) return res.status(400).json({ error: 'answers_length_mismatch' });

    // compute score server-side
    let score = 0;
    for(let i=0;i<questions.length;i++){
      const expected = typeof questions[i].answerIndex === 'number' ? questions[i].answerIndex : null;
      const given = answers[i];
      if(expected !== null && Number(given) === Number(expected)) score++;
    }

    const submitTime = Date.now();
    const duration = submitTime - row.start_time;

    // basic anti-cheat heuristics
    let suspicious = 0;
    // too fast to have really answered (less than 3 seconds)
    if(duration < 3000) suspicious = 1;
    // all answers identical? suspicious
    try{
      const uniq = new Set(answers.map(a=>String(a)));
      if(uniq.size === 1) suspicious = 1;
    }catch(e){}

    db.run(
      `UPDATE sessions SET submit_time = ?, duration = ?, score = ?, answers = ?, suspicious = ? WHERE session = ?`,
      [submitTime, duration, score, JSON.stringify(answers), suspicious, session],
      function(err){
        if(err) return res.status(500).json({ error: 'db_update' });
        // include stored name in response for immediate UI display
        res.json({ ok:true, score, total: questions.length, durationMs: duration, suspicious, name: row.name || null });
      }
    );
  });
});

// simple admin listing (not authenticated) — for local use only
app.get('/api/results', (req, res) => {
  db.all(`SELECT session, name, start_time, submit_time, duration, score, suspicious FROM sessions ORDER BY start_time DESC LIMIT 200`, [], (err, rows) => {
    if(err) return res.status(500).json({ error: 'db' });
    res.json(rows);
  });
});

// GET session status and validate token (used for safe resume)
app.get('/api/session/:id', (req, res) => {
  const id = req.params.id;
  const token = req.query.token || req.get('x-session-token') || null;
  db.get(`SELECT session, name, start_time, submit_time, duration, score, suspicious, token FROM sessions WHERE session = ?`, [id], (err, row) => {
    if(err) return res.status(500).json({ error: 'db_error' });
    if(!row) return res.status(404).json({ exists: false });
    const token_valid = token && token === row.token;
    res.json({
      exists: true,
      name: row.name || null,
      start_time: row.start_time,
      submitted: !!row.submit_time,
      submit_time: row.submit_time,
      duration: row.duration,
      score: row.score,
      suspicious: row.suspicious,
      token_valid: !!token_valid
    });
  });
});

app.listen(PORT, ()=>{
  console.log(`Server running on http://localhost:${PORT} — serving ${publicPath}`);
});
