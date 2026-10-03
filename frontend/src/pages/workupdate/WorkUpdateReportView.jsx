import React, { useState } from 'react';
import { api } from '../../services/api.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';

export default function WorkUpdateReportView({ roomData, token, onBack, onRefresh }) {
  const [room, setRoom] = useState(roomData);
  const [downloading, setDownloading] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [error, setError] = useState(null);

  // Reviewer edits
  const isReviewer = room.role === 'REVIEWER';
  const [comments, setComments] = useState(room.reviewerComments || room.report?.reviewerFeedback || '');
  const [status, setStatus] = useState(room.status || 'COMPLETED');
  const [actionItems, setActionItems] = useState(room.actionItems || room.report?.actionItems || []);
  const [newTaskText, setNewTaskText] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const report = room.report;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setError(null);
    try {
      await api.downloadWorkUpdatePdf(room.roomId || room.id, token);
    } catch (err) {
      setError(err.message || 'Failed to download PDF report');
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveReview = async () => {
    setSavingReview(true);
    setError(null);
    try {
      const updated = await api.updateWorkUpdateReview(room.roomId || room.id, token, {
        reviewerComments: comments,
        status,
        actionItems
      });
      setRoom(updated);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to save review changes');
    } finally {
      setSavingReview(false);
    }
  };

  const handleAddActionItem = () => {
    if (!newTaskText.trim()) return;
    const newItem = {
      id: 'ai-' + Date.now(),
      task: newTaskText.trim(),
      assignee: newAssignee.trim() || room.participantName,
      completed: false,
      createdTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setActionItems([...actionItems, newItem]);
    setNewTaskText('');
    setNewAssignee('');
  };

  const handleToggleActionItem = (itemId) => {
    setActionItems(actionItems.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  return (
    <div className="screen-container flex-col gap-32" style={{ maxWidth: '960px' }}>
      {/* Top Controls & Navigation */}
      <div className="flex justify-between items-center">
        <button type="button" className="btn-ghost" onClick={onBack} style={{ fontSize: '14px' }}>
          ← Back
        </button>
        <div className="flex gap-12 items-center">
          <span 
            style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '12px',
              fontWeight: 600,
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)'
            }}
          >
            {room.status}
          </span>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{ fontSize: '13px' }}
          >
            {downloading ? 'Preparing PDF...' : 'Download PDF Report'}
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      {/* Main Report Card */}
      <div 
        className="card flex-col gap-28" 
        style={{
          padding: '36px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px'
        }}
      >
        {/* Report Header */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Work Update Report
          </div>
          <h1 className="serif" style={{ fontSize: '30px', margin: '6px 0 12px 0' }}>
            {room.task}
          </h1>

          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              fontSize: '13px',
              marginTop: '16px',
              padding: '16px',
              background: 'var(--surface-alt)',
              borderRadius: '8px'
            }}
          >
            <div>
              <span className="text-muted">Participant: </span>
              <strong>{room.participantName}</strong>
            </div>
            <div>
              <span className="text-muted">Project: </span>
              <strong>{room.project}</strong>
            </div>
            <div>
              <span className="text-muted">Room ID: </span>
              <span className="mono">{room.roomId || room.id}</span>
            </div>
            <div>
              <span className="text-muted">Session Date: </span>
              <span>{report?.sessionDate || 'Recent'}</span>
            </div>
            <div>
              <span className="text-muted">Session Duration: </span>
              <span>{report?.sessionDuration || '15 min'}</span>
            </div>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY */}
        <div>
          <h3 className="section-title">Executive Summary</h3>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text)' }}>
            {report?.executiveSummary || 'No executive summary generated.'}
          </p>
        </div>

        {/* 2. WORK DEMONSTRATED */}
        <div>
          <h3 className="section-title">Work Demonstrated</h3>
          <ul className="bullet-list">
            {report?.workDemonstrated && report.workDemonstrated.length > 0 ? (
              report.workDemonstrated.map((item, i) => <li key={i}>{item}</li>)
            ) : (
              <li className="text-muted">No items demonstrated.</li>
            )}
          </ul>
        </div>

        {/* 3. PARTICIPANT STATEMENTS */}
        <div>
          <h3 className="section-title">Participant Statements</h3>
          <ul className="bullet-list">
            {report?.participantStatements && report.participantStatements.length > 0 ? (
              report.participantStatements.map((item, i) => <li key={i}>{item}</li>)
            ) : (
              <li className="text-muted">No specific claims recorded.</li>
            )}
          </ul>
        </div>

        {/* 4. SCREEN EVIDENCE */}
        <div>
          <h3 className="section-title">Screen Evidence</h3>
          <ul className="bullet-list mb-16">
            {report?.screenEvidence && report.screenEvidence.length > 0 ? (
              report.screenEvidence.map((item, i) => <li key={i}>{item}</li>)
            ) : (
              <li className="text-muted">No screen observations recorded.</li>
            )}
          </ul>

          {/* Captured Visual Keyframes Gallery */}
          {room.screenCaptures && room.screenCaptures.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                Captured Keyframes ({room.screenCaptures.length}):
              </div>
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px'
                }}
              >
                {room.screenCaptures.map((sc, i) => (
                  <div 
                    key={i} 
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: 'var(--surface-alt)'
                    }}
                  >
                    {sc.imageBase64 && (
                      <img 
                        src={sc.imageBase64} 
                        alt={sc.detectedCategory} 
                        style={{ width: '100%', height: '140px', objectFit: 'cover' }} 
                      />
                    )}
                    <div style={{ padding: '8px 10px', fontSize: '11px' }}>
                      <div className="flex justify-between text-muted mb-2">
                        <span className="mono">{sc.formattedTime}</span>
                        <span style={{ fontWeight: 600 }}>{sc.detectedCategory}</span>
                      </div>
                      <div style={{ color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sc.observations}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. TECHNICAL DETAILS */}
        <div>
          <h3 className="section-title">Technical Details Observed</h3>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {report?.technicalDetails && report.technicalDetails.length > 0 ? (
              report.technicalDetails.map((tech, i) => (
                <span 
                  key={i} 
                  style={{
                    fontSize: '12px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    fontWeight: 500
                  }}
                >
                  {tech}
                </span>
              ))
            ) : (
              <span className="text-muted" style={{ fontSize: '13px' }}>None classified.</span>
            )}
          </div>
        </div>

        {/* 6. ISSUES / BLOCKERS */}
        <div>
          <h3 className="section-title">Issues / Blockers</h3>
          <ul className="bullet-list">
            {report?.issuesAndBlockers && report.issuesAndBlockers.length > 0 ? (
              report.issuesAndBlockers.map((item, i) => <li key={i}>{item}</li>)
            ) : (
              <li className="text-muted">No blockers identified.</li>
            )}
          </ul>
        </div>

        {/* 7. PENDING WORK */}
        <div>
          <h3 className="section-title">Pending Work</h3>
          <ul className="bullet-list">
            {report?.pendingWork && report.pendingWork.length > 0 ? (
              report.pendingWork.map((item, i) => <li key={i}>{item}</li>)
            ) : (
              <li className="text-muted">No pending items noted.</li>
            )}
          </ul>
        </div>

        {/* 14. FOLLOW-UP QUESTIONS & 15. PARTICIPANT ANSWERS */}
        <div>
          <h3 className="section-title">Follow-Up Questions & Participant Answers</h3>
          {report?.followUpQuestions && report.followUpQuestions.length > 0 ? (
            <div className="flex-col gap-12">
              {report.followUpQuestions.map((q, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                    Q{i + 1}: {q}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <strong>Response:</strong> {report.participantAnswers && report.participantAnswers[i] ? report.participantAnswers[i] : 'No answer recorded.'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted" style={{ fontSize: '13px' }}>No follow-up questions recorded.</div>
          )}
        </div>

        {/* 16. AI OBSERVATIONS */}
        <div style={{ background: 'var(--surface-alt)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div className="flex justify-between items-center mb-8">
            <h3 className="section-title" style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 0 }}>
              AI Observations (AI-Generated Analysis)
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Subject to reviewer verification
            </span>
          </div>
          <ul className="bullet-list" style={{ color: 'var(--text-muted)' }}>
            {report?.aiObservations && report.aiObservations.length > 0 ? (
              report.aiObservations.map((item, i) => <li key={i}>{item}</li>)
            ) : (
              <li>Analysis complete.</li>
            )}
          </ul>
        </div>

        {/* 17. SESSION TIMELINE */}
        <div>
          <h3 className="section-title">Session Evidence Timeline</h3>
          {room.timelineEvents && room.timelineEvents.length > 0 ? (
            <div className="flex-col gap-8" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '8px' }}>
              {room.timelineEvents.map((ev, i) => (
                <div key={i} className="flex gap-12 items-start" style={{ fontSize: '13px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600, minWidth: '45px' }}>
                    {ev.formattedTime}
                  </span>
                  <span 
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border)',
                      fontWeight: 600,
                      minWidth: '90px',
                      textAlign: 'center'
                    }}
                  >
                    {ev.type}
                  </span>
                  <span style={{ color: 'var(--text)', flex: 1 }}>
                    {ev.description}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted" style={{ fontSize: '13px' }}>No timeline events recorded.</div>
          )}
        </div>

        {/* 10. REVIEWER FEEDBACK & ACTION ITEMS */}
        <div style={{ borderTop: '2px solid var(--border)', paddingTop: '24px' }}>
          <div className="flex justify-between items-center mb-16">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Reviewer Feedback & Action Items</h3>
            {isReviewer && (
              <span className="badge" style={{ fontSize: '11px', background: 'var(--accent)', color: '#fff' }}>
                Reviewer Mode
              </span>
            )}
          </div>

          {/* Feedback Notes */}
          <div className="mb-20">
            <label className="form-label">Reviewer Comments / Sign-off Notes</label>
            {isReviewer ? (
              <textarea 
                className="form-input w-full"
                rows="3"
                placeholder="Enter feedback for the participant, architectural guidance, or review remarks..."
                value={comments}
                onChange={e => setComments(e.target.value)}
              />
            ) : (
              <div 
                style={{
                  padding: '12px 16px',
                  background: 'var(--surface-alt)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  color: comments ? 'var(--text)' : 'var(--text-muted)'
                }}
              >
                {comments || 'No reviewer feedback has been provided yet.'}
              </div>
            )}
          </div>

          {/* Action Items List */}
          <div className="mb-24">
            <label className="form-label">Action Items</label>
            {actionItems.length === 0 ? (
              <div className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
                No action items assigned.
              </div>
            ) : (
              <div className="flex-col gap-8 mb-16">
                {actionItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex justify-between items-center"
                    style={{
                      padding: '8px 12px',
                      background: 'var(--surface-alt)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '13px'
                    }}
                  >
                    <label className="flex items-center gap-10" style={{ cursor: isReviewer ? 'pointer' : 'default', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        onChange={() => isReviewer && handleToggleActionItem(item.id)}
                        disabled={!isReviewer}
                      />
                      <span style={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text)' }}>
                        {item.task}
                      </span>
                    </label>
                    <span className="text-muted" style={{ fontSize: '12px' }}>
                      Assignee: {item.assignee}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add action item form (for Reviewer) */}
            {isReviewer && (
              <div className="flex gap-8 items-center">
                <input 
                  type="text"
                  className="form-input flex-1"
                  placeholder="New action item task..."
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Assignee (optional)"
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  style={{ width: '160px', fontSize: '13px' }}
                />
                <button 
                  type="button" 
                  className="btn-ghost" 
                  onClick={handleAddActionItem}
                  disabled={!newTaskText.trim()}
                  style={{ fontSize: '13px' }}
                >
                  Add Item
                </button>
              </div>
            )}
          </div>

          {/* Status & Save for Reviewer */}
          {isReviewer && (
            <div className="flex justify-between items-center pt-16" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-12">
                <label className="form-label" style={{ marginBottom: 0 }}>Review Status:</label>
                <select 
                  className="form-input" 
                  value={status} 
                  onChange={e => setStatus(e.target.value)}
                  style={{ width: '160px', fontSize: '13px' }}
                >
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="REVIEWED">REVIEWED</option>
                </select>
              </div>

              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleSaveReview}
                disabled={savingReview}
              >
                {savingReview ? 'Saving Review...' : 'Save Review & Action Items'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
