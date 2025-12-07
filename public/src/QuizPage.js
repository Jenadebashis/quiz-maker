
import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Question from './Question';

const QuizPage = ({ quizName, onQuizSubmit, token }) => {
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
      handleSubmit();
    } else if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, questions.length]);

  const handleAnswerSelect = (questionIndex, answer) => {
    setAnswers({ ...answers, [questionIndex]: answer });
    const newQuestionStatus = [...questionStatus];
    if (newQuestionStatus[questionIndex] !== 'marked-for-review') {
      newQuestionStatus[questionIndex] = 'attempted';
    }
    setQuestionStatus(newQuestionStatus);
  };

  const handleQuestionNavigation = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleMarkForReview = () => {
    const newQuestionStatus = [...questionStatus];
    if (newQuestionStatus[currentQuestionIndex] === 'marked-for-review') {
      newQuestionStatus[currentQuestionIndex] = answers[currentQuestionIndex] ? 'attempted' : 'not-attempted';
    } else {
      newQuestionStatus[currentQuestionIndex] = 'marked-for-review';
    }
    setQuestionStatus(newQuestionStatus);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    const allQuestionsAnswered = Object.keys(answers).length === questions.length;
    if (!allQuestionsAnswered) {
      const confirmSubmit = window.confirm('You have not answered all the questions. Are you sure you want to submit?');
      if (!confirmSubmit) {
        return;
      }
    }
    const score = questions.reduce((acc, question, index) => {
      const correctAnswer = question.options[question.answerIndex];
      if (correctAnswer === answers[index]) {
        return acc + 1;
      }
      return acc;
    }, 0);

    try {
      await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quizId: quizName,
          answers,
          score,
          submitTime: new Date(),
        }),
      });
    } catch (err) {
      console.error('Error submitting quiz', err);
    }

    onQuizSubmit(questions, answers);
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
        <div className="navigation-buttons">
          <button onClick={handlePrevious} disabled={currentQuestionIndex === 0}>Previous</button>
          <button onClick={handleMarkForReview}>
            {questionStatus[currentQuestionIndex] === 'marked-for-review' ? 'Unmark' : 'Mark for Review'}
          </button>
          <button onClick={handleNext} disabled={currentQuestionIndex === questions.length - 1}>Next</button>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
