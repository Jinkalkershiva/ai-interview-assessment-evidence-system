import React, { useState } from 'react';

function Accordion({ title, badge, children }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button 
        className="flex justify-between items-center w-full"
        style={{ padding: '16px 0', fontSize: '15px', fontWeight: '500' }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="flex gap-12 items-center" style={{ textAlign: 'left' }}>
          <span>{title}</span>
          {badge}
        </div>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: '16px' }}>▼</span>
      </button>
      <div 
        style={{ 
          overflow: 'hidden', 
          maxHeight: open ? '1500px' : '0', 
          opacity: open ? 1 : 0, 
          transition: 'all 0.25s ease-out' 
        }}
      >
        <div style={{ paddingBottom: '16px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function InterviewReport({ report, onNewInterview }) {
  if (!report) return null;

  const cr = report.codingReport;

  const formatSecs = (secs) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="report-container flex-col gap-40">
      <div className="mb-24">
        <h1 className="serif" style={{ fontSize: '32px', marginBottom: '12px' }}>
          {cr ? 'Coding Interview Evaluation' : "Nice work. Here's how it went."}
        </h1>
        <p className="text-muted" style={{ fontSize: '17px', maxWidth: '600px' }}>
          {cr 
            ? 'Review your automated sandbox test results, algorithm efficiency, approach evaluation, and AI code review.'
            : 'You completed the interview. Review your performance breakdown and detailed feedback below.'}
        </p>
      </div>

      {/* OVERALL SCORE */}
      <div className="flex-col gap-16">
        <div className="text-muted" style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {cr ? 'Overall Coding Score' : 'Overall Score'}
        </div>
        <div className="mono" style={{ fontSize: '48px', lineHeight: '1', color: 'var(--text)' }}>
          {report.overallRating} <span className="text-muted" style={{ fontSize: '24px' }}>/ 10</span>
        </div>
      </div>

      {/* CODING STATS GRID (If Coding Report) */}
      {cr && (
        <div className="coding-stats-grid">
          <div className="stat-card">
            <div className="stat-label">Problems Completed</div>
            <div className="stat-value mono">{cr.problemsCompleted} / {cr.problemsAttempted}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Test Cases Passed</div>
            <div className="stat-value mono">{cr.passedTestCases} / {cr.totalTestCases}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Time Used</div>
            <div className="stat-value mono">{formatSecs(cr.totalTimeSpentSeconds)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Hints Used</div>
            <div className="stat-value mono">{cr.totalHintsUsed}</div>
          </div>
        </div>
      )}

      {/* SKILLS BREAKDOWN */}
      <div className="flex-col gap-16">
        <div className="text-muted" style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Skills</div>
        <div className="flex-col gap-12" style={{ maxWidth: '400px' }}>
          {Object.entries(report.categoryScores || {}).map(([key, score]) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-8">
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{score}/10</span>
              </div>
              <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface-alt)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, score * 10)}%`, height: '100%', backgroundColor: 'var(--accent)' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STRENGTHS AND WEAKNESSES */}
      <div className="flex gap-24" style={{ flexWrap: 'wrap' }}>
        <div className="flex-1" style={{ minWidth: '300px' }}>
          <div className="text-success" style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>What went well</div>
          <ul style={{ listStyleType: 'none', padding: 0 }} className="flex-col gap-12">
            {(report.strengths || []).map((s, i) => (
              <li key={i} className="flex gap-12 items-start">
                <span className="text-success" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ fontSize: '15px' }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1" style={{ minWidth: '300px' }}>
          <div className="text-warning" style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>What to work on</div>
          <ul style={{ listStyleType: 'none', padding: 0 }} className="flex-col gap-12">
            {(report.weaknesses || []).map((w, i) => (
              <li key={i} className="flex gap-12 items-start">
                <span className="text-warning" style={{ marginTop: '2px' }}>△</span>
                <span style={{ fontSize: '15px' }}>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CODING PROBLEM-BY-PROBLEM REVIEW */}
      {cr && cr.problemReports && cr.problemReports.length > 0 && (
        <div className="flex-col gap-16 mt-24">
          <div className="text-muted" style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Coding Problems Breakdown
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {cr.problemReports.map((pr, i) => (
              <Accordion 
                key={i} 
                title={`Problem ${pr.problemNumber}: ${pr.title}`}
                badge={
                  <span className={`badge ${pr.solved ? 'badge-easy' : 'badge-hard'}`}>
                    {pr.solved ? 'Solved' : `${pr.testsPassed}/${pr.totalTests} Tests`}
                  </span>
                }
              >
                <div className="flex-col gap-16" style={{ padding: '16px', backgroundColor: 'var(--surface-alt)', borderRadius: '8px' }}>
                  <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div className="mono text-muted" style={{ fontSize: '13px' }}>
                      Language: {pr.language} | Time Spent: {formatSecs(pr.timeSpentSeconds)} | Hints: {pr.hintsUsed}
                    </div>
                    <div className="mono" style={{ fontSize: '13px', fontWeight: '600' }}>
                      Complexity: Time {pr.timeComplexity} | Space {pr.spaceComplexity}
                    </div>
                  </div>

                  {pr.approach && (
                    <div>
                      <div className="text-muted" style={{ fontSize: '13px', marginBottom: '4px' }}>Stated Approach</div>
                      <div style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--text)' }}>
                        "{pr.approach}"
                      </div>
                    </div>
                  )}

                  {pr.review && (
                    <div className="flex-col gap-12" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      <div>
                        <div className="text-muted" style={{ fontSize: '13px', marginBottom: '4px' }}>AI Code Review</div>
                        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{pr.review.explanation}</div>
                      </div>

                      {pr.review.optimalApproach && (
                        <div>
                          <div className="text-accent" style={{ fontSize: '13px', marginBottom: '4px' }}>Optimal Approach</div>
                          <div style={{ fontSize: '14px' }}>{pr.review.optimalApproach}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Accordion>
            ))}
          </div>
        </div>
      )}

      {/* QUESTION REVIEW (FOR CONVERSATIONAL INTERVIEWS) */}
      {report.questionFeedback && report.questionFeedback.length > 0 && (
        <div className="flex-col gap-16 mt-24">
          <div className="text-muted" style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Question Review</div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {report.questionFeedback.map((qf, i) => (
              <Accordion key={i} title={`Q${qf.questionNumber}: ${qf.question}`}>
                <div className="flex-col gap-16" style={{ padding: '8px 16px', backgroundColor: 'var(--surface-alt)', borderRadius: '8px' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: '13px', marginBottom: '4px' }}>Your Answer</div>
                    <div style={{ fontSize: '15px', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>"{qf.answer}"</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '13px', marginBottom: '4px' }}>Feedback</div>
                    <div style={{ fontSize: '15px', color: 'var(--text)' }}>{qf.evaluation}</div>
                  </div>
                  <div>
                    <div className="text-accent" style={{ fontSize: '13px', marginBottom: '4px' }}>A stronger answer might say...</div>
                    <div style={{ fontSize: '15px', color: 'var(--text)', fontStyle: 'italic' }}>{qf.improvementAdvice}</div>
                  </div>
                </div>
              </Accordion>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-12 mt-24">
        <button className="btn-primary" onClick={onNewInterview}>Practice again</button>
      </div>
    </div>
  );
}
