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
        <div className="user-info">
          {username ? (
            <>
              <span>Welcome, {username}</span>
              <button onClick={() => onNavigate('profile')}>Profile</button>
              <button onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => onNavigate('login')}>Login</button>
              <button onClick={() => onNavigate('register')}>Register</button>
            </>
          )}
        </div>
      </header>
      <div className="quiz-list">
        {quizzes.map(quiz => (
          <QuizCard key={quiz.id} quiz={quiz} onQuizStart={onQuizStart} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;