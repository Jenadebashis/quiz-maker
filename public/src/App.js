import React, { useState } from 'react';
import HomePage from './HomePage';
import QuizPage from './QuizPage';

const App = () => {
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  if (selectedQuiz) {
    return <QuizPage quizName={selectedQuiz} />;
  }

  return <HomePage onQuizSelect={setSelectedQuiz} />;
};

export default App;
