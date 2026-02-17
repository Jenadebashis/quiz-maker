import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const ExplanationModal = ({ explanation, onClose }) => {
  // Helper to split text and identify math vs plain text
  const renderContent = (text) => {
    // This regex looks for content between $ symbols
    const parts = text.split(/(\$.*?\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        // Remove the $ signs and render as math
        const mathContent = part.slice(1, -1);
        return <InlineMath key={index} math={mathContent} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💡 Concept Deep-Dive</h3>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="explanation-text">
            {renderContent(explanation)}
          </div>
        </div>
        <div className="modal-footer">
          <button className="done-button" onClick={onClose}>Got it!</button>
        </div>
      </div>
    </div>
  );
};

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