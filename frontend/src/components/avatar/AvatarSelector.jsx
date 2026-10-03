import React from 'react';
import { AVATAR_REGISTRY, getAvatarById } from './avatarRegistry.js';
import AvatarRenderer from './AvatarRenderer.jsx';

export default function AvatarSelector({ selectedAvatarId = 'human', onSelect }) {
  const activeAvatar = getAvatarById(selectedAvatarId);

  return (
    <div className="flex-col gap-16">
      <div className="flex justify-between items-center">
        <label className="form-label" style={{ marginBottom: 0 }}>Interviewer Avatar</label>
        <span className="text-muted" style={{ fontSize: '13px' }}>
          {activeAvatar.title}
        </span>
      </div>

      {/* Grid of Avatar options */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px'
        }}
      >
        {AVATAR_REGISTRY.map((av) => {
          const isSelected = av.id === selectedAvatarId;
          return (
            <button
              key={av.id}
              type="button"
              onClick={() => onSelect(av.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 8px',
                borderRadius: '8px',
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: isSelected ? 'var(--surface-alt)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                textAlign: 'center'
              }}
            >
              <div style={{ width: 64, height: 64, marginBottom: 8 }}>
                {av.id === 'none' ? (
                  <div 
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '1px dashed var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  </div>
                ) : (
                  <AvatarRenderer avatarId={av.id} state="IDLE" size={64} showBadge={false} />
                )}
              </div>
              <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: 'var(--text)' }}>
                {av.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                {av.type.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      {activeAvatar.id !== 'none' && (
        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            fontSize: '13px',
            color: 'var(--text-muted)'
          }}
        >
          <strong style={{ color: 'var(--text)' }}>{activeAvatar.name}:</strong> {activeAvatar.description}
        </div>
      )}
    </div>
  );
}
