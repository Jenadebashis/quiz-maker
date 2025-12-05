import React from 'react';

const ResultsPage = ({ questions, answers, onRestartQuiz }) => {
  const score = questions.reduce((acc, question, index) => {
    if (question.Answer === answers[index]) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return (
    <div className="results-page">
      <h1 className="results-title">Quiz Results</h1>
      <h2 className="results-score">You scored {score} out of {questions.length}</h2>
      <div className="results-questions">
        {questions.map((question, index) => (
          <div key={index} className={`result-question ${question.Answer === answers[index] ? 'correct' : 'incorrect'}`}>
            <h3 className="result-question-title">{question.question}</h3>
            <p className="result-question-user-answer">Your answer: {answers[index] || 'Not Answered'}</p>
            <p className="result-question-correct-answer">Correct answer: {question.Answer}</p>
          </div>
        ))}
      </div>
      <button className="restart-button" onClick={onRestartQuiz}>Restart Quiz</button>
    </div>
  );
};

export default ResultsPage;