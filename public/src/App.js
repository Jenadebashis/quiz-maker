import React, { useState, useEffect } from 'react';
import HomePage from './HomePage';
import QuizPage from './QuizPage';
import ResultsPage from './ResultsPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ProfilePage from './ProfilePage';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [quizName, setQuizName] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUsername(storedUsername);
    }
  }, []);

  const handleQuizStart = (quizName) => {
    setQuizName(quizName);
    setCurrentPage('quiz');
  };

  const handleQuizSubmit = (questions, answers) => {
    setQuestions(questions);
    setAnswers(answers);
    setCurrentPage('results');
  };

  const handleRestartQuiz = () => {
    setCurrentPage('home');
  };

  const handleLogin = (token, username) => {
    setToken(token);
    setUsername(username);
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    setCurrentPage('home');
  };

  const handleRegister = () => {
    setCurrentPage('login');
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'quiz':
        return <QuizPage quizName={quizName} onQuizSubmit={handleQuizSubmit} token={token} />;
      case 'results':
        return <ResultsPage questions={questions} answers={answers} onRestartQuiz={handleRestartQuiz} />;
      case 'login':
        return <LoginPage onLogin={handleLogin} />;
      case 'register':
        return <RegisterPage onRegister={handleRegister} />;
      case 'profile':
        return <ProfilePage token={token} />;
      default:
        return <HomePage onQuizStart={handleQuizStart} username={username} onLogout={handleLogout} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
};

export default App;
