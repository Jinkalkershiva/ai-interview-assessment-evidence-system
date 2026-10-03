import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import AvatarStage from '../components/avatar/AvatarStage.jsx';
import InterviewQuestionCard from '../components/interview/InterviewQuestionCard.jsx';
import TranscriptPanel from '../components/interview/TranscriptPanel.jsx';
import InterviewProgress from '../components/interview/InterviewProgress.jsx';
import InterviewControls from '../components/interview/InterviewControls.jsx';
import { getAvatarById } from '../components/avatar/avatarRegistry.js';

export default function InterviewSession({ initialData, avatarId = 'human', onComplete, checkServerHealth }) {
  const [data, setData] = useState(initialData);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showTextInput, setShowTextInput] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  // Elapsed interview timer
  const [elapsedSecs, setElapsedSecs] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSecs(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Conversation transcript turns
  const [transcript, setTranscript] = useState(() => {
    if (initialData?.question) {
      return [{ role: 'ai', text: initialData.question, time: 'Question 1' }];
    }
    return [];
  });

  const avatar = getAvatarById(avatarId);

  // Stop TTS/mic on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (initialData?.question) {
      speak(initialData.question);
    }
  }, []);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    if (avatar?.voiceConfig) {
      utterance.pitch = avatar.voiceConfig.pitch;
      utterance.rate = avatar.voiceConfig.rate;
    }
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      setIsPaused(!isPaused);
    }
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition is not supported in this browser. Please type your answer.");
      return;
    }

    if (listening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    window.speechSynthesis.cancel();
    const recog = new SR();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;
    
    const baseText = answer ? answer + " " : "";

    recog.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      setAnswer(baseText + t);
    };

    recog.onstart = () => {
      setListening(true);
      setError(null);
    };

    recog.onend = () => {
      setListening(false);
    };

    recog.onerror = (e) => {
      setListening(false);
      setError("Mic error: " + e.error);
    };

    recognitionRef.current = recog;
    recog.start();
  };

  const handleEndEarly = async () => {
    if (listening && recognitionRef.current) recognitionRef.current.stop();
    setLoading(true);
    setError(null);
    window.speechSynthesis.cancel();
    setShowEndDialog(false);
    
    if (checkServerHealth) await checkServerHealth();
    try {
      const evalRes = await api.evaluateInterview(data.interviewId);
      onComplete(evalRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return setError('Please provide an answer before moving forward.');
    if (listening && recognitionRef.current) recognitionRef.current.stop();
    setLoading(true);
    setError(null);
    window.speechSynthesis.cancel();
    
    if (checkServerHealth) await checkServerHealth();

    const submittedAnswer = answer;

    // Record candidate response in transcript
    setTranscript(prev => [
      ...prev,
      { role: 'user', text: submittedAnswer, time: `Answer ${data.questionNumber}` }
    ]);

    try {
      if (data.questionNumber === data.totalQuestions) {
        await api.submitInterviewAnswer(data.interviewId, submittedAnswer);
        const evalRes = await api.evaluateInterview(data.interviewId);
        onComplete(evalRes);
      } else {
        const res = await api.submitInterviewAnswer(data.interviewId, submittedAnswer);
        setAnswer('');
        setData(res);

        // Record next AI question in transcript
        setTranscript(prev => [
          ...prev,
          { role: 'ai', text: res.question, time: `Question ${res.questionNumber}` }
        ]);

        speak(res.question);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isFinal = data.questionNumber === data.totalQuestions;

  let avatarState = 'IDLE';
  if (isSpeaking) {
    avatarState = 'SPEAKING';
  } else if (listening) {
    avatarState = 'LISTENING';
  } else if (loading) {
    avatarState = 'THINKING';
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="interview-workspace-container flex-col">
      {/* MODAL: End Confirmation */}
      {showEndDialog && (
        <div className="modal-backdrop">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="end-interview-title">
            <h3 id="end-interview-title" style={{ fontSize: '20px', marginBottom: '8px' }}>
              End this interview?
            </h3>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
              You will finish early and can still review the answers you've completed with full AI evaluation.
            </p>
            <div className="flex gap-12 justify-between">
              <button className="btn-ghost" onClick={() => setShowEndDialog(false)}>
                Continue Interview
              </button>
              <button className="btn-danger" onClick={handleEndEarly}>
                End & Evaluate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className="interview-top-bar flex justify-between items-center">
        <div className="flex items-center gap-12">
          <div className="live-status-badge flex items-center gap-6">
            <span className="live-pulsing-dot" />
            <span className="live-status-text">LIVE INTERVIEW</span>
          </div>
          <span className="header-divider-dot" aria-hidden="true" />
          <span className="interview-role-pill">
            {data.role || 'Technical Interview'}
          </span>
        </div>

        <div className="flex items-center gap-16">
          <div className="interview-timer-badge flex items-center gap-6 mono" title="Session duration">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>{formatTimer(elapsedSecs)}</span>
          </div>

          <button 
            type="button"
            className="end-session-btn flex items-center gap-6"
            onClick={() => setShowEndDialog(true)}
            title="End interview early"
          >
            <span>End Session</span>
          </button>
        </div>
      </header>

      {/* MAIN 2-COLUMN DESKTOP WORKSPACE */}
      <div className="interview-main-layout">
        {/* LEFT COLUMN: Large AI Avatar & Coach Card with Roadmap Progress */}
        <aside className="interview-avatar-column">
          <div className="avatar-stage-card flex-col items-center">
            <AvatarStage
              avatarId={avatarId}
              state={avatarState}
              size={220}
              showWaveform={true}
            />

            <div className="avatar-progress-divider" />

            <InterviewProgress 
              currentQuestion={data.questionNumber} 
              totalQuestions={data.totalQuestions}
              interviewType={data.type || 'Mixed'}
            />
          </div>
        </aside>

        {/* RIGHT COLUMN: Question, Answer, Controls & Localized Transcript */}
        <main className="interview-workspace-column flex-col">
          {/* PROMINENT CURRENT QUESTION CARD */}
          <div className="stage-question-wrapper w-full">
            <InterviewQuestionCard
              category={data.category || data.type || 'Technical'}
              questionNumber={data.questionNumber}
              totalQuestions={data.totalQuestions}
              difficulty={data.difficulty || 'Intermediate'}
              question={data.question}
              isSpeaking={isSpeaking}
              onRepeatQuestion={() => speak(data.question)}
            />
          </div>

          {/* EDITABLE ANSWER BOX (Optional / Toggleable) */}
          {showTextInput && (
            <div className="stage-answer-box w-full mt-10 flex-col gap-6">
              <div className="flex justify-between items-center">
                <label htmlFor="interview-answer" className="answer-box-label flex items-center gap-6">
                  <span>Your Answer</span>
                  {listening && (
                    <span className="listening-badge flex items-center gap-6">
                      <span className="listening-pulse-dot" />
                      <span>Dictating live</span>
                    </span>
                  )}
                </label>
                <span className="text-muted answer-box-hint">
                  Press <kbd className="kbd-shortcut">Ctrl</kbd> + <kbd className="kbd-shortcut">Enter</kbd> to submit
                </span>
              </div>
              <textarea
                id="interview-answer"
                className="form-input answer-textarea"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? "Listening... your spoken words will appear here in real-time." : "Speak with the microphone below or type your answer here..."}
                disabled={loading}
                rows={3}
              />
            </div>
          )}

          {error && (
            <div className="w-full mt-8">
              <ErrorMessage message={error} onRetry={() => setError(null)} />
            </div>
          )}

          {/* DEDICATED CONTROL BAR */}
          <div className="stage-controls-wrapper w-full mt-10">
            <InterviewControls
              isListening={listening}
              isSpeaking={isSpeaking}
              isLoading={loading}
              hasAnswer={answer.trim().length > 0}
              isFinalQuestion={isFinal}
              isPaused={isPaused}
              onToggleMic={toggleMic}
              onTogglePause={togglePause}
              onRepeatQuestion={() => speak(data.question)}
              onSubmitAnswer={handleSubmit}
              onToggleTextInput={() => setShowTextInput(!showTextInput)}
              showTextInput={showTextInput}
            />
          </div>

          {/* SECONDARY LOCALIZED HISTORY / TRANSCRIPT */}
          <div className="stage-history-wrapper w-full mt-10">
            <TranscriptPanel 
              history={transcript}
              currentQuestion={data.question}
              currentAnswer={answer}
              isListening={listening}
              aiName={avatar.name}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
