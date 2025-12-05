import React from 'react';

const QuizCard = ({ quizName }) => {
  return (
    <div className="quiz-card">
      <div className="quiz-icon">▶</div>
      <h2 className="quiz-card-title">{quizName}</h2>
    </div>
  );
};

export default QuizCard;