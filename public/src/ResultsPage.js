import React, { useState } from 'react';

// A simple Modal component to display the explanation
const ExplanationModal = ({ explanation, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h3>Explanation</h3>
      <p>{explanation}</p>
      <button className="close-modal-button" onClick={onClose}>Close</button>
    </div>
  </div>
);

const ResultsPage = ({ questions, answers, onRestartQuiz }) => {
  const [activeExplanation, setActiveExplanation] = useState(null);

  // Scoring logic: +1 for correct, -0.5 for incorrect, 0 for skipped
  const score = questions.reduce((acc, question, index) => {
    const correctAnswer = question.options[question.answerIndex];
    const userAnswer = answers[index];

    if (!userAnswer) return acc;
    return correctAnswer === userAnswer ? acc + 1 : acc - 0.5;
  }, 0);

  return (
    <div className="results-page">
      <h1 className="results-title">Quiz Results</h1>
      <h2 className="results-score">Total Score: {score}</h2>

      <div className="results-questions">
        {questions.map((question, index) => {
          const correctAnswer = question.options[question.answerIndex];
          const userAnswer = answers[index];
          const isCorrect = correctAnswer === userAnswer;
          const isSkipped = !userAnswer;

          return (
            <div
              key={index}
              className={`result-question ${isSkipped ? 'skipped' : isCorrect ? 'correct' : 'incorrect'}`}
            >
              <h3 className="result-question-title">{question.question}</h3>
              <p className="result-question-user-answer">
                Your answer: {userAnswer || 'Not Answered'}
                <strong>
                  {isSkipped ? ' (0 pts)' : isCorrect ? ' (+1 pt)' : ' (-0.5 pts)'}
                </strong>
              </p>
              <p className="result-question-correct-answer">Correct answer: {correctAnswer}</p>
              
              {/* Trigger for the Modal */}
              <button 
                className="view-explanation-btn"
                onClick={() => setActiveExplanation(question.explanation)}
              >
                View Explanation
              </button>
            </div>
          );
        })}
      </div>

      <button className="restart-button" onClick={onRestartQuiz}>Restart Quiz</button>

      {/* Render Modal if an explanation is selected */}
      {activeExplanation && (
        <ExplanationModal 
          explanation={activeExplanation} 
          onClose={() => setActiveExplanation(null)} 
        />
      )}
    </div>
  );
};

export default ResultsPage;