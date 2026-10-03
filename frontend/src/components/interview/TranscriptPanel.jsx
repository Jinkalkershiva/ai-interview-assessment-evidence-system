import React, { useRef, useEffect, useState } from 'react';

/**
 * TranscriptPanel: Dedicated conversation history panel showing dialogue turns between AI and candidate.
 */
export default function TranscriptPanel({
  history = [], // Array of { role: 'ai' | 'user', text: string, timestamp?: string }
  currentQuestion = '',
  currentAnswer = '',
  isListening = false,
  aiName = 'AI Interviewer'
}) {
  const [activeTab, setActiveTab] = useState('transcript'); // 'transcript' | 'notes'
  const [notes, setNotes] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, currentAnswer]);

  return (
    <div className="transcript-panel flex-col">
      {/* Tab Header */}
      <div className="transcript-header flex items-center justify-between">
        <div className="flex gap-4">
          <button 
            type="button"
            className={`transcript-tab-btn ${activeTab === 'transcript' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('transcript')}
          >
            <span className="tab-dot"></span>
            Transcript
          </button>
          <button 
            type="button"
            className={`transcript-tab-btn ${activeTab === 'notes' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Quick Notes
          </button>
        </div>
        <span className="transcript-count-badge">
          {history.length} turns
        </span>
      </div>

      {/* Tab Content */}
      {activeTab === 'transcript' ? (
        <div className="transcript-messages flex-col gap-16" ref={scrollRef}>
          {history.length === 0 && !currentQuestion ? (
            <div className="transcript-empty text-center text-muted">
              Conversation transcript will appear here in real-time.
            </div>
          ) : null}

          {history.map((turn, index) => {
            const isAi = turn.role === 'ai';
            return (
              <div 
                key={index} 
                className={`transcript-item flex gap-12 ${isAi ? 'item-ai' : 'item-user'}`}
              >
                <div className={`turn-avatar-badge ${isAi ? 'badge-ai' : 'badge-user'}`}>
                  {isAi ? 'AI' : 'YOU'}
                </div>
                <div className="turn-content flex-col gap-4">
                  <div className="turn-author flex items-center justify-between">
                    <span className="author-name">{isAi ? aiName : 'You (Candidate)'}</span>
                    {turn.time && <span className="turn-time">{turn.time}</span>}
                  </div>
                  <div className="turn-bubble">
                    {turn.text}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Current In-Progress Answer (Live transcript preview) */}
          {isListening && currentAnswer && (
            <div className="transcript-item flex gap-12 item-user in-progress">
              <div className="turn-avatar-badge badge-user">
                YOU
              </div>
              <div className="turn-content flex-col gap-4">
                <div className="turn-author flex items-center justify-between">
                  <span className="author-name">You (Speaking...)</span>
                  <span className="live-indicator">LIVE</span>
                </div>
                <div className="turn-bubble live-bubble">
                  {currentAnswer}
                  <span className="typing-cursor"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="transcript-notes-container flex-col flex-1 p-16">
          <textarea 
            className="notes-textarea"
            placeholder="Jot down personal reminders, keywords, or structure notes during the interview (not shared with AI)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
