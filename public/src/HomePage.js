import React, { useState, useEffect } from 'react';
import QuizCard from './QuizCard';

const HomePage = ({ onQuizStart, username, onLogout, onNavigate }) => {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    fetch('/api/quizzes')
      .then(res => res.json())
      .then(data => setQuizzes(data));
  }, []);

  return (
    <div className="home-page">
      <header className="header">
        <h1>Quiz App</h1>
        <nav className="navbar">
          {username ? (
            <>
              <a href="#" onClick={() => onNavigate('home')}>Home</a>
              <a href="#" onClick={() => onNavigate('profile')}>Profile</a>
              <button onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => onNavigate('login')}>Login</button>
              <button onClick={() => onNavigate('register')}>Register</button>
            </>
          )}
        </nav>
      </header>
      <div className="quiz-list">
        {quizzes.map(quiz => (
          <QuizCard key={quiz.id} quizName={quiz.name} onQuizSelect={onQuizStart} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;