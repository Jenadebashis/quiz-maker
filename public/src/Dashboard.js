import React from 'react';

const Dashboard = ({ questions, currentQuestionIndex, questionStatus, onQuestionNavegation }) => {
  return (
    <div className="dashboard">
      <h3 className="dashboard-title">Questions</h3>
      <div className="question-status-container">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`question-status-item ${questionStatus[index]} ${currentQuestionIndex === index ? 'active' : ''}`}
            onClick={() => onQuestionNavegation(index)}
          >
            {index + 1}
          </div>
        ))}
      </div>
      <div className="legend">
        <div className="legend-item"><span className="legend-color attempted"></span> Attempted</div>
        <div className="legend-item"><span className="legend-color not-attempted"></span> Not Attempted</div>
        <div className="legend-item"><span className="legend-color marked-for-review"></span> Marked for Review</div>
      </div>
    </div>
  );
};

export default Dashboard;