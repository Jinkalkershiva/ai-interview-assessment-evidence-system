import React, { useState } from 'react';
import { api } from '../../services/api.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';

export default function WorkUpdateCreate({ onRoomCreated, onGoToDashboard }) {
  const [project, setProject] = useState('');
  const [task, setTask] = useState('');
  const [description, setDescription] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('15');
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdRoomData, setCreatedRoomData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project.trim()) return setError('Please enter a project name.');
    if (!task.trim()) return setError('Please enter a task summary.');
    if (!participantName.trim()) return setError('Please enter participant name.');

    setLoading(true);
    setError(null);

    try {
      const res = await api.createWorkUpdateRoom({
        project: project.trim(),
        task: task.trim(),
        description: description.trim(),
        expectedDurationMinutes: parseInt(expectedDuration) || 15,
        participantName: participantName.trim(),
        participantEmail: participantEmail.trim()
      });

      setCreatedRoomData(res);
    } catch (err) {
      setError(err.message || 'Failed to create work update room');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (createdRoomData) {
    return (
      <div className="screen-container flex-col gap-24">
        <div className="card" style={{ padding: '28px', border: '1px solid var(--accent)' }}>
          <div className="flex justify-between items-start mb-16">
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Room Created Successfully
              </div>
              <h2 className="serif" style={{ fontSize: '26px', marginTop: '4px' }}>
                {createdRoomData.roomId}
              </h2>
            </div>
            <span 
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'var(--surface-alt)',
                border: '1px solid var(--border)',
                fontWeight: 600
              }}
            >
              {createdRoomData.status}
            </span>
          </div>

          <p className="text-muted" style={{ fontSize: '14px', marginBottom: '20px' }}>
            Work update session initialized for <strong>{createdRoomData.participantName}</strong> on task: <em>{createdRoomData.task}</em> ({createdRoomData.project}).
          </p>

          <div className="flex-col gap-16 mb-24">
            <div style={{ padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center mb-6">
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Participant Access Token</span>
                <button 
                  type="button" 
                  className="btn-ghost" 
                  style={{ fontSize: '12px', padding: '2px 8px' }}
                  onClick={() => copyToClipboard(createdRoomData.participantToken, 'ptoken')}
                >
                  {copiedField === 'ptoken' ? 'Copied' : 'Copy Token'}
                </button>
              </div>
              <code className="mono" style={{ fontSize: '13px', color: 'var(--accent)', wordBreak: 'break-all' }}>
                {createdRoomData.participantToken}
              </code>
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--surface-alt)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center mb-6">
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Reviewer Access Token (For Senior/Manager)</span>
                <button 
                  type="button" 
                  className="btn-ghost" 
                  style={{ fontSize: '12px', padding: '2px 8px' }}
                  onClick={() => copyToClipboard(createdRoomData.reviewerToken, 'rtoken')}
                >
                  {copiedField === 'rtoken' ? 'Copied' : 'Copy Token'}
                </button>
              </div>
              <code className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                {createdRoomData.reviewerToken}
              </code>
            </div>
          </div>

          <div className="flex gap-16">
            <button 
              className="btn-primary" 
              style={{ flex: 1, padding: '12px' }}
              onClick={() => onRoomCreated(createdRoomData.roomId, createdRoomData.participantToken)}
            >
              Enter Session as Participant
            </button>
            <button 
              className="btn-ghost" 
              style={{ padding: '12px 20px' }}
              onClick={onGoToDashboard}
            >
              Reviewer Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container flex-col">
      <div className="mb-32">
        <h1 className="serif" style={{ fontSize: '30px', marginBottom: '6px' }}>Create Work Update</h1>
        <p className="text-muted" style={{ fontSize: '15px' }}>
          Demonstrate and articulate your technical progress with screen sharing and speech. AI compiles an evidence-based report for reviewer sign-off.
        </p>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="flex-col gap-24">
        <div className="row">
          <div>
            <label className="form-label" htmlFor="wu-project">Project *</label>
            <input 
              id="wu-project"
              type="text"
              className="form-input w-full"
              placeholder="e.g. Payment Gateway Service"
              value={project}
              onChange={e => setProject(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="wu-duration">Expected Duration (minutes)</label>
            <input 
              id="wu-duration"
              type="number"
              min="5"
              max="60"
              className="form-input w-full"
              value={expectedDuration}
              onChange={e => setExpectedDuration(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="wu-task">Task Description *</label>
          <input 
            id="wu-task"
            type="text"
            className="form-input w-full"
            placeholder="e.g. Implement resilient retry mechanism with exponential backoff"
            value={task}
            onChange={e => setTask(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="form-label" htmlFor="wu-desc">Additional Context / Scope (optional)</label>
          <textarea 
            id="wu-desc"
            className="form-input w-full"
            rows="3"
            placeholder="Key files modified, endpoints updated, or specific demonstrations planned..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="row">
          <div>
            <label className="form-label" htmlFor="wu-name">Participant Name *</label>
            <input 
              id="wu-name"
              type="text"
              className="form-input w-full"
              placeholder="e.g. Jordan Miller"
              value={participantName}
              onChange={e => setParticipantName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="wu-email">Participant Email (optional)</label>
            <input 
              id="wu-email"
              type="email"
              className="form-input w-full"
              placeholder="e.g. jmiller@company.org"
              value={participantEmail}
              onChange={e => setParticipantEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-16 flex gap-16">
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || !project.trim() || !task.trim() || !participantName.trim()}
            style={{ flex: 1, padding: '12px', fontSize: '16px' }}
          >
            {loading ? 'Initializing Room...' : 'Create Room'}
          </button>
          <button 
            type="button" 
            className="btn-ghost" 
            onClick={onGoToDashboard}
            style={{ padding: '12px 20px' }}
          >
            View Dashboard
          </button>
        </div>
      </form>
    </div>
  );
}
