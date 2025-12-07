require('dotenv').config();
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

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  token: { type: String },
});
const User = mongoose.model('User', userSchema);

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
    const token = uuidv4();
    user.token = token;
    await user.save();
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

app.post('/api/quizzes/submit', async (req, res) => {
  const { quizId, answers, score } = req.body;
  const token = req.headers.authorization.split(' ')[1];

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const newResult = new Session({
      quizId,
      userId: user._id,
      answers,
      score,
      submitTime: new Date(),
    });

    await newResult.save();
    res.status(201).json({ message: 'Result saved successfully' });
  } catch (err) {
    console.error('Error submitting quiz', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/user/results', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const user = await User.findOne({ token });
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

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} — serving ${publicPath}`
  );
});
