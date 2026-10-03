import React from 'react';

/**
 * InterviewControls: Ergonomic interview action bar with primary hierarchy,
 * central voice microphone, audio controls, and submit action.
 */
export default function InterviewControls({
  isListening = false,
  isSpeaking = false,
  isLoading = false,
  hasAnswer = false,
  isFinalQuestion = false,
  isPaused = false,
  onToggleMic,
  onTogglePause,
  onRepeatQuestion,
  onSubmitAnswer,
  onToggleTextInput,
  showTextInput = true,
}) {
  return (
    <div className="interview-controls-bar flex items-center justify-between">
      {/* Left utility tools */}
      <div className="controls-left flex items-center gap-12">
        <button
          type="button"
          className={`control-circle-btn ${isSpeaking ? 'active-audio' : ''}`}
          onClick={onRepeatQuestion}
          disabled={isLoading}
          title={isSpeaking ? 'AI is speaking' : 'Read question aloud'}
          aria-label="Replay audio"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        </button>

        <button
          type="button"
          className={`control-pill-btn ${isPaused ? 'pill-paused' : ''}`}
          onClick={onTogglePause}
          disabled={isLoading}
          title={isPaused ? 'Resume interview' : 'Pause audio'}
        >
          <span className="control-btn-icon flex items-center">
            {isPaused ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            )}
          </span>
          <span className="control-btn-label">
            {isPaused ? 'Resume' : 'Pause'}
          </span>
        </button>

        <button
          type="button"
          className={`control-pill-btn ${showTextInput ? 'pill-active' : ''}`}
          onClick={onToggleTextInput}
          title="Toggle text response editor"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7"></polyline>
            <line x1="9" y1="20" x2="15" y2="20"></line>
            <line x1="12" y1="4" x2="12" y2="20"></line>
          </svg>
          <span className="control-btn-label">
            {showTextInput ? 'Hide Text' : 'Type Answer'}
          </span>
        </button>
      </div>

      {/* Center hero: Large Microphone with active audio wave ring */}
      <div className="controls-center flex items-center justify-center">
        <div className="hero-mic-container">
          {isListening && <div className="mic-pulse-ring ring-1"></div>}
          {isListening && <div className="mic-pulse-ring ring-2"></div>}
          <button
            type="button"
            className={`hero-mic-button ${isListening ? 'is-recording' : ''}`}
            onClick={onToggleMic}
            disabled={isLoading}
            title={isListening ? 'Click to pause microphone' : 'Click to speak your answer'}
            aria-label={isListening ? 'Stop microphone' : 'Start microphone'}
            aria-pressed={isListening}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Right hero: Next / Submit Button with highest visual weight */}
      <div className="controls-right flex items-center gap-12">
        <button
          type="button"
          className="btn-primary submit-action-btn flex items-center gap-8"
          onClick={onSubmitAnswer}
          disabled={isLoading || !hasAnswer}
          title="Submit your answer (Ctrl + Enter)"
        >
          {isLoading ? (
            <>
              <span className="spinner-dots"></span>
              <span>Analyzing response...</span>
            </>
          ) : isFinalQuestion ? (
            <>
              <span>Finish & View Report</span>
              <span className="submit-arrow flex items-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            </>
          ) : (
            <>
              <span>Next Question</span>
              <span className="submit-arrow flex items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
