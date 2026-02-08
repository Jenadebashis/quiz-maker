import React from 'react';

const ResultsPage = ({ questions, answers, onRestartQuiz }) => {
  // Updated scoring logic with -0.5 for wrong answers
  const score = questions.reduce((acc, question, index) => {
    const correctAnswer = question.options[question.answerIndex];
    const userAnswer = answers[index];

    if (!userAnswer) {
      return acc; // 0 points for skipped questions
    }
    if (correctAnswer === userAnswer) {
      return acc + 1; // +1 for correct
    }
    return acc - 0.5; // -0.5 for incorrect
  }, 0);

  return (
    <div className="results-page">
      <h1 className="results-title">Quiz Results</h1>
      {/* Displaying the calculated score */}
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
            </div>
          );
        })}
      </div>
      <button className="restart-button" onClick={onRestartQuiz}>Restart Quiz</button>
    </div>
  );
};

export default ResultsPage;