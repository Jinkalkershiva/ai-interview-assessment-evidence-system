import { useState, useEffect } from 'react';
import { api } from './services/api.js';
import Header from './components/Header.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import InterviewContainer from './pages/InterviewContainer.jsx';
import WorkUpdateContainer from './pages/workupdate/WorkUpdateContainer.jsx';
import ReviewerDashboard from './pages/workupdate/ReviewerDashboard.jsx';
import AppearanceModal from './components/AppearanceModal.jsx';
import ModelSelectorMenu from './components/ModelSelectorMenu.jsx';
import { MODELS } from './config/models.ts';
import { IconFileText, IconMicrophone, IconLightning, IconClipboard, IconExternalLink } from './components/Icons.jsx';

export default function App() {
  const queryMode = new URLSearchParams(window.location.search).get('mode');
  const [appMode, setAppMode] = useState(
    queryMode === 'interview' ? 'interview' :
    queryMode === 'workupdate' ? 'workupdate' :
    queryMode === 'reviewer' ? 'reviewer' : 'exam'
  );
  
  const [page,   setPage]   = useState('upload'); // 'upload' | 'results'
  const [data,   setData]   = useState(null);
  const [health, setHealth] = useState(null);

  // Global AI Model selection persisted in localStorage
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('ai_selected_model') || MODELS.find(m => m.available)?.id || 'gemini-3.8-flash';
  });

  // Global UI Theme: 'pencil' (Light) | 'chatgpt-black' (Dark)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'chatgpt-black') return 'chatgpt-black';
    if (saved === 'light' || saved === 'pencil') return 'pencil';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'chatgpt-black';
    }
    return 'pencil';
  });

  // Global Background Atmosphere Preset: 'paper' | 'graphite' | 'aurora' | 'focus' | 'custom'
  const [background, setBackground] = useState(() => {
    return localStorage.getItem('app_background') || 'paper';
  });

  // Custom Background (data URL)
  const [customBg, setCustomBg] = useState(() => {
    return localStorage.getItem('app_custom_background') || null;
  });

  const [showAppearance, setShowAppearance] = useState(false);

  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('ai_selected_model', modelId);
  };

  const checkServerHealth = async () => {
    setHealth(null);
    const data = await api.checkHealth();
    setHealth(data);
    return data;
  };

  // Sync theme to document element and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync background to document element and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-bg', background);
    localStorage.setItem('app_background', background);
  }, [background]);

  useEffect(() => {
    checkServerHealth();
  }, []);

  const handleCustomBgChange = (dataUrl) => {
    setCustomBg(dataUrl);
    if (dataUrl) {
      localStorage.setItem('app_custom_background', dataUrl);
    } else {
      localStorage.removeItem('app_custom_background');
    }
  };

  const handleAnalyzed = (result) => {
    setData(result);
    setPage('results');
  };

  const handleBack = () => {
    setPage('upload');
    setData(null);
  };

  const openNewTab = (targetMode) => {
    window.open(`?mode=${targetMode}`, '_blank');
  };

  return (
    <div className="app-root-container">
      {/* ── 1. BACKGROUND ATMOSPHERE LAYER ── */}
      <div 
        className="app-background" 
        data-bg={background}
        style={background === 'custom' && customBg ? { backgroundImage: `url(${customBg})` } : {}}
      />

      {/* ── 2. THEME-CONTROLLED CONTENT OVERLAY SHIELD ── */}
      <div className="app-background-overlay" />

      {/* ── 3. APPLICATION INTERFACE SHELL ── */}
      <div className="app-shell">
        <Header 
          health={health} 
          appMode={appMode} 
          theme={theme}
          onThemeChange={setTheme}
          onOpenAppearance={() => setShowAppearance(true)}
        />
        
        <nav className="mode-nav-bar">
          <ModelSelectorMenu 
            selectedModel={selectedModel} 
            onSelectModel={handleSelectModel} 
          />
          <span className="mode-nav-divider" aria-hidden="true" />
          <button 
            className={`mode-nav-pill ${appMode === 'exam' ? 'active' : ''}`}
            onClick={() => setAppMode('exam')}
          >
            <IconFileText size={15} />
            <span>Exam Helper</span>
          </button>
          <button 
            className={`mode-nav-pill ${appMode === 'interview' ? 'active' : ''}`}
            onClick={() => setAppMode('interview')}
          >
            <IconMicrophone size={15} />
            <span>AI Interview Coach</span>
          </button>
          <button 
            className={`mode-nav-pill ${appMode === 'workupdate' ? 'active' : ''}`}
            onClick={() => setAppMode('workupdate')}
          >
            <IconLightning size={15} />
            <span>Work Update</span>
          </button>
          <button 
            className={`mode-nav-pill ${appMode === 'reviewer' ? 'active' : ''}`}
            onClick={() => setAppMode('reviewer')}
          >
            <IconClipboard size={15} />
            <span>Reviewer Dashboard</span>
          </button>
          
          <button 
            className="btn-ghost flex items-center gap-6"
            style={{ marginLeft: 'auto', fontSize: '13px', padding: '6px 12px' }}
            onClick={() => openNewTab(appMode)}
            title="Open current workspace in a new browser tab"
          >
            <span>New Tab</span>
            <IconExternalLink size={13} />
          </button>
        </nav>

        <main className="app-main flex-col">
          {appMode === 'exam' && (
            <div style={{ padding: '24px' }}>
              {page === 'upload' && <UploadPage onAnalyzed={handleAnalyzed} />}
              {page === 'results' && data && <ResultsPage data={data} onBack={handleBack} />}
            </div>
          )}

          {appMode === 'interview' && (
            <InterviewContainer 
              checkServerHealth={checkServerHealth} 
              selectedModel={selectedModel}
            />
          )}

          {appMode === 'workupdate' && (
            <WorkUpdateContainer onNavigateToDashboard={() => setAppMode('reviewer')} />
          )}

          {appMode === 'reviewer' && (
            <ReviewerDashboard onNewUpdateClick={() => setAppMode('workupdate')} />
          )}
        </main>
      </div>

      {/* ── 4. APPEARANCE MODAL ── */}
      <AppearanceModal 
        isOpen={showAppearance}
        onClose={() => setShowAppearance(false)}
        theme={theme}
        onThemeChange={setTheme}
        background={background}
        onBackgroundChange={setBackground}
        customBg={customBg}
        onCustomBgChange={handleCustomBgChange}
      />
    </div>
  );
}
