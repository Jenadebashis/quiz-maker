import React from 'react';

const QuizCard = ({ quizName, onQuizSelect }) => {
  return (
    <div className="quiz-card" onClick={() => onQuizSelect(quizName)}>
      <div className="quiz-icon">▶</div>
      <h2 className="quiz-card-title">{quizName}</h2>
    </div>
  );
};

export default QuizCard;