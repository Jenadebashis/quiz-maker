
import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Question from './Question';

const QuizPage = ({ quizName }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStatus, setQuestionStatus] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    fetch(`/Test Json Files/${quizName}.json`)
      .then(res => res.json())
      .then(data => {
        setQuestions(data);
        setQuestionStatus(Array(data.length).fill('not-attempted'));
        setTimeLeft(data.length * 5 / 6 * 60);
      });
  }, [quizName]);

  useEffect(() => {
    if (timeLeft === 0 && questions.length > 0) {
      // Handle timeout
    } else if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, questions.length]);

  const handleAnswerSelect = (questionIndex, answer) => {
    setAnswers({ ...answers, [questionIndex]: answer });
    const newQuestionStatus = [...questionStatus];
    newQuestionStatus[questionIndex] = 'attempted';
    setQuestionStatus(newQuestionStatus);
  };

  const handleQuestionNavigation = (index) => {
    setCurrentQuestionIndex(index);
  };

  if (questions.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="quiz-page">
      <Dashboard
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        questionStatus={questionStatus}
        onQuestionNavegation={handleQuestionNavigation}
      />
      <div className="question-container">
        <div className="timer">Time Left: {Math.floor(timeLeft / 60)}:{("0" + (timeLeft % 60)).slice(-2)}</div>
        <Question
          question={questions[currentQuestionIndex]}
          answer={answers[currentQuestionIndex]}
          onAnswerSelect={(answer) => handleAnswerSelect(currentQuestionIndex, answer)}
        />
      </div>
    </div>
  );
};

export default QuizPage;
