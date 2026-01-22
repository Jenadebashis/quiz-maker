import React, { useState, useEffect } from 'react';
import QuizCard from './QuizCard';

const HomePage = ({ onQuizStart, token }) => {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    fetch('https://quiz-maker-backend-50pi.onrender.com/api/quizzes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setQuizzes(data));
  }, [token]);

  return (
    <div className="home-page">
      <div className="quiz-list">
        {quizzes.map(quiz => (
          <QuizCard key={quiz.id} quizName={quiz.name} onQuizSelect={onQuizStart} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
