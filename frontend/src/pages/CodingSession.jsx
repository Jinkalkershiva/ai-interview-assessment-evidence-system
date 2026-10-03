import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { api } from '../services/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import AvatarRenderer from '../components/avatar/AvatarRenderer.jsx';
import { getAvatarById } from '../components/avatar/avatarRegistry.js';
import {
  saveActiveCodingSession,
  clearActiveCodingSession,
  saveCodingDraft,
  getCodingDraft,
  clearCodingDraft
} from '../services/sessionStorage.js';

export default function CodingSession({ initialData, avatarId = 'human', onComplete, checkServerHealth }) {
  // Problem state
  const [problem, setProblem] = useState(initialData);
  const [language, setLanguage] = useState('java');
  const [code, setCode] = useState('');
  const [approach, setApproach] = useState('');
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const avatar = getAvatarById(avatarId);

  // Editor theme
  const [editorTheme, setEditorTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs-light';
  });

  // Execution & Submission state
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(initialData.lastSubmissionResult || null);
  const [error, setError] = useState(null);
  const [isTimeExpired, setIsTimeExpired] = useState(Boolean(initialData.isExpiredInitially));
  const [submitted, setSubmitted] = useState(Boolean(initialData.isSubmittedInitially || initialData.lastSubmissionResult || initialData.isExpiredInitially));

  // Active tab in bottom pane: 'results' | 'approach' | 'review'
  const [activeTab, setActiveTab] = useState(initialData.lastSubmissionResult ? 'review' : 'approach');

  // Timer state calculated from targetEndTimeMs
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (initialData.isExpiredInitially) return 0;
    if (problem.targetEndTimeMs) {
      const remainingMs = problem.targetEndTimeMs - Date.now();
      return Math.max(0, Math.floor(remainingMs / 1000));
    }
    return (problem.timeLimitMinutes || 20) * 60;
  });

  const startTimeRef = useRef(Date.now());
  const submittedRef = useRef(Boolean(initialData.isSubmittedInitially || initialData.lastSubmissionResult || initialData.isExpiredInitially));

  // Voice announcement helper
  const speakText = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Sync theme changes with Monaco
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setEditorTheme(isDark ? 'vs-dark' : 'vs-light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Handle initial expiration or submission state
  useEffect(() => {
    if (problem.isExpiredInitially) {
      setIsTimeExpired(true);
      setSubmitted(true);
      submittedRef.current = true;
      setError('Time expired. Your coding submission was closed.');
    } else if (problem.lastSubmissionResult) {
      setSubmissionResult(problem.lastSubmissionResult);
      setSubmitted(true);
      submittedRef.current = true;
      setActiveTab('review');
    }
  }, [problem.isExpiredInitially, problem.lastSubmissionResult]);

  // Restore draft code, approach, and language from storage
  useEffect(() => {
    let isMounted = true;
    async function loadSavedDraft() {
      const draft = await getCodingDraft(problem.interviewId, problem.id);
      if (!isMounted) return;
      if (draft && draft.code) {
        setCode(draft.code);
        if (draft.approach) setApproach(draft.approach);
        if (draft.language) setLanguage(draft.language);
      } else if (problem.starterCode && problem.starterCode[language]) {
        setCode(problem.starterCode[language]);
      } else {
        setCode('// Write your solution here');
      }
    }
    loadSavedDraft();
    return () => { isMounted = false; };
  }, [problem.interviewId, problem.id, language, problem.starterCode]);

  // Persist active coding session marker to storage
  useEffect(() => {
    if (problem.interviewId && !submitted) {
      saveActiveCodingSession({
        interviewId: problem.interviewId,
        problemId: problem.id,
        language,
        hintsRevealed
      });
    }
  }, [problem.interviewId, problem.id, language, hintsRevealed, submitted]);

  // Debounced auto-save of draft code and approach to storage
  useEffect(() => {
    if (!problem.id || submitted) return;
    const timer = setTimeout(() => {
      saveCodingDraft(problem.interviewId, problem.id, { code, approach, language });
    }, 300);
    return () => clearTimeout(timer);
  }, [code, approach, language, problem.interviewId, problem.id, submitted]);

  // Voice announcement on initial problem load
  useEffect(() => {
    if (problem && problem.title && !isTimeExpired && !submitted) {
      speakText(`Here is your coding challenge: ${problem.title}. You have ${problem.timeLimitMinutes || 20} minutes.`);
    }
  }, [problem.id, problem.title, isTimeExpired, submitted, speakText]);

  // Submit Solution handler (can be called manually or by timer expiry)
  const handleSubmit = useCallback(async (isAuto = false) => {
    if (submittedRef.current) return; // Prevent duplicate submissions
    submittedRef.current = true;
    setSubmitted(true);
    setIsSubmitting(true);
    setError(null);

    if (isAuto) {
      setIsTimeExpired(true);
      speakText('Your time has expired. Your solution has been submitted automatically.');
    }

    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));

    try {
      if (checkServerHealth) await checkServerHealth();

      const payload = {
        problemId: problem.id,
        language,
        sourceCode: code,
        approach,
        hintsUsedCount: hintsRevealed,
        timeSpentSeconds: elapsedSeconds,
        autoSubmitted: isAuto,
      };

      const result = await api.submitCodingSolution(problem.interviewId, payload);
      setSubmissionResult(result);
      setActiveTab('review');

      // Clear draft for completed problem
      await clearCodingDraft(problem.interviewId, problem.id);

      if (result.interviewCompleted) {
        await clearActiveCodingSession();
      }

    } catch (err) {
      const msg = err.message || 'Submission failed.';
      if (msg.toLowerCase().includes('expired')) {
        setIsTimeExpired(true);
        setSubmitted(true);
        submittedRef.current = true;
        setError('Time expired. Your coding submission was closed.');
      } else {
        setError(msg);
        submittedRef.current = false;
        setSubmitted(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [problem.id, problem.interviewId, language, code, approach, hintsRevealed, checkServerHealth, speakText]);

  // Timer effect based on authoritative target end timestamp
  useEffect(() => {
    if (submitted || isTimeExpired) return;

    const interval = setInterval(() => {
      if (!problem.targetEndTimeMs) return;

      const remainingMs = problem.targetEndTimeMs - Date.now();
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeRemaining(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        if (!submittedRef.current) {
          handleSubmit(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [problem.targetEndTimeMs, submitted, isTimeExpired, handleSubmit]);

  // Run Code against visible test cases
  const handleRunCode = async () => {
    if (isRunning || isSubmitting) return;
    setIsRunning(true);
    setError(null);
    setRunResult(null);
    setActiveTab('results');

    try {
      if (checkServerHealth) await checkServerHealth();

      const result = await api.runCodingCode(problem.interviewId, {
        language,
        sourceCode: code,
        problemId: problem.id,
      });
      setRunResult(result);
    } catch (err) {
      setError(err.message || 'Failed to run code.');
    } finally {
      setIsRunning(false);
    }
  };

  // Next problem or final evaluation
  const handleProceedToNext = async () => {
    if (submissionResult && submissionResult.nextProblem) {
      const next = submissionResult.nextProblem;
      await clearCodingDraft(problem.interviewId, problem.id);
      await saveActiveCodingSession({
        interviewId: next.interviewId,
        problemId: next.id,
        language,
        hintsRevealed: 0
      });

      setProblem(next);
      setRunResult(null);
      setSubmissionResult(null);
      setSubmitted(false);
      submittedRef.current = false;
      setIsTimeExpired(false);
      setApproach('');
      setHintsRevealed(0);
      startTimeRef.current = Date.now();
      setActiveTab('approach');
    }
  };

  const handleFinishInterview = async () => {
    try {
      await clearActiveCodingSession();
      await clearCodingDraft(problem.interviewId, problem.id);
      const report = await api.evaluateInterview(problem.interviewId);
      onComplete(report);
    } catch (err) {
      setError(err.message || 'Failed to generate final report.');
    }
  };

  // Format time (mm:ss)
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 120 && timeRemaining > 0;

  return (
    <div className="coding-workspace flex-col">
      {/* HEADER / TIMER BAR */}
      <div className="coding-header flex justify-between items-center">
        <div className="flex gap-16 items-center">
          <span className="mono" style={{ fontWeight: '600', fontSize: '15px' }}>
            Problem {problem.problemNumber} of {problem.totalProblems}
          </span>
          <span className={`badge badge-${(problem.difficulty || 'medium').toLowerCase()}`}>
            {problem.difficulty}
          </span>
          {problem.topics && problem.topics.length > 0 && (
            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
              {problem.topics.slice(0, 3).map((topic, i) => (
                <span key={i} className="topic-tag">{topic}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-16 items-center">
          {/* Timer Display */}
          <div className={`countdown-timer mono ${isLowTime ? 'timer-low' : ''} ${isTimeExpired ? 'timer-expired' : ''}`}>
            <span className="timer-icon">⏱</span>
            <span>{isTimeExpired ? '00:00' : formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {isTimeExpired && (
        <div className="notification-banner warning-banner">
          Time expired. Your coding submission was closed.
        </div>
      )}

      {error && (
        <div style={{ padding: '0 24px', marginTop: '12px' }}>
          <ErrorMessage message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {/* MAIN TWO-COLUMN SPLIT */}
      <div className="coding-main-grid">
        {/* LEFT COLUMN: PROBLEM STATEMENT & HINTS */}
        <div className="problem-panel flex-col gap-24">
          {/* AI INTERVIEWER CARD */}
          {avatarId !== 'none' && (
            <div className="coding-interviewer-card flex items-center gap-16">
              <div style={{ flexShrink: 0 }}>
                <AvatarRenderer 
                  avatarId={avatarId} 
                  state={submitted ? 'SUCCESS' : isRunning ? 'THINKING' : isSpeaking ? 'SPEAKING' : 'IDLE'} 
                  size={88}
                  showBadge={false}
                />
              </div>
              <div className="flex-col gap-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="interviewer-card-name" style={{ fontWeight: '600', fontSize: '15px' }}>
                    {avatar.name}
                  </span>
                  <button 
                    type="button" 
                    className="btn-ghost" 
                    style={{ fontSize: '12px', padding: '2px 8px' }}
                    onClick={() => {
                      setIsSpeaking(true);
                      speakText(`${problem.title}. ${problem.description}`);
                      setTimeout(() => setIsSpeaking(false), 5000);
                    }}
                    title="Read problem aloud"
                  >
                    🔊 Read Problem
                  </button>
                </div>
                <span className="text-muted" style={{ fontSize: '12px' }}>{avatar.title}</span>
                <span className="coding-interviewer-status" style={{ fontSize: '12px', fontWeight: '500', color: isRunning ? 'var(--warning)' : submitted ? 'var(--success)' : 'var(--accent)' }}>
                  {submitted ? '✓ Solution evaluated' : isRunning ? '⚡ Running sandbox tests...' : '● Waiting for your solution'}
                </span>
              </div>
            </div>
          )}

          <div>
            <h1 className="serif" style={{ fontSize: '26px', marginBottom: '8px' }}>
              {problem.title}
            </h1>
            {problem.expectedComplexity && (
              <div className="text-muted mono" style={{ fontSize: '12px', marginTop: '4px' }}>
                Expected: Time {problem.expectedComplexity.time || 'O(N)'} | Space {problem.expectedComplexity.space || 'O(1)'}
              </div>
            )}
          </div>

          <div className="problem-description" style={{ fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {problem.description}
          </div>

          {/* EXAMPLES */}
          {problem.examples && problem.examples.length > 0 && (
            <div className="flex-col gap-12">
              <div className="section-title">Examples</div>
              {problem.examples.map((ex, idx) => (
                <div key={idx} className="example-box flex-col gap-8">
                  <div className="text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>
                    Example {idx + 1}
                  </div>
                  <div>
                    <span className="mono text-muted" style={{ fontSize: '13px' }}>Input: </span>
                    <code className="mono code-snippet">{ex.input}</code>
                  </div>
                  <div>
                    <span className="mono text-muted" style={{ fontSize: '13px' }}>Output: </span>
                    <code className="mono code-snippet">{ex.output}</code>
                  </div>
                  {ex.explanation && (
                    <div className="text-muted" style={{ fontSize: '13px', fontStyle: 'italic' }}>
                      Explanation: {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CONSTRAINTS */}
          {problem.constraints && problem.constraints.length > 0 && (
            <div className="flex-col gap-8">
              <div className="section-title">Constraints</div>
              <ul className="constraints-list">
                {problem.constraints.map((c, idx) => (
                  <li key={idx} className="mono" style={{ fontSize: '13px' }}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* HINTS SYSTEM */}
          {problem.hints && problem.hints.length > 0 && (
            <div className="flex-col gap-12" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div className="flex justify-between items-center">
                <div className="section-title">Hints ({hintsRevealed}/{problem.hints.length})</div>
                {hintsRevealed < problem.hints.length && (
                  <button 
                    type="button" 
                    className="btn-ghost" 
                    style={{ fontSize: '13px', padding: '4px 10px' }}
                    onClick={() => setHintsRevealed(prev => prev + 1)}
                  >
                    Reveal Hint {hintsRevealed + 1}
                  </button>
                )}
              </div>
              {hintsRevealed > 0 && (
                <div className="flex-col gap-8">
                  {problem.hints.slice(0, hintsRevealed).map((hint, idx) => (
                    <div key={idx} className="hint-card">
                      <span className="hint-label mono">Hint {idx + 1}:</span>
                      <span style={{ fontSize: '14px' }}> {hint}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: APPROACH + MONACO EDITOR + RUN/SUBMIT + RESULTS */}
        <div className="editor-panel flex-col">
          {/* EDITOR CONTROLS TOOLBAR */}
          <div className="editor-toolbar flex justify-between items-center">
            <div className="flex gap-12 items-center">
              <label htmlFor="language-select" className="text-muted" style={{ fontSize: '13px', fontWeight: '500' }}>
                Language:
              </label>
              <select 
                id="language-select"
                className="select-dropdown mono" 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                disabled={submitted}
              >
                <option value="java">Java (OpenJDK 21)</option>
                <option value="python">Python 3 (3.12)</option>
                <option value="javascript">JavaScript (Node 20)</option>
              </select>
            </div>

            <div className="flex gap-8 items-center">
              <button 
                type="button" 
                className="btn-ghost" 
                style={{ fontSize: '13px', padding: '6px 12px' }}
                onClick={() => {
                  if (problem.starterCode && problem.starterCode[language]) {
                    setCode(problem.starterCode[language]);
                  }
                }}
                disabled={submitted}
                title="Reset code to original starter template"
              >
                Reset template
              </button>
            </div>
          </div>

          {/* MONACO CODE EDITOR */}
          <div className="monaco-wrapper">
            <Editor
              height="380px"
              language={language === 'java' ? 'java' : language === 'python' ? 'python' : 'javascript'}
              value={code}
              onChange={(val) => setCode(val || '')}
              theme={editorTheme}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                lineNumbers: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: submitted || isTimeExpired,
                tabSize: 4,
                wordWrap: 'on',
              }}
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="editor-actions flex justify-between items-center">
            <div className="flex gap-12">
              <button 
                type="button" 
                className="tab-btn" 
                data-active={activeTab === 'approach'}
                onClick={() => setActiveTab('approach')}
              >
                Your Approach
              </button>
              <button 
                type="button" 
                className="tab-btn" 
                data-active={activeTab === 'results'}
                onClick={() => setActiveTab('results')}
              >
                Test Results {runResult && `(${runResult.passedCount}/${runResult.totalCount})`}
              </button>
              {submissionResult && (
                <button 
                  type="button" 
                  className="tab-btn text-accent" 
                  data-active={activeTab === 'review'}
                  onClick={() => setActiveTab('review')}
                >
                  AI Review
                </button>
              )}
            </div>

            <div className="flex gap-12 items-center">
              <button 
                type="button" 
                className="btn-ghost" 
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting || submitted}
              >
                {isRunning ? 'Running tests...' : 'Run Code'}
              </button>

              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || submitted}
              >
                {isSubmitting ? 'Evaluating solution...' : 'Submit Solution'}
              </button>
            </div>
          </div>

          {/* BOTTOM TABS PANEL */}
          <div className="bottom-pane flex-col">
            {/* TAB: APPROACH EXPLANATION */}
            {activeTab === 'approach' && (
              <div className="flex-col gap-8">
                <label className="text-muted" style={{ fontSize: '13px', fontWeight: '500' }}>
                  Explain your approach before writing code (Optional):
                </label>
                <textarea
                  className="form-input mono"
                  rows={3}
                  style={{ width: '100%', fontSize: '14px', resize: 'vertical' }}
                  placeholder="Outline your algorithm, data structures, and reasoning here (e.g. 'Use a HashMap to store complements for O(N) lookup')..."
                  value={approach}
                  onChange={(e) => setApproach(e.target.value)}
                  disabled={submitted}
                />
              </div>
            )}

            {/* TAB: TEST EXECUTION RESULTS */}
            {activeTab === 'results' && (
              <div className="flex-col gap-12">
                {!runResult && !isRunning && (
                  <div className="text-muted" style={{ fontSize: '14px', padding: '16px 0' }}>
                    Click "Run Code" to execute your solution against visible test cases.
                  </div>
                )}

                {isRunning && (
                  <div className="text-muted" style={{ fontSize: '14px', padding: '16px 0' }}>
                    Compiling and executing in isolated sandbox...
                  </div>
                )}

                {runResult && (
                  <div className="flex-col gap-12">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-12 items-center">
                        <span className={`status-badge ${runResult.allPassed ? 'status-pass' : 'status-fail'}`}>
                          {runResult.status}
                        </span>
                        <span className="mono" style={{ fontSize: '14px' }}>
                          Passed: {runResult.passedCount} / {runResult.totalCount} tests
                        </span>
                      </div>
                    </div>

                    {/* Compile Error Banner */}
                    {runResult.compileError && (
                      <div className="error-console">
                        <div className="error-console-title mono">Compilation Error:</div>
                        <pre className="error-pre mono">{runResult.compileError}</pre>
                      </div>
                    )}

                    {/* Runtime Error Banner */}
                    {runResult.runtimeError && (
                      <div className="error-console">
                        <div className="error-console-title mono">Runtime Error:</div>
                        <pre className="error-pre mono">{runResult.runtimeError}</pre>
                      </div>
                    )}

                    {/* Test Case Breakdown */}
                    {runResult.tests && runResult.tests.length > 0 && (
                      <div className="flex-col gap-8">
                        {runResult.tests.map((t, idx) => (
                          <div key={idx} className={`test-result-row ${t.passed ? 'row-pass' : 'row-fail'}`}>
                            <div className="flex justify-between items-center">
                              <span className="mono" style={{ fontWeight: '600', fontSize: '13px' }}>
                                Test Case {t.testIndex}: {t.passed ? 'PASSED' : 'FAILED'}
                              </span>
                              <span className="mono text-muted" style={{ fontSize: '12px' }}>
                                {t.executionTime || ''}
                              </span>
                            </div>
                            <div className="test-detail-grid mono" style={{ fontSize: '12px', marginTop: '6px' }}>
                              <div><span className="text-muted">Input: </span>{t.input}</div>
                              <div><span className="text-muted">Expected: </span>{t.expectedOutput}</div>
                              <div><span className="text-muted">Actual: </span>{t.actualOutput || (t.errorMessage ? t.errorMessage : '<empty>')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SUBMISSION REVIEW */}
            {activeTab === 'review' && submissionResult && (
              <div className="flex-col gap-16">
                <div className="submission-summary flex justify-between items-center">
                  <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>
                      Solution Evaluated
                    </h3>
                    <div className="text-muted mono" style={{ fontSize: '13px' }}>
                      Visible: {submissionResult.visibleTestsPassed}/{submissionResult.visibleTestsTotal} passed | 
                      Hidden: {submissionResult.hiddenTestsPassed}/{submissionResult.hiddenTestsTotal} passed
                    </div>
                  </div>

                  {/* Next Step Button */}
                  <div>
                    {!submissionResult.isLastProblem && submissionResult.nextProblem ? (
                      <button className="btn-primary" onClick={handleProceedToNext}>
                        Proceed to Problem 2 ➔
                      </button>
                    ) : (
                      <button className="btn-primary" onClick={handleFinishInterview}>
                        View Final Report ➔
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Review Card */}
                {submissionResult.review && (
                  <div className="ai-review-card flex-col gap-12">
                    <div className="flex justify-between items-center">
                      <div className="mono" style={{ fontSize: '20px', fontWeight: '700' }}>
                        Coding Score: {submissionResult.review.overallScore} / 10
                      </div>
                      <div className="mono text-muted" style={{ fontSize: '13px' }}>
                        Complexity: Time {submissionResult.review.timeComplexity} | Space {submissionResult.review.spaceComplexity}
                      </div>
                    </div>

                    <p style={{ fontSize: '14px', lineHeight: '1.5' }}>
                      {submissionResult.review.explanation}
                    </p>

                    {submissionResult.review.strengths && submissionResult.review.strengths.length > 0 && (
                      <div>
                        <div className="text-success" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Strengths
                        </div>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', fontSize: '13px' }}>
                          {submissionResult.review.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {submissionResult.review.improvements && submissionResult.review.improvements.length > 0 && (
                      <div>
                        <div className="text-warning" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Suggestions for Improvement
                        </div>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', fontSize: '13px' }}>
                          {submissionResult.review.improvements.map((imp, i) => (
                            <li key={i}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {submissionResult.review.optimalApproach && (
                      <div className="optimal-approach-box">
                        <div className="text-accent" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Optimal Approach
                        </div>
                        <div style={{ fontSize: '13px', fontStyle: 'italic' }}>
                          {submissionResult.review.optimalApproach}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
