import React, { useState, useEffect, useRef } from 'react';
import { getAvatarById } from './avatarRegistry.js';

/**
 * Lightweight 2D Vector Avatar Renderer.
 * Supports mouth animation, natural blinking, and visual states:
 * IDLE, LISTENING, THINKING, SPEAKING, SUCCESS, NEUTRAL.
 */
export default function AvatarRenderer({
  avatarId = 'human',
  state = 'IDLE', // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'SUCCESS' | 'NEUTRAL'
  size = 160,
  showBadge = true
}) {
  const avatar = getAvatarById(avatarId);
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0); // 0 (closed) to 1 (fully open)
  const animFrameRef = useRef(null);

  // Natural blinking effect
  useEffect(() => {
    let timeout;
    const scheduleBlink = () => {
      const nextDelay = 2500 + Math.random() * 3500;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 160);
      }, nextDelay);
    };
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Lip-sync / mouth movement when state is SPEAKING
  useEffect(() => {
    if (state !== 'SPEAKING') {
      setMouthOpen(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let startTime = performance.now();
    const animateMouth = (time) => {
      const elapsed = (time - startTime) / 1000;
      // Multi-frequency harmonic wave for natural conversational mouth cadence
      const wave = Math.sin(elapsed * 14) * 0.4 + Math.sin(elapsed * 22) * 0.3 + 0.5;
      const clamped = Math.max(0.1, Math.min(0.9, wave));
      setMouthOpen(clamped);
      animFrameRef.current = requestAnimationFrame(animateMouth);
    };

    animFrameRef.current = requestAnimationFrame(animateMouth);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state]);

  if (avatarId === 'none') {
    return null;
  }

  // State-specific properties
  const isListening = state === 'LISTENING';
  const isThinking = state === 'THINKING';
  const isSpeaking = state === 'SPEAKING';
  const isSuccess = state === 'SUCCESS';

  const badgeColor = isSpeaking ? '#2563eb' : isListening ? '#dc2626' : isThinking ? '#d97706' : isSuccess ? '#16a34a' : 'var(--text-muted)';
  const badgeLabel = isSpeaking ? 'Speaking' : isListening ? 'Listening' : isThinking ? 'Thinking' : isSuccess ? 'Completed' : 'Ready';

  return (
    <div className="flex-col items-center gap-8" style={{ width: size, margin: '0 auto', userSelect: 'none' }}>
      <div 
        style={{
          width: size,
          height: size,
          position: 'relative',
          borderRadius: '50%',
          background: 'var(--surface-alt)',
          border: `2px solid ${isSpeaking || isListening ? badgeColor : 'var(--border)'}`,
          boxShadow: isSpeaking 
            ? `0 0 16px ${avatar.themeColor}33` 
            : isListening 
              ? '0 0 16px rgba(220, 38, 38, 0.25)' 
              : '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'border-color 0.25s, box-shadow 0.25s',
          overflow: 'hidden'
        }}
      >
        {/* Subtle breathing animation container */}
        <div 
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isSpeaking 
              ? `translateY(${Math.sin(mouthOpen * Math.PI) * -1.5}px)` 
              : isThinking 
                ? 'rotate(-2deg)' 
                : isListening 
                  ? 'scale(1.02)' 
                  : 'none',
            transition: 'transform 0.2s ease-out'
          }}
        >
          {avatar.type === 'human' && (
            <HumanAvatarSvg blink={blink} mouthOpen={mouthOpen} state={state} />
          )}
          {avatar.type === 'mouse' && (
            <MouseAvatarSvg blink={blink} mouthOpen={mouthOpen} state={state} />
          )}
          {avatar.type === 'cat' && (
            <CatAvatarSvg blink={blink} mouthOpen={mouthOpen} state={state} />
          )}
          {avatar.type === 'robot' && (
            <RobotAvatarSvg blink={blink} mouthOpen={mouthOpen} state={state} />
          )}
        </div>

        {/* Ambient indicator ring */}
        {isListening && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(220, 38, 38, 0.6)',
              animation: 'pulse 1.5s infinite ease-in-out'
            }}
          />
        )}
      </div>

      {showBadge && (
        <div 
          className="flex items-center gap-6"
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: badgeColor
          }}
        >
          <span 
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: badgeColor,
              animation: isSpeaking || isListening || isThinking ? 'pulse 1s infinite' : 'none'
            }}
          />
          {badgeLabel}
        </div>
      )}
    </div>
  );
}

// ── 1. Professional Human (Elena Vance) ──────────────────────────────────────
function HumanAvatarSvg({ blink, mouthOpen, state }) {
  const eyeHeight = blink ? 1 : 7;
  const mouthH = Math.max(2, Math.round(mouthOpen * 14));
  const isThinking = state === 'THINKING';

  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="humanSkin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F9DEC9" />
          <stop offset="100%" stopColor="#E5BE9E" />
        </linearGradient>
        <linearGradient id="humanHair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2B2D42" />
          <stop offset="100%" stopColor="#1E1E24" />
        </linearGradient>
        <linearGradient id="suitCollar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* Background Hair Volume */}
      <path d="M 32 40 C 32 18, 88 18, 88 40 C 92 68, 92 84, 88 94 C 84 96, 36 96, 32 94 C 28 84, 28 68, 32 40 Z" fill="url(#humanHair)" />

      {/* Neck */}
      <rect x="52" y="76" width="16" height="18" rx="3" fill="#E5BE9E" />

      {/* Professional Collar & Blazer */}
      <path d="M 28 114 L 38 88 L 82 88 L 92 114 Z" fill="url(#suitCollar)" />
      <path d="M 46 88 L 60 102 L 74 88 L 68 88 L 60 98 L 52 88 Z" fill="#FFFFFF" />

      {/* Head & Face */}
      <ellipse cx="60" cy="56" rx="26" ry="30" fill="url(#humanSkin)" />

      {/* Hair Front Styling */}
      <path d="M 34 46 C 36 26, 84 26, 86 46 C 76 34, 52 36, 42 46 C 38 48, 35 48, 34 46 Z" fill="url(#humanHair)" />

      {/* Eyebrows */}
      <path d={isThinking ? "M 44 43 Q 50 39 56 42" : "M 44 42 Q 50 40 56 42"} stroke="#2B2D42" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d={isThinking ? "M 64 42 Q 70 38 76 40" : "M 64 42 Q 70 40 76 42"} stroke="#2B2D42" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* Eyes */}
      <ellipse cx="50" cy="49" rx="4" ry={eyeHeight} fill="#1E293B" />
      <ellipse cx="70" cy="49" rx="4" ry={eyeHeight} fill="#1E293B" />
      {!blink && (
        <>
          <circle cx="51.5" cy="48" r="1.3" fill="#FFFFFF" />
          <circle cx="71.5" cy="48" r="1.3" fill="#FFFFFF" />
        </>
      )}

      {/* Eyeglasses Frame (Professional Touch) */}
      <rect x="42" y="44" width="16" height="11" rx="3" fill="none" stroke="#475569" strokeWidth="1.4" />
      <rect x="62" y="44" width="16" height="11" rx="3" fill="none" stroke="#475569" strokeWidth="1.4" />
      <line x1="58" y1="48" x2="62" y2="48" stroke="#475569" strokeWidth="1.4" />

      {/* Nose */}
      <path d="M 59 55 Q 60 58 62 58" stroke="#D4A373" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Animated Mouth */}
      {mouthOpen > 0.05 ? (
        <ellipse cx="60" cy="68" rx={6} ry={mouthH / 2} fill="#A53860" />
      ) : (
        <path d="M 54 68 Q 60 71 66 68" stroke="#A53860" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

// ── 2. Milo the Mouse (Original Scholarly Mouse) ─────────────────────────────
function MouseAvatarSvg({ blink, mouthOpen, state }) {
  const eyeHeight = blink ? 1 : 6;
  const mouthH = Math.max(1.5, Math.round(mouthOpen * 12));
  const isListening = state === 'LISTENING';

  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mouseFur" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </radialGradient>
        <radialGradient id="earInner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#F472B6" />
        </radialGradient>
      </defs>

      {/* Round Mouse Ears */}
      <g transform={isListening ? "rotate(-4 32 30)" : "none"}>
        <circle cx="32" cy="30" r="18" fill="url(#mouseFur)" />
        <circle cx="32" cy="30" r="11" fill="url(#earInner)" />
      </g>
      <g transform={isListening ? "rotate(4 88 30)" : "none"}>
        <circle cx="88" cy="30" r="18" fill="url(#mouseFur)" />
        <circle cx="88" cy="30" r="11" fill="url(#earInner)" />
      </g>

      {/* Scholarly Vest */}
      <path d="M 38 114 Q 60 92 82 114 Z" fill="#B45309" />
      <path d="M 52 114 L 60 100 L 68 114 Z" fill="#F8FAFC" />

      {/* Head */}
      <ellipse cx="60" cy="62" rx="27" ry="25" fill="url(#mouseFur)" />

      {/* Whiskers */}
      <line x1="32" y1="67" x2="48" y2="68" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="30" y1="72" x2="48" y2="71" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="88" y1="67" x2="72" y2="68" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="90" y1="72" x2="72" y2="71" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />

      {/* Round Spectacles */}
      <circle cx="49" cy="57" r="9" fill="none" stroke="#D97706" strokeWidth="1.6" />
      <circle cx="71" cy="57" r="9" fill="none" stroke="#D97706" strokeWidth="1.6" />
      <line x1="58" y1="57" x2="62" y2="57" stroke="#D97706" strokeWidth="1.6" />

      {/* Eyes */}
      <ellipse cx="49" cy="57" rx="3.5" ry={eyeHeight} fill="#0F172A" />
      <ellipse cx="71" cy="57" rx="3.5" ry={eyeHeight} fill="#0F172A" />
      {!blink && (
        <>
          <circle cx="50" cy="55.5" r="1.2" fill="#FFFFFF" />
          <circle cx="72" cy="55.5" r="1.2" fill="#FFFFFF" />
        </>
      )}

      {/* Nose */}
      <ellipse cx="60" cy="67" rx="3.2" ry="2.2" fill="#F472B6" />

      {/* Animated Mouth */}
      {mouthOpen > 0.05 ? (
        <ellipse cx="60" cy="75" rx={5} ry={mouthH / 2} fill="#701A75" />
      ) : (
        <path d="M 56 73 Q 60 76 64 73" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

// ── 3. Jasper the Cat (Original Analytical Feline) ──────────────────────────
function CatAvatarSvg({ blink, mouthOpen, state }) {
  const eyeHeight = blink ? 1 : 6;
  const mouthH = Math.max(1.5, Math.round(mouthOpen * 12));
  const isListening = state === 'LISTENING';

  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="catFur" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Pointy Cat Ears with Tufts */}
      <g transform={isListening ? "rotate(-5 36 28)" : "none"}>
        <polygon points="26,44 38,18 52,38" fill="url(#catFur)" />
        <polygon points="30,42 38,24 48,38" fill="#FBCFE8" />
      </g>
      <g transform={isListening ? "rotate(5 84 28)" : "none"}>
        <polygon points="94,44 82,18 68,38" fill="url(#catFur)" />
        <polygon points="90,42 82,24 72,38" fill="#FBCFE8" />
      </g>

      {/* Emerald Collar */}
      <path d="M 36 114 Q 60 90 84 114 Z" fill="#0F172A" />
      <rect x="46" y="88" width="28" height="6" rx="3" fill="#059669" />
      <circle cx="60" cy="94" r="3.5" fill="#F59E0B" />

      {/* Head */}
      <ellipse cx="60" cy="60" rx="27" ry="24" fill="url(#catFur)" />

      {/* Whiskers */}
      <line x1="28" y1="64" x2="46" y2="66" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="26" y1="70" x2="46" y2="69" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="92" y1="64" x2="74" y2="66" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="94" y1="70" x2="74" y2="69" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />

      {/* Cat Eyes (Analytical Emerald / Gold) */}
      <ellipse cx="48" cy="54" rx="5" ry={eyeHeight} fill="#10B981" />
      <ellipse cx="72" cy="54" rx="5" ry={eyeHeight} fill="#10B981" />
      {!blink && (
        <>
          {/* Vertical Cat Pupils */}
          <ellipse cx="48" cy="54" rx="1.6" ry={eyeHeight - 1} fill="#064E3B" />
          <ellipse cx="72" cy="54" rx="1.6" ry={eyeHeight - 1} fill="#064E3B" />
          <circle cx="49" cy="52" r="1.2" fill="#FFFFFF" />
          <circle cx="73" cy="52" r="1.2" fill="#FFFFFF" />
        </>
      )}

      {/* Nose */}
      <polygon points="57,63 63,63 60,67" fill="#F472B6" />

      {/* Mouth */}
      {mouthOpen > 0.05 ? (
        <ellipse cx="60" cy="74" rx={5.5} ry={mouthH / 2} fill="#831843" />
      ) : (
        <path d="M 54 70 Q 57 73 60 70 Q 63 73 66 70" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

// ── 4. Nexus-7 (Original Robotic AI Evaluator) ──────────────────────────────
function RobotAvatarSvg({ blink, mouthOpen, state }) {
  const isThinking = state === 'THINKING';
  const isSpeaking = state === 'SPEAKING';
  const isListening = state === 'LISTENING';

  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="robotBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="visorGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>

      {/* Antenna with Status Beacon */}
      <line x1="60" y1="18" x2="60" y2="34" stroke="#64748B" strokeWidth="3" />
      <circle 
        cx="60" 
        cy="18" 
        r="4.5" 
        fill={isSpeaking ? '#38BDF8' : isListening ? '#EF4444' : isThinking ? '#F59E0B' : '#0284C7'} 
      />

      {/* Robot Chassis Base */}
      <path d="M 36 114 L 44 94 L 76 94 L 84 114 Z" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />

      {/* Robot Head Frame */}
      <rect x="34" y="34" width="52" height="48" rx="10" fill="url(#robotBody)" stroke="#475569" strokeWidth="2" />

      {/* Side Audio Sensors / Bolts */}
      <rect x="28" y="48" width="6" height="18" rx="2" fill="#64748B" />
      <rect x="86" y="48" width="6" height="18" rx="2" fill="#64748B" />

      {/* Optical Visor Display */}
      <rect x="42" y="46" width="36" height="16" rx="4" fill="#0B132B" stroke="#1E293B" strokeWidth="1.2" />

      {/* Optical Sensor Eyes inside Visor */}
      {!blink ? (
        <>
          <circle cx="51" cy="54" r={isListening ? 4.5 : 3.5} fill="url(#visorGlow)" />
          <circle cx="69" cy="54" r={isListening ? 4.5 : 3.5} fill="url(#visorGlow)" />
          <circle cx="51" cy="54" r="1.5" fill="#FFFFFF" />
          <circle cx="69" cy="54" r="1.5" fill="#FFFFFF" />
        </>
      ) : (
        <line x1="46" y1="54" x2="74" y2="54" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Dynamic Audio Wave / Digital Mouth */}
      {isSpeaking ? (
        <g stroke="#38BDF8" strokeWidth="2" strokeLinecap="round">
          <line x1="48" y1="71" x2="48" y2={71 - Math.sin(mouthOpen * 6) * 5} />
          <line x1="54" y1="71" x2="54" y2={71 - Math.sin(mouthOpen * 8) * 8} />
          <line x1="60" y1="71" x2="60" y2={71 - Math.sin(mouthOpen * 10) * 10} />
          <line x1="66" y1="71" x2="66" y2={71 - Math.sin(mouthOpen * 8) * 8} />
          <line x1="72" y1="71" x2="72" y2={71 - Math.sin(mouthOpen * 6) * 5} />
        </g>
      ) : (
        <line x1="50" y1="71" x2="70" y2="71" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
