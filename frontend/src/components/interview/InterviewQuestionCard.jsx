import React from 'react';

/**
 * InterviewQuestionCard: Visually prominent card presenting the active interview question.
 */
export default function InterviewQuestionCard({
  category = 'Technical',
  questionNumber = 1,
  totalQuestions = 5,
  difficulty = 'Intermediate',
  question = '',
  isSpeaking = false,
  onRepeatQuestion,
}) {
  return (
    <div className="interview-question-card">
      <div className="question-card-top flex justify-between items-center">
        <div className="flex items-center gap-8 flex-wrap">
          <span className="question-eyebrow-label">CURRENT QUESTION</span>
          <span className="question-category-tag">
            {category.toUpperCase()} <span className="tag-separator" aria-hidden="true">/</span> QUESTION {questionNumber} OF {totalQuestions}
          </span>
          {difficulty && (
            <span className="question-difficulty-tag">
              {difficulty}
            </span>
          )}
        </div>

        {onRepeatQuestion && (
          <button 
            type="button" 
            className="btn-ghost flex items-center gap-6 repeat-btn"
            onClick={onRepeatQuestion}
            title="Read question aloud again"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <span>{isSpeaking ? 'Speaking...' : 'Listen again'}</span>
          </button>
        )}
      </div>

      <div className="question-card-body mt-8">
        <h2 className="interview-question-text">
          {question}
        </h2>
      </div>
    </div>
  );
}
