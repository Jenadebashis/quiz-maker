const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '200kb' }));

// serve the existing static public folder at project root
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Connect to MongoDB
// IMPORTANT: Replace <YOUR_USERNAME> and <YOUR_PASSWORD> with your MongoDB credentials.
mongoose.connect('mongodb://<YOUR_USERNAME>:<YOUR_PASSWORD>@localhost:27017/quizdb');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define a schema for users
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In a real app, you should hash this!
});
const User = mongoose.model('User', userSchema);

// Define a schema for quiz results
const sessionSchema = new mongoose.Schema({
  session: { type: String, required: true, unique: true },
  token: String,
  name: String,
  startTime: Number,
  submitTime: Number,
  duration: Number,
  score: Number,
  answers: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  suspicious: { type: Number, default: 0 },
  quizId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const Session = mongoose.model('Session', sessionSchema);

// API: Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Login a user
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = uuidv4(); // Generate a simple token
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


function getAvailableQuizzes() {
  const directoryPath = path.join(__dirname, 'public', 'Test Json Files');
  try {
    const files = fs.readdirSync(directoryPath);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const quizId = path.basename(file, '.json');
        const quizPath = path.join(directoryPath, file);
        const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
        return {
          id: quizId,
          name: quizData.name || quizId,
        };
      });
  } catch (err) {
    console.error('Unable to scan directory: ' + err);
    return [];
  }
}

function loadQuestions(quizId) {
  const qPath = path.join(publicPath, 'Test Json Files', `${quizId}.json`);
  try {
    const raw = fs.readFileSync(qPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Could not load questions for ${quizId}:`, e.message);
    return null;
  }
}

app.get('/api/quizzes', (req, res) => {
  res.json(getAvailableQuizzes());
});

// API: create a session when user starts the quiz
app.post('/api/start', async (req, res) => {
  const { name, quizId, userId } = req.body;
  const session = uuidv4();
  const token = uuidv4();
  const startTime = Date.now();
  const ip = req.ip || req.headers['x-forwarded-for'] || '';
  const ua = req.get('User-Agent') || '';
  const nameTrimmed = (name && typeof name === 'string') ? name.trim() : '';

  const newSession = new Session({
    session,
    token,
    name: nameTrimmed,
    startTime,
    ip,
    userAgent: ua,
    quizId,
    userId,
  });

  try {
    await newSession.save();
    res.json({ session, token, startTime, name: nameTrimmed });
  } catch (err) {
    console.error('DB insert start error', err);
    res.status(500).json({ error: 'internal' });
  }
});

// API: submit quiz answers — server re-calculates score and stores record
app.post('/api/submit', async (req, res) => {
  const { session, token, answers, quizId } = req.body || {};
  if (!session || !token || !Array.isArray(answers) || !quizId)
    return res.status(400).json({ error: 'invalid_payload' });

  try {
    const existingSession = await Session.findOne({ session });

    if (!existingSession)
      return res.status(404).json({ error: 'session_not_found' });
    if (existingSession.token !== token)
      return res.status(401).json({ error: 'invalid_token' });
    if (existingSession.submitTime)
      return res.status(409).json({ error: 'already_submitted' });

    const questions = loadQuestions(quizId);
    if (!questions) return res.status(500).json({ error: 'no_questions' });
    if (answers.length !== questions.length)
      return res.status(400).json({ error: 'answers_length_mismatch' });

    // compute score server-side
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      const expected =
        typeof questions[i].answerIndex === 'number'
          ? questions[i].answerIndex
          : null;
      const given = answers[i];
      if (expected !== null && Number(given) === Number(expected)) score++;
    }

    const submitTime = Date.now();
    const duration = submitTime - existingSession.startTime;

    // basic anti-cheat heuristics
    let suspicious = 0;
    // too fast to have really answered (less than 3 seconds)
    if (duration < 3000) suspicious = 1;
    // all answers identical? suspicious
    try {
      const uniq = new Set(answers.map((a) => String(a)));
      if (uniq.size === 1) suspicious = 1;
    } catch (e) {}

    existingSession.submitTime = submitTime;
    existingSession.duration = duration;
    existingSession.score = score;
    existingSession.answers = answers;
    existingSession.suspicious = suspicious;

    await existingSession.save();

    res.json({
      ok: true,
      score,
      total: questions.length,
      durationMs: duration,
      suspicious,
      name: existingSession.name || null,
    });
  } catch (err) {
    console.error('DB update error', err);
    res.status(500).json({ error: 'db_update' });
  }
});

// simple admin listing (not authenticated) — for local use only
app.get('/api/results', async (req, res) => {
  try {
    const results = await Session.find()
      .sort({ startTime: -1 })
      .limit(200)
      .select('session name startTime submitTime duration score suspicious');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'db' });
  }
});

app.get('/api/user/results', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const user = await User.findOne({ /* Find user by token */ });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const results = await Session.find({ userId: user._id });
        res.json(results);
    } catch (err) {
        console.error('Error fetching user results:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET session status and validate token (used for safe resume)
app.get('/api/session/:id', async (req, res) => {
  const id = req.params.id;
  const token = req.query.token || req.get('x-session-token') || null;

  try {
    const existingSession = await Session.findOne({ session: id });

    if (!existingSession) return res.status(404).json({ exists: false });

    const token_valid = token && token === existingSession.token;
    res.json({
      exists: true,
      name: existingSession.name || null,
      startTime: existingSession.startTime,
      submitted: !!existingSession.submitTime,
      submitTime: existingSession.submitTime,
      duration: existingSession.duration,
      score: existingSession.score,
      suspicious: existingSession.suspicious,
      token_valid: !!token_valid,
    });
  } catch (err) {
    res.status(500).json({ error: 'db_error' });
  }
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} — serving ${publicPath}`
  );
});
