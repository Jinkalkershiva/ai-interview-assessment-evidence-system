import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import AvatarRenderer from '../../components/avatar/AvatarRenderer.jsx';

export default function WorkUpdateSession({ roomId, token, onSessionCompleted, onExit }) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Screen sharing & media stream
  const [screenStream, setScreenStream] = useState(null);
  const [screenActive, setScreenActive] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(null);
  const [capturingFrame, setCapturingFrame] = useState(false);
  const [recentCaptureCategory, setRecentCaptureCategory] = useState(null);
  const [aiNotice, setAiNotice] = useState(null);

  // Audio / Speech-to-text
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastSpokenText, setLastSpokenText] = useState('');
  const recognitionRef = useRef(null);
  const lastSpokenTextRef = useRef('');

  // Active follow-up question answer
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [answering, setAnswering] = useState(false);

  // Session elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Video and canvas refs for frame extraction
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // Fetch initial room state
  const loadRoomState = useCallback(async () => {
    try {
      const data = await api.getWorkUpdateRoom(roomId, token);
      setRoom(data);
      setIsPaused(data.paused);

      if (data.aiStatus === 'AI_QUOTA_EXCEEDED' || data.aiQuotaExceeded) {
        setAiNotice(data.aiMessage || 'AI analysis is temporarily unavailable because the configured Gemini quota has been exhausted. Screen evidence capture continues normally.');
      }

      // Check for pending follow-up questions
      if (data.followUpQuestions && data.followUpQuestions.length > 0) {
        const pending = data.followUpQuestions.find(q => !q.answer || q.answer.trim() === '');
        if (pending) setActiveQuestion(pending);
      }
    } catch (err) {
      setError(err.message || 'Failed to load room details.');
    } finally {
      setLoading(false);
    }
  }, [roomId, token]);

  useEffect(() => {
    loadRoomState();
  }, [loadRoomState]);

  // Session timer
  useEffect(() => {
    if (isPaused || loading) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, loading]);

  // Start Screen Sharing
  const startScreenShare = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      setScreenStream(stream);
      setScreenActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Handle user stopping stream from browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Screen sharing was cancelled or permission was denied by user.');
      } else {
        setError('Screen share error: ' + err.message);
      }
    }
  };

  // Stop Screen Sharing
  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    setScreenStream(null);
    setScreenActive(false);
  };

  // Capture single frame from screen share and send to AI analysis
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !screenActive || isPaused) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setCapturingFrame(true);

    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      // Scale down to max 1024px width for efficient network and token usage
      const maxWidth = 960;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBase64 = canvas.toDataURL('image/jpeg', 0.65);

      const res = await api.analyzeWorkUpdateFrame(roomId, token, {
        imageBase64,
        participantNote: '',
        currentTranscript: lastSpokenTextRef.current || transcript
      });

      setRecentCaptureCategory(res.detectedCategory);
      setLastCaptureTime(res.formattedTime);

      if (res.aiStatus === 'AI_QUOTA_EXCEEDED') {
        setAiNotice(res.aiMessage || 'AI analysis is temporarily unavailable because the configured Gemini quota has been exhausted. Screen evidence capture continues normally.');
      } else {
        setAiNotice(null);
      }

      if (res.suggestedFollowUpQuestion) {
        setActiveQuestion({
          id: 'temp-' + Date.now(),
          question: res.suggestedFollowUpQuestion
        });
      }

      // Refresh room timeline
      loadRoomState();
    } catch (err) {
      console.warn('[ScreenCapture] Error analyzing frame:', err.message);
    } finally {
      setCapturingFrame(false);
    }
  }, [screenActive, isPaused, roomId, token, transcript, loadRoomState]);

  // Periodic capture interval: every 12 seconds when screen sharing is active
  useEffect(() => {
    if (screenActive && !isPaused) {
      // Capture first frame shortly after starting share
      const initialTimer = setTimeout(() => {
        captureFrame();
      }, 1500);

      captureIntervalRef.current = setInterval(() => {
        captureFrame();
      }, 12000);

      return () => {
        clearTimeout(initialTimer);
        if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      };
    } else {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    }
  }, [screenActive, isPaused, captureFrame]);

  // Toggle Microphone / Speech-to-Text
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (listening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recog = new SR();
    recog.lang = 'en-US';
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = (e) => {
      let currentSessionText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        currentSessionText += e.results[i][0].transcript;
      }
      lastSpokenTextRef.current = currentSessionText;
      setLastSpokenText(currentSessionText);
    };

    recog.onend = () => {
      setListening(false);
      const textToLog = lastSpokenTextRef.current.trim();
      if (textToLog) {
        setTranscript(prev => (prev ? prev + ' ' : '') + textToLog);
        api.logWorkUpdateTranscript(roomId, token, { text: textToLog, category: 'Explanation' })
          .then(() => loadRoomState())
          .catch(err => console.warn('Failed to log transcript:', err));
        lastSpokenTextRef.current = '';
        setLastSpokenText('');
      }
    };

    recog.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed') {
        setError('Microphone access was denied. Please enable microphone permissions in your browser settings.');
      } else if (e.error !== 'no-speech') {
        setError('Microphone error: ' + e.error);
      }
    };

    recog.start();
    recognitionRef.current = recog;
    setListening(true);
    setError(null);
  };

  // Pause / Resume Session
  const togglePause = async () => {
    try {
      if (isPaused) {
        await api.startWorkUpdateSession(roomId, token);
        setIsPaused(false);
      } else {
        await api.pauseWorkUpdateSession(roomId, token);
        setIsPaused(true);
      }
      loadRoomState();
    } catch (err) {
      setError(err.message || 'Failed to toggle pause state.');
    }
  };

  // Submit Answer to Follow-Up Question
  const submitAnswer = async () => {
    if (!questionAnswer.trim() || !activeQuestion) return;
    setAnswering(true);
    try {
      await api.answerWorkUpdateQuestion(roomId, token, {
        questionId: activeQuestion.id,
        answer: questionAnswer.trim()
      });
      setActiveQuestion(null);
      setQuestionAnswer('');
      loadRoomState();
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
    } finally {
      setAnswering(false);
    }
  };

  // End Session & Generate Report
  const completeSession = async () => {
    if (screenStream) stopScreenShare();
    if (listening && recognitionRef.current) recognitionRef.current.stop();

    setLoading(true);
    try {
      const updated = await api.completeWorkUpdateSession(roomId, token);
      onSessionCompleted(updated);
    } catch (err) {
      setError(err.message || 'Failed to complete session and generate report.');
      setLoading(false);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex-col items-center justify-center flex-1" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div className="mono text-muted" style={{ fontSize: '15px' }}>
          Generating evidence-based work report with AI...
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="screen-container flex-col gap-16 items-center justify-center">
        <h3>Room Not Found</h3>
        <button className="btn-primary" onClick={onExit}>Return</button>
      </div>
    );
  }

  return (
    <div className="screen-container flex-col gap-24" style={{ maxWidth: '1080px' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header Bar */}
      <div 
        className="flex justify-between items-center"
        style={{
          padding: '16px 20px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}
      >
        <div>
          <div className="flex items-center gap-12">
            <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
              {room.roomId}
            </span>
            <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
              {room.status}
            </span>
            {isPaused && (
              <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
                Paused
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px', marginBottom: '2px' }}>
            {room.task}
          </h2>
          <div className="text-muted" style={{ fontSize: '13px' }}>
            {room.project} • Participant: {room.participantName}
          </div>
        </div>

        <div className="flex items-center gap-16">
          <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: isPaused ? 'var(--text-muted)' : 'var(--text)' }}>
            {formatTimer(elapsedSeconds)}
          </div>
          <button 
            type="button"
            className="btn-ghost"
            onClick={togglePause}
            style={{ fontSize: '13px' }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button 
            type="button"
            className="btn-primary"
            onClick={completeSession}
            style={{ fontSize: '13px', backgroundColor: '#059669' }}
          >
            Complete & Generate Report
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      {aiNotice && (
        <div 
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            background: 'rgba(217, 119, 6, 0.08)',
            border: '1px solid #D97706',
            color: '#B45309',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontWeight: 600 }}>Notice:</span>
          <span>{aiNotice}</span>
        </div>
      )}

      {/* Screen Sharing Privacy Notice */}
      <div 
        style={{
          padding: '10px 16px',
          borderRadius: '6px',
          background: screenActive ? 'rgba(37, 99, 235, 0.08)' : 'var(--surface-alt)',
          border: `1px solid ${screenActive ? 'var(--accent)' : 'var(--border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'between',
          fontSize: '13px'
        }}
      >
        <div className="flex items-center gap-8">
          <span 
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: screenActive ? '#16A34A' : 'var(--text-muted)',
              animation: screenActive ? 'pulse 2s infinite' : 'none'
            }}
          />
          <span>
            {screenActive ? (
              <strong>Screen capture active: analyzing visible artifacts at 12s intervals.</strong>
            ) : (
              'Screen sharing is currently idle. Click "Share Screen" below to demonstrate your work.'
            )}
          </span>
        </div>
        {recentCaptureCategory && (
          <span className="mono" style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--accent)' }}>
            Last detected: {recentCaptureCategory} ({lastCaptureTime})
          </span>
        )}
      </div>

      {/* Main Workspace Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.8fr) minmax(280px, 1.2fr)',
          gap: '20px'
        }}
      >
        {/* Left Column: Screen Share Feed & Audio Explanation */}
        <div className="flex-col gap-20">
          {/* Screen Share Display Box */}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '280px',
              background: '#0B132B',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border)'
            }}
          >
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: screenActive ? 'block' : 'none'
              }}
            />

            {!screenActive && (
              <div className="flex-col items-center gap-12" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <div style={{ fontSize: '14px' }}>Demonstrate IDE, Terminal, Browser, or APIs</div>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={startScreenShare}
                  disabled={isPaused}
                >
                  Share Screen
                </button>
              </div>
            )}

            {screenActive && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '8px'
                }}
              >
                <button 
                  type="button" 
                  className="btn-ghost" 
                  onClick={captureFrame} 
                  disabled={capturingFrame}
                  style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '12px', padding: '4px 10px' }}
                >
                  {capturingFrame ? 'Analyzing...' : 'Capture Keyframe'}
                </button>
                <button 
                  type="button" 
                  className="btn-ghost" 
                  onClick={stopScreenShare}
                  style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', fontSize: '12px', padding: '4px 10px' }}
                >
                  Stop Sharing
                </button>
              </div>
            )}
          </div>

          {/* Speech & Verbal Explanation Input */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center mb-12">
              <label className="form-label" style={{ marginBottom: 0 }}>Verbal Explanation & Context</label>
              <button 
                type="button" 
                className="mic-btn"
                onClick={toggleMic}
                disabled={isPaused}
                title={listening ? 'Stop Microphone' : 'Start Microphone'}
                aria-pressed={listening}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" x2="12" y1="19" y2="22"></line>
                </svg>
              </button>
            </div>

            <textarea 
              className="form-input w-full"
              rows="3"
              placeholder="Speak using the microphone or type explanation here to log what you are demonstrating..."
              value={lastSpokenText || transcript}
              onChange={e => setTranscript(e.target.value)}
              disabled={isPaused}
            />

            <div className="flex justify-between items-center mt-8">
              <span className="text-muted" style={{ fontSize: '12px' }}>
                {listening ? 'Listening: speak clearly about what you are demonstrating...' : 'Microphone idle.'}
              </span>
              <button 
                type="button" 
                className="btn-ghost" 
                style={{ fontSize: '12px' }}
                onClick={async () => {
                  const textToSave = (transcript || lastSpokenTextRef.current || lastSpokenText).trim();
                  if (textToSave) {
                    try {
                      await api.logWorkUpdateTranscript(roomId, token, { text: textToSave, category: 'Explanation' });
                      setTranscript('');
                      setLastSpokenText('');
                      lastSpokenTextRef.current = '';
                      loadRoomState();
                    } catch (err) {
                      setError(err.message || 'Failed to save statement.');
                    }
                  }
                }}
              >
                Save Statement
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Follow-ups, Avatar Observer & Session Timeline */}
        <div className="flex-col gap-20">
          {/* AI Observer Avatar */}
          <div 
            className="card flex items-center gap-16"
            style={{ padding: '16px', background: 'var(--surface-alt)' }}
          >
            <AvatarRenderer 
              avatarId="robot" 
              state={capturingFrame ? 'THINKING' : listening ? 'LISTENING' : 'IDLE'} 
              size={80} 
              showBadge={true} 
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Nexus-7 AI Reviewer</div>
              <p className="text-muted" style={{ fontSize: '12px', margin: '4px 0 0 0' }}>
                Observing screen context and statements. Formulates objective technical questions for clarification.
              </p>
            </div>
          </div>

          {/* AI Follow-Up Question Panel */}
          {activeQuestion && (
            <div 
              className="card" 
              style={{
                padding: '16px',
                border: '1px solid var(--accent)',
                background: 'var(--surface)'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Follow-Up Question
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
                {activeQuestion.question}
              </p>

              <textarea 
                className="form-input w-full"
                rows="2"
                placeholder="Demonstrate on screen or answer question here..."
                value={questionAnswer}
                onChange={e => setQuestionAnswer(e.target.value)}
                style={{ fontSize: '13px', marginBottom: '8px' }}
              />

              <div className="flex justify-end gap-8">
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={submitAnswer}
                  disabled={answering || !questionAnswer.trim()}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  {answering ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </div>
          )}

          {/* Live Session Timeline */}
          <div className="card flex-col flex-1" style={{ padding: '16px', maxHeight: '380px', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-12">
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Session Timeline</span>
              <span className="mono text-muted" style={{ fontSize: '11px' }}>
                {room.timelineEvents.length} events
              </span>
            </div>

            <div className="flex-col gap-10">
              {room.timelineEvents.length === 0 ? (
                <div className="text-muted" style={{ fontSize: '12px' }}>No timeline events yet.</div>
              ) : (
                room.timelineEvents.map((ev, idx) => (
                  <div key={idx} className="flex gap-10 items-start" style={{ fontSize: '12px' }}>
                    <span className="mono" style={{ color: 'var(--text-muted)', minWidth: '42px' }}>
                      {ev.formattedTime}
                    </span>
                    <span style={{ color: 'var(--text)' }}>
                      {ev.description}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
