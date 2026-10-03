import React from 'react';
import AvatarRenderer from './AvatarRenderer.jsx';
import { getAvatarById } from './avatarRegistry.js';

/**
 * AvatarStage: Large prominent AI interviewer stage with status indicator,
 * ambient glow, and animated audio waveform.
 */
export default function AvatarStage({
  avatarId = 'human',
  state = 'IDLE', // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'SUCCESS'
  size = 190,
  statusText,
  showWaveform = true,
}) {
  const avatar = getAvatarById(avatarId);
  if (avatarId === 'none') return null;

  const isSpeaking = state === 'SPEAKING';
  const isListening = state === 'LISTENING';
  const isThinking = state === 'THINKING';

  // Derived status text if not explicitly provided
  const displayStatus = statusText || (
    isSpeaking ? 'Speaking...' :
    isListening ? 'Listening to your response...' :
    isThinking ? 'Analyzing your answer...' :
    'Waiting for your response'
  );

  const statusColor = isSpeaking ? 'var(--accent)' :
                      isListening ? 'var(--danger)' :
                      isThinking ? 'var(--warning)' :
                      'var(--text-muted)';

  return (
    <div className="avatar-stage flex-col items-center">
      {/* Halo / Ambient Glow Container */}
      <div className={`avatar-halo-wrapper ${isSpeaking ? 'is-speaking' : ''} ${isListening ? 'is-listening' : ''} ${isThinking ? 'is-thinking' : ''}`}>
        <AvatarRenderer 
          avatarId={avatarId} 
          state={state} 
          size={size} 
          showBadge={false} 
        />
      </div>

      {/* Interviewer identity info */}
      <div className="avatar-meta text-center mt-12">
        <h3 className="avatar-name">{avatar.name}</h3>
        <p className="avatar-title text-muted">{avatar.title}</p>
      </div>

      {/* Dynamic Status Pill */}
      <div 
        className="avatar-status-pill flex items-center gap-8 mt-8"
        style={{ borderColor: isSpeaking || isListening ? statusColor : 'var(--border)' }}
      >
        <span 
          className={`status-indicator-dot ${isSpeaking ? 'dot-speaking' : isListening ? 'dot-listening' : isThinking ? 'dot-thinking' : 'dot-idle'}`} 
          style={{ backgroundColor: statusColor }}
        />
        <span className="status-indicator-text" style={{ color: isSpeaking || isListening ? statusColor : 'var(--text)' }}>
          {displayStatus}
        </span>
      </div>

      {/* Animated Sound Waveform (Active during speaking or listening) */}
      {showWaveform && (
        <div className={`audio-waveform-container flex items-center justify-center gap-4 mt-12 ${isSpeaking || isListening ? 'waveform-active' : 'waveform-idle'}`}>
          <span className="waveform-bar bar-1"></span>
          <span className="waveform-bar bar-2"></span>
          <span className="waveform-bar bar-3"></span>
          <span className="waveform-bar bar-4"></span>
          <span className="waveform-bar bar-5"></span>
          <span className="waveform-bar bar-6"></span>
          <span className="waveform-bar bar-7"></span>
          <span className="waveform-bar bar-8"></span>
          <span className="waveform-bar bar-9"></span>
          <span className="waveform-bar bar-10"></span>
          <span className="waveform-bar bar-11"></span>
        </div>
      )}
    </div>
  );
}
