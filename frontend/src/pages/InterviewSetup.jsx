import { useState } from 'react';
import { api } from '../services/api.js';
import FileDropzone from '../components/FileDropzone.jsx';
import FilePreview from '../components/FilePreview.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import SuggestionChips from '../components/SuggestionChips.jsx';
import AvatarSelector from '../components/avatar/AvatarSelector.jsx';
import RoleSelector from '../components/interview/RoleSelector.jsx';
import ExperienceLevelSelector from '../components/interview/ExperienceLevelSelector.jsx';
import InterviewTypeSelector from '../components/interview/InterviewTypeSelector.jsx';
import QuestionCountSelector from '../components/interview/QuestionCountSelector.jsx';
import { CODING_FOCUS_TOPICS } from '../config/interviewOptions.js';
import { IconMicrophone, IconLightning, IconBarChart, IconChevronDown } from '../components/Icons.jsx';

export default function InterviewSetup({ onStart, checkServerHealth, selectedModel }) {
  const [file, setFile] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [interviewType, setInterviewType] = useState('Mixed');
  const [level, setLevel] = useState('Intermediate');
  const [count, setCount] = useState('5');
  const [codingCount, setCodingCount] = useState('1');
  const [focusTopics, setFocusTopics] = useState('Arrays, Strings, HashMap');
  const [avatarId, setAvatarId] = useState('human');
  const [showConnections, setShowConnections] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please provide a resume.');
      return;
    }

    const roleString = Array.isArray(selectedRoles) ? selectedRoles.join(', ') : selectedRoles;
    if (!roleString || !roleString.trim()) {
      setError('Please select or enter at least one target job role.');
      return;
    }

    setLoading(true);
    setError(null);
    if (checkServerHealth) await checkServerHealth();
    
    try {
      if (interviewType === 'Coding') {
        const result = await api.startCodingInterview(
          file,
          roleString,
          level,
          focusTopics,
          parseInt(codingCount, 10),
          ''
        );
        onStart(result, 'Coding', avatarId);
      } else {
        const result = await api.startInterview(
          file,
          roleString,
          interviewType,
          level,
          parseInt(count, 10),
          ''
        );
        onStart(result, interviewType, avatarId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasRoles = Array.isArray(selectedRoles) ? selectedRoles.length > 0 : Boolean(selectedRoles?.trim());
  const isReady = file && hasRoles;

  return (
    <div className="setup-hero-wrapper flex-col items-center">
      {/* HERO HEADER */}
      <div className="setup-header text-center mb-32">
        <div className="setup-badge-tag mb-12">
          <span>AI Interview Coach</span>
        </div>
        <h1 className="serif setup-title" style={{ fontSize: '32px', marginBottom: '8px' }}>
          Ready for your next interview?
        </h1>
        <p className="text-muted setup-subtitle" style={{ fontSize: '16px', maxWidth: '560px', margin: '0 auto' }}>
          Customize your role, difficulty, and interview type to practice with an interactive AI interviewer.
        </p>
      </div>

      {error && (
        <div className="w-full max-w-720 mb-20">
          <ErrorMessage message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {/* SETUP CARD */}
      <div className="setup-card w-full max-w-720">
        <form onSubmit={handleSubmit} className="flex-col gap-28">
          
          {/* RESUME UPLOAD */}
          <div>
            <label className="form-label">
              Upload Resume <span className="text-muted" style={{ fontWeight: 'normal' }}>(PDF or TXT)</span>
            </label>
            {!file ? (
              <FileDropzone onFileSelect={setFile} accept=".pdf,.txt" />
            ) : (
              <FilePreview file={file} onRemove={() => setFile(null)} />
            )}
          </div>

          {/* TARGET ROLE (DYNAMIC SEARCHABLE MULTI-SELECT) */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <label className="form-label" style={{ marginBottom: 0 }}>
                Target Job Role
              </label>
              <span className="text-muted" style={{ fontSize: '12px' }}>
                Search or select multiple roles
              </span>
            </div>
            <RoleSelector
              selectedRoles={selectedRoles}
              onChange={setSelectedRoles}
              isMulti={true}
              placeholder="Search job roles..."
            />
          </div>

          {/* INTERVIEW TYPE */}
          <div>
            <div className="form-label" id="interview-type-label">Interview Type</div>
            <InterviewTypeSelector
              value={interviewType}
              onChange={setInterviewType}
            />
          </div>

          {/* FOCUS TOPICS (If Coding mode) */}
          {interviewType === 'Coding' && (
            <div>
              <label className="form-label" htmlFor="interview-focus">Algorithm & Data Structure Focus</label>
              <input 
                id="interview-focus"
                type="text" 
                className="form-input w-full" 
                value={focusTopics} 
                onChange={e => setFocusTopics(e.target.value)} 
                placeholder="e.g. Arrays, Strings, HashMap, Trees..."
              />
              <SuggestionChips options={CODING_FOCUS_TOPICS} onSelect={setFocusTopics} />
            </div>
          )}

          {/* EXPERIENCE LEVEL */}
          <div>
            <div className="form-label" id="interview-level-label">Experience Level</div>
            <ExperienceLevelSelector
              value={level}
              onChange={setLevel}
            />
          </div>

          {/* QUESTIONS OR PROBLEMS COUNT */}
          <div>
            <div className="form-label" id="interview-count-label">
              {interviewType === 'Coding' ? 'Number of Problems' : 'Number of Questions'}
            </div>
            <QuestionCountSelector
              value={interviewType === 'Coding' ? codingCount : count}
              onChange={interviewType === 'Coding' ? setCodingCount : setCount}
              isCoding={interviewType === 'Coding'}
            />
          </div>

          {/* AVATAR SELECTOR */}
          <div>
            <AvatarSelector selectedAvatarId={avatarId} onSelect={setAvatarId} />
          </div>

          {/* SERVER CONNECTION ACCORDION */}
          <div className="collapsible-section">
            <button 
              type="button" 
              className="flex items-center gap-8 text-muted"
              onClick={() => setShowConnections(!showConnections)}
              style={{ fontSize: '13px' }}
            >
              <span>Server Connection Details</span>
              <span style={{ 
                transform: showConnections ? 'rotate(180deg)' : 'none', 
                transition: 'transform 0.2s',
                display: 'inline-flex'
              }}>
                <IconChevronDown size={14} />
              </span>
            </button>
            
            {showConnections && (
              <div className="mt-12 text-muted" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                AI requests are handled securely by your local Spring Boot backend on port 8080.
              </div>
            )}
          </div>

          {/* PRIMARY SUBMIT ACTION */}
          <div className="mt-8">
            <button 
              type="submit" 
              className="btn-primary start-interview-btn" 
              disabled={!isReady || loading}
            >
              {loading 
                ? (interviewType === 'Coding' ? 'Generating coding problem...' : 'Crafting tailored interview questions...') 
                : (interviewType === 'Coding' ? 'Start Coding Interview' : 'Start Interview')}
            </button>
            {!isReady && !loading && (
              <div className="text-muted mt-8" style={{ fontSize: '13px', textAlign: 'center' }}>
                {!file ? 'Please upload your resume to begin.' : 'Please select at least one job role.'}
              </div>
            )}
          </div>

        </form>
      </div>

      {/* FEATURE HIGHLIGHTS (Pure SVG icons, no emojis) */}
      <div className="setup-features-row flex justify-center gap-24 mt-40">
        <div className="feature-pill-card flex items-center gap-12">
          <div className="feature-pill-icon">
            <IconMicrophone size={18} />
          </div>
          <div className="flex-col">
            <span className="feature-pill-title">Voice Interview</span>
            <span className="feature-pill-desc">Speak naturally with voice AI</span>
          </div>
        </div>

        <div className="feature-pill-card flex items-center gap-12">
          <div className="feature-pill-icon">
            <IconLightning size={18} />
          </div>
          <div className="flex-col">
            <span className="feature-pill-title">AI Evaluation</span>
            <span className="feature-pill-desc">Instant technical feedback</span>
          </div>
        </div>

        <div className="feature-pill-card flex items-center gap-12">
          <div className="feature-pill-icon">
            <IconBarChart size={18} />
          </div>
          <div className="flex-col">
            <span className="feature-pill-title">Interview Report</span>
            <span className="feature-pill-desc">Track progress & scores</span>
          </div>
        </div>
      </div>
    </div>
  );
}
