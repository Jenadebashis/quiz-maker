
import React, { useState, useEffect } from 'react';
import HomePage from './HomePage';
import QuizPage from './QuizPage';
import ResultsPage from './ResultsPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ProfilePage from './ProfilePage';
import Navbar from './Navbar';

const App = () => {
  const [currentPage, setCurrentPage] = useState('login');
  const [quizName, setQuizName] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUsername(storedUsername);
      setCurrentPage('home');
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
    setCurrentPage('login');
  };

  const handleViewDetails = (result) => {
    setSelectedResult(result);
    setCurrentPage('results');
  };

  const renderPage = () => {
    if (!token) {
      switch (currentPage) {
        case 'register':
          return <RegisterPage onRegister={handleRegister} />;
        default:
          return <LoginPage onLogin={handleLogin} />;
      }
    }

    switch (currentPage) {
      case 'quiz':
        return <QuizPage quizName={quizName} onQuizSubmit={handleQuizSubmit} token={token} />;
      case 'results':
        if (selectedResult) {
          return <ResultsPage questions={selectedResult.questions} answers={selectedResult.answers} onRestartQuiz={handleRestartQuiz} />;
        }
        return <ResultsPage questions={questions} answers={answers} onRestartQuiz={handleRestartQuiz} />;
      case 'profile':
        return <ProfilePage token={token} onViewDetails={handleViewDetails} />;
      default:
        return <HomePage onQuizStart={handleQuizStart} />;
    }
  };

  return (
    <div className="App">
      {token && (
        <Navbar username={username} onLogout={handleLogout} onNavigate={setCurrentPage} />
      )}
      {renderPage()}
    </div>
  );
};

export default App;
