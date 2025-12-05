import React from 'react';

const Question = ({ question, answer, onAnswerSelect }) => {
  return (
    <div className="question">
      <h2 className="question-title">{question.question}</h2>
      <div className="options-container">
        {question.options.map((option, index) => (
          <div key={index} className={`option ${answer === option ? 'selected' : ''}`} onClick={() => onAnswerSelect(option)}>
            <input
              type="radio"
              id={`option-${index}`}
              name="option"
              value={option}
              checked={answer === option}
              onChange={() => onAnswerSelect(option)}
            />
            <label htmlFor={`option-${index}`}>{option}</label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Question;