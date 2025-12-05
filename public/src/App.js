import React, { useState } from 'react';
import HomePage from './HomePage';
import QuizPage from './QuizPage';
import ResultsPage from './ResultsPage';

const App = () => {
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizResult, setQuizResult] = useState(null);

  const handleQuizSubmit = (questions, answers) => {
    setQuizResult({ questions, answers });
    setSelectedQuiz(null);
  };

  const handleRestartQuiz = () => {
    setQuizResult(null);
  };

  if (quizResult) {
    return <ResultsPage questions={quizResult.questions} answers={quizResult.answers} onRestartQuiz={handleRestartQuiz} />;
  }

  if (selectedQuiz) {
    return <QuizPage quizName={selectedQuiz} onQuizSubmit={handleQuizSubmit} />;
  }

  return <HomePage onQuizSelect={setSelectedQuiz} />;
};

export default App;
