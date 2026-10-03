import React, { useState, useEffect, useCallback } from 'react';
import InterviewSetup from './InterviewSetup.jsx';
import InterviewSession from './InterviewSession.jsx';
import CodingSession from './CodingSession.jsx';
import InterviewReport from './InterviewReport.jsx';
import { api } from '../services/api.js';
import { getActiveCodingSession, clearActiveCodingSession } from '../services/sessionStorage.js';

export default function InterviewContainer({ checkServerHealth, selectedModel }) {
  const [step, setStep] = useState('setup'); // 'setup' | 'active' | 'report'
  const [interviewType, setInterviewType] = useState('Mixed');
  const [avatarId, setAvatarId] = useState('human');
  const [interviewData, setInterviewData] = useState(null); // holds initial question or coding problem
  const [reportData, setReportData] = useState(null);

  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState(null);

  const attemptSessionRestore = useCallback(async () => {
    setRestoring(true);
    setRestoreError(null);

    try {
      const active = await getActiveCodingSession();
      if (!active || !active.interviewId) {
        setRestoring(false);
        return;
      }

      try {
        const state = await api.getCodingInterviewState(active.interviewId);

        if (state.status === 'COMPLETED') {
          await clearActiveCodingSession();
          if (state.codingReport) {
            setReportData({
              overallRating: state.codingReport.codingScore,
              categoryScores: {
                coding: state.codingReport.codingScore,
                problemSolving: state.codingReport.codingScore,
                technicalKnowledge: Math.min(10.0, Math.round((state.codingReport.codingScore + 0.5) * 10.0) / 10.0),
                clarity: 8.0
              },
              codingReport: state.codingReport
            });
            setStep('report');
          } else {
            setStep('setup');
          }
        } else {
          // Restore coding session with authoritative backend problem, deadline, and submission status
          setInterviewType('Coding');
          setInterviewData({
            ...state.problem,
            isExpiredInitially: Boolean(state.isExpired || state.status === 'EXPIRED'),
            isSubmittedInitially: Boolean(state.isSubmitted),
            lastSubmissionResult: state.lastSubmissionResult || null
          });
          setStep('active');
        }
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('not found') || msg.includes('404')) {
          // Stale local session, backend has discarded it
          await clearActiveCodingSession();
          setStep('setup');
        } else {
          // Server offline or connection timeout - do NOT wipe local session
          setRestoreError('Unable to connect to the interview server. Please ensure the backend is running.');
        }
      }
    } catch {
      // Storage read error
    } finally {
      setRestoring(false);
    }
  }, []);

  useEffect(() => {
    attemptSessionRestore();
  }, [attemptSessionRestore]);

  const handleStart = (initialData, type = 'Mixed', selectedAvatar = 'human') => {
    setInterviewData(initialData);
    setInterviewType(type);
    setAvatarId(selectedAvatar);
    setStep('active');
  };

  const handleFinish = async (report) => {
    await clearActiveCodingSession();
    setReportData(report);
    setStep('report');
  };

  const handleReset = async () => {
    await clearActiveCodingSession();
    setInterviewData(null);
    setReportData(null);
    setInterviewType('Mixed');
    setStep('setup');
  };

  const handleAbandonRestore = async () => {
    await clearActiveCodingSession();
    setRestoreError(null);
    setStep('setup');
  };

  if (restoring) {
    return (
      <div className="flex-col items-center justify-center flex-1" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="mono text-muted" style={{ fontSize: '15px' }}>Reconnecting to interview session...</div>
      </div>
    );
  }

  if (restoreError) {
    return (
      <div className="screen-container flex-col gap-24 items-center justify-center" style={{ minHeight: '300px', textAlign: 'center' }}>
        <h3 className="serif" style={{ fontSize: '22px' }}>Connection Issue</h3>
        <p className="text-muted" style={{ maxWidth: '420px', fontSize: '15px' }}>{restoreError}</p>
        <div className="flex gap-16">
          <button className="btn-primary" onClick={attemptSessionRestore}>
            Retry Connection
          </button>
          <button className="btn-ghost" onClick={handleAbandonRestore}>
            Start New Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ flex: 1, width: '100%' }}>
      {step === 'setup' && (
        <InterviewSetup 
          onStart={handleStart} 
          checkServerHealth={checkServerHealth} 
          selectedModel={selectedModel}
        />
      )}
      
      {step === 'active' && interviewData && (
        interviewType === 'Coding' ? (
          <CodingSession 
            initialData={interviewData} 
            avatarId={avatarId}
            onComplete={handleFinish} 
            checkServerHealth={checkServerHealth}
          />
        ) : (
          <InterviewSession 
            initialData={interviewData} 
            avatarId={avatarId}
            onComplete={handleFinish} 
            checkServerHealth={checkServerHealth}
          />
        )
      )}

      {step === 'report' && reportData && (
        <InterviewReport 
          report={reportData} 
          onNewInterview={handleReset} 
        />
      )}
    </div>
  );
}
