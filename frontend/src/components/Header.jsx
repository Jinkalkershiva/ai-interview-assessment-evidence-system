import { IconBrain, IconSun, IconMoon, IconPalette } from './Icons.jsx';

/**
 * Application header with app name, server status indicator,
 * and appearance & theme controls.
 * Consistent Pencil-style visual treatment in both Light and Dark modes.
 * Subtle neutral hover styling matching active theme.
 */
export default function Header({ 
  health, 
  appMode, 
  theme = 'pencil',
  onThemeChange,
  onOpenAppearance 
}) {
  const backendConnected = health !== null && health.status === 'ok';
  const aiReady = backendConnected && health.aiConfigured;

  const isDark = theme === 'chatgpt-black' || theme === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'pencil' : 'chatgpt-black';
    if (onThemeChange) {
      onThemeChange(next);
    }
  };

  const backendLabel = health === null ? 'Checking backend'
                      : backendConnected ? 'Backend connected'
                      : 'Backend unavailable';
  const aiLabel = health === null ? 'Checking AI service'
                  : !backendConnected ? 'AI service unknown'
                  : aiReady ? 'AI service available'
                  : 'AI service unavailable';

  return (
    <header className="app-header flex justify-between items-center">
      <div className="header-brand flex items-center gap-8">
        <span style={{ color: 'var(--accent)', display: 'flex' }}><IconBrain size={18} /></span>
        <div className="header-title-group">
          <span className="header-title">
            {appMode === 'interview' ? 'Interview Coach' :
             appMode === 'workupdate' ? 'AI Work Update' :
             appMode === 'reviewer' ? 'Reviewer Dashboard' : 'AI Exam Helper'}
          </span>
          {appMode === 'interview' && <span className="header-subtitle">Practice technical interviews from your resume.</span>}
          {appMode === 'workupdate' && <span className="header-subtitle">Demonstrate work with screen share and AI synthesis.</span>}
          {appMode === 'reviewer' && <span className="header-subtitle">Review evidence and sign off technical updates.</span>}
        </div>
      </div>

      <div className="header-tools flex items-center gap-10">
        <div className="header-status" aria-live="polite" aria-atomic="true">
          <span className={`status-item ${backendConnected ? 'is-available' : health === null ? 'is-pending' : 'is-unavailable'}`}>
            <span className="status-mark" aria-hidden="true" /><span className="status-long">{backendLabel}</span><span className="status-short">Backend</span>
          </span>
          {appMode === 'interview' && <span className={`status-item ${aiReady ? 'is-available' : health === null ? 'is-pending' : 'is-unavailable'}`}>
            <span className="status-mark" aria-hidden="true" /><span className="status-long">{aiLabel}</span><span className="status-short">{health === null ? 'AI checking' : aiReady ? 'AI ready' : backendConnected ? 'AI unavailable' : 'AI unknown'}</span>
          </span>}
        </div>

        {/* Appearance & Background Gallery Modal Trigger */}
        <button 
          type="button"
          className="appearance-trigger-btn flex items-center gap-6"
          onClick={onOpenAppearance}
          title="Customize appearance & background gallery"
          aria-label="Appearance settings"
        >
          <IconPalette size={15} />
          <span className="appearance-trigger-label">Appearance</span>
        </button>

        {/* Quick Theme Toggle Button */}
        <button 
          type="button"
          className="theme-toggle flex items-center justify-center" 
          onClick={toggleTheme} 
          title={isDark ? 'Switch to Pencil (light theme)' : 'Switch to ChatGPT Black (dark theme)'} 
          aria-label={isDark ? 'Switch to Pencil (light theme)' : 'Switch to ChatGPT Black (dark theme)'}
        >
          {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
      </div>
    </header>
  );
}
