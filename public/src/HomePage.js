import React from 'react';
import QuizCard from './QuizCard';

const HomePage = ({ onQuizSelect }) => {
  const quizFiles = ["bed week 1 test", "bed week 2 test", "bed week 3 test"];

  return (
    <div className="homepage">
      <h1 className="homepage-title">Choose a Quiz</h1>
      <div className="quiz-card-container">
        {quizFiles.map(quizName => (
          <QuizCard key={quizName} quizName={quizName} onQuizSelect={onQuizSelect} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;