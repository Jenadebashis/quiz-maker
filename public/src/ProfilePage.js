import React, { useState, useEffect } from 'react';
import './styles.css';

const ProfilePage = ({ token, onViewDetails }) => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch('https://quiz-maker-backend-50pi.onrender.com/api/user/results', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error('Error fetching results', err);
      }
    };
    fetchResults();
  }, [token]);

  return (
    <div className="profile-page">
      <h2>Your Quiz History</h2>
      <div className="results-list">
        {results.map((result, index) => (
          <div key={index} className="result-item">
            <p>Quiz: {result.quizId}</p>
            <p>Score: {result.score}</p>
            <p>Date: {new Date(result.submitTime).toLocaleDateString()}</p>
            <a href="#" onClick={() => onViewDetails(result)}>View Details</a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;
