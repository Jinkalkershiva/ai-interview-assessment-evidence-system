import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import WorkUpdateReportView from './WorkUpdateReportView.jsx';

export default function ReviewerDashboard({ onNewUpdateClick }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtering & search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected room for detailed view
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeToken, setActiveToken] = useState('');
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tokenInputVisible, setTokenInputVisible] = useState(false);
  const [enteredToken, setEnteredToken] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listWorkUpdateRooms();
      setRooms(list || []);
    } catch (err) {
      setError(err.message || 'Failed to load work update records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenRoom = async (roomId, token) => {
    setSelectedRoomId(roomId);
    setLoadingDetail(true);
    setError(null);
    try {
      const detail = await api.getWorkUpdateRoom(roomId, token);
      setSelectedRoomDetail(detail);
      setActiveToken(token);
      setTokenInputVisible(false);
    } catch (err) {
      if (err.message && (err.message.includes('token') || err.message.includes('401') || err.message.includes('403'))) {
        setTokenInputVisible(true);
      } else {
        setError(err.message || 'Unable to open room details');
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleTokenSubmit = (e) => {
    e.preventDefault();
    if (enteredToken.trim() && selectedRoomId) {
      handleOpenRoom(selectedRoomId, enteredToken.trim());
    }
  };

  // Filtered list
  const filteredRooms = rooms.filter(r => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (r.roomId && r.roomId.toLowerCase().includes(q)) ||
      (r.project && r.project.toLowerCase().includes(q)) ||
      (r.participantName && r.participantName.toLowerCase().includes(q)) ||
      (r.task && r.task.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadgeStyle = (st) => {
    switch (st) {
      case 'REVIEWED': return { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' };
      case 'UNDER_REVIEW': return { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' };
      case 'COMPLETED': return { bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE' };
      case 'IN_PROGRESS': return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
      default: return { bg: 'var(--surface-alt)', color: 'var(--text-muted)', border: 'var(--border)' };
    }
  };

  // Detailed Room View
  if (selectedRoomDetail) {
    return (
      <WorkUpdateReportView 
        roomData={selectedRoomDetail}
        token={activeToken}
        onBack={() => {
          setSelectedRoomDetail(null);
          setSelectedRoomId(null);
          fetchRooms();
        }}
        onRefresh={() => handleOpenRoom(selectedRoomId, activeToken)}
      />
    );
  }

  return (
    <div className="screen-container flex-col gap-24" style={{ maxWidth: '1040px' }}>
      {/* Header */}
      <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="serif" style={{ fontSize: '28px', marginBottom: '4px' }}>Work Updates</h1>
          <p className="text-muted" style={{ fontSize: '14px' }}>
            Review demonstrated technical work, screen evidence, and action items across team projects.
          </p>
        </div>
        <div className="flex gap-12">
          <button 
            type="button" 
            className="btn-ghost" 
            onClick={fetchRooms}
            style={{ fontSize: '13px' }}
          >
            Refresh
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={onNewUpdateClick}
            style={{ fontSize: '13px' }}
          >
            Create Work Update
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      {/* Token Prompt Modal if unauthorized */}
      {tokenInputVisible && (
        <div className="modal-backdrop">
          <div className="modal-content" role="dialog" style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Room Authorization</h3>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
              Please enter your participant or reviewer access token to open <strong>{selectedRoomId}</strong>.
            </p>
            <form onSubmit={handleTokenSubmit} className="flex-col gap-12">
              <input 
                type="text" 
                className="form-input w-full"
                placeholder="Paste access token (e.g. r-...)"
                value={enteredToken}
                onChange={e => setEnteredToken(e.target.value)}
                autoFocus
                required
              />
              <div className="flex justify-end gap-10 mt-8">
                <button type="button" className="btn-ghost" onClick={() => setTokenInputVisible(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loadingDetail || !enteredToken.trim()}>
                  {loadingDetail ? 'Verifying...' : 'Unlock Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div 
        className="flex justify-between items-center"
        style={{
          padding: '12px 16px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div className="flex gap-8 items-center" style={{ flexWrap: 'wrap' }}>
          {['ALL', 'IN_PROGRESS', 'COMPLETED', 'UNDER_REVIEW', 'REVIEWED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`btn-ghost ${statusFilter === st ? 'text-accent' : ''}`}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: statusFilter === st ? 'var(--surface-alt)' : 'transparent',
                fontWeight: statusFilter === st ? 600 : 500
              }}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>

        <input 
          type="text"
          className="form-input"
          placeholder="Filter by Room ID, Project, or Name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '260px', fontSize: '13px', padding: '6px 12px' }}
        />
      </div>

      {/* Work Updates Table */}
      <div 
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }} className="text-muted">
            Loading work update records...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }} className="text-muted">
            {rooms.length === 0 ? 'No work updates recorded yet. Click "Create Work Update" to begin.' : 'No records match the current filter.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Room ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Participant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Project / Task</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((r) => {
                  const badge = getStatusBadgeStyle(r.status);
                  return (
                    <tr 
                      key={r.roomId}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          {r.roomId}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                        {r.participantName}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{r.project}</div>
                        <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>{r.task}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span 
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {r.sessionDuration || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button 
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                          onClick={() => handleOpenRoom(r.roomId, '')}
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
