import React from 'react';

/**
 * InterviewProgress: Compact stage and question progress sidebar or strip.
 */
export default function InterviewProgress({
  currentQuestion = 1,
  totalQuestions = 5,
  interviewType = 'Mixed',
  stages = [
    { id: 'intro', label: 'Introduction' },
    { id: 'tech', label: 'Technical' },
    { id: 'coding', label: 'Coding & Algorithms' },
    { id: 'sys', label: 'System Design' },
    { id: 'behavioral', label: 'Behavioral & Closing' }
  ]
}) {
  const percent = Math.min(100, Math.round((currentQuestion / totalQuestions) * 100));
  
  // Calculate which stage roughly corresponds to the question index
  const stageIndex = Math.min(stages.length - 1, Math.floor(((currentQuestion - 1) / totalQuestions) * stages.length));

  return (
    <div className="interview-progress-widget flex-col gap-16">
      <div className="progress-top-meta flex justify-between items-center">
        <span className="progress-widget-title">Interview Progress</span>
        <span className="progress-fraction-badge mono">
          {currentQuestion} / {totalQuestions}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Stage Checklist */}
      <div className="stages-list flex-col gap-10">
        {stages.map((stage, idx) => {
          const isDone = idx < stageIndex;
          const isCurrent = idx === stageIndex;
          const isUpcoming = idx > stageIndex;

          return (
            <div 
              key={stage.id} 
              className={`stage-row flex items-center gap-10 ${isCurrent ? 'stage-current' : isDone ? 'stage-done' : 'stage-upcoming'}`}
            >
              <div className="stage-icon-indicator">
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : isCurrent ? (
                  <span className="current-pulsing-dot" />
                ) : (
                  <span className="upcoming-circle" />
                )}
              </div>
              <span className="stage-label">{stage.label}</span>
              {isCurrent && <span className="stage-live-tag">Active</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
