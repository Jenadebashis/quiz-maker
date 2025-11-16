# Timed Quiz — Single-question app

This is a minimal static quiz app that shows one question at a time, allows Prev/Continue navigation, and enforces a global timer. Submit is enabled only after all questions are answered (or the user may choose to submit earlier via confirmation).

# Timed Quiz — Single-question app

This is a minimal static quiz app that shows one question at a time, allows Prev/Continue navigation, and enforces a global timer. Submit is enabled only after all questions are answered (or the user may choose to submit earlier via confirmation).

Files in this workspace's `public` folder:
- `public/index.html` — main page
- `public/styles.css` — basic styles
- `public/script.js` — quiz logic (load `questions.json`, render one question at a time, navigation, timer, results)
- `public/questions.json` — quiz data (30 questions from your sheet)

How to run locally (static only):
1. Open `public/index.html` in a browser (some browsers block fetch() for local file access, so a tiny static server is recommended).

Quick static server (recommended) — using Node's http-server or serve tools:

PowerShell example (install if needed):
```powershell
npm install -g http-server
cd public
http-server -c-1
```
Then open the printed URL (usually http://127.0.0.1:8080).

Run with backend (recommended to collect results and prevent cheating):
1. From the project root (where `server.js` and `package.json` live) run:
```powershell
npm install
node server.js
```
2. Open http://localhost:3000 in your browser. The server will serve the `public` folder and provide the API endpoints described below.

API endpoints (server)
- POST /api/start — request body not required. Returns { session, token, startTime }. Call this when the user starts a quiz and save the session/token on the client.
- POST /api/submit — body: { session, token, answers } where `answers` is an array of selected option indices. The server will re-calculate the score from `public/questions.json`, store the result in SQLite, and return { ok:true, score, total, durationMs, suspicious }.
- GET /api/results — lists recent results (for local/admin use).

Security / anti-cheat notes
- Score is calculated server-side; client-submitted scores are not trusted.
- The server records start and submit timestamps and marks obviously suspicious submissions (e.g., duration < 3s, identical answers across all questions).
- This is a minimal setup. For production you should add authentication, HTTPS, and stronger anti-cheat measures (per-question time limits, IP throttling, CAPTCHA, signed start tokens, and rate-limiting).

Deploy options (with backend)
- Deploy to a small VPS or a platform that supports Node apps (Render, Fly, Heroku alternatives, etc.). The server is self-contained and uses a local SQLite file for storage.
