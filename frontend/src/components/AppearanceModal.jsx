import { useState, useRef, useEffect } from 'react';
import { BACKGROUND_PRESETS } from '../config/backgrounds.js';
import { IconX, IconSun, IconMoon, IconCheck, IconUpload, IconImage, IconPencil } from './Icons.jsx';

/**
 * AppearanceModal — Compact Theme & Background Gallery Selector
 * Allows independent selection of:
 * 1. Theme: "Pencil" (Light) or "ChatGPT Black" (Dark)
 * 2. Background: Paper, Graphite, Aurora, Focus, or Custom Image
 */
export default function AppearanceModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  background,
  onBackgroundChange,
  customBg,
  onCustomBgChange,
}) {
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCustomFileUpload = (e) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    // Limit to 3MB for browser localStorage safety
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image size must be under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        onCustomBgChange(dataUrl);
        onBackgroundChange('custom');
      }
    };
    reader.onerror = () => setUploadError('Failed to read image file.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveCustom = (e) => {
    e.stopPropagation();
    onCustomBgChange(null);
    if (background === 'custom') {
      onBackgroundChange('paper');
    }
  };

  const isDark = theme === 'chatgpt-black' || theme === 'dark';

  return (
    <div className="appearance-modal-backdrop" aria-hidden="false">
      <div 
        className="appearance-modal-panel" 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appearance-modal-title"
      >
        {/* Header */}
        <div className="appearance-modal-header flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-muted" style={{ display: 'flex' }}>
              <IconImage size={18} />
            </span>
            <h2 id="appearance-modal-title" className="appearance-modal-title">
              Appearance
            </h2>
          </div>
          <button 
            type="button" 
            className="appearance-close-btn"
            onClick={onClose}
            aria-label="Close appearance settings"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Section 1: Theme Mode */}
        <div className="appearance-section">
          <label className="appearance-section-label">
            Theme Mode
          </label>
          <div className="appearance-theme-toggle-group" role="radiogroup" aria-label="Theme mode">
            {/* Pencil Option */}
            <button
              type="button"
              role="radio"
              aria-checked={!isDark}
              className={`appearance-theme-pill ${!isDark ? 'active' : ''}`}
              onClick={() => onThemeChange('pencil')}
            >
              <span className="appearance-theme-icon pencil-icon">
                <IconPencil size={15} />
              </span>
              <div className="flex-col" style={{ textAlign: 'left' }}>
                <span className="appearance-theme-name">Pencil</span>
                <span className="appearance-theme-desc">Warm off-white paper</span>
              </div>
              {!isDark && <IconCheck size={14} />}
            </button>

            {/* ChatGPT Black Option */}
            <button
              type="button"
              role="radio"
              aria-checked={isDark}
              className={`appearance-theme-pill ${isDark ? 'active' : ''}`}
              onClick={() => onThemeChange('chatgpt-black')}
            >
              <span className="appearance-theme-icon dark-icon">
                <IconMoon size={15} />
              </span>
              <div className="flex-col" style={{ textAlign: 'left' }}>
                <span className="appearance-theme-name">ChatGPT Black</span>
                <span className="appearance-theme-desc">Focused near-black graphite</span>
              </div>
              {isDark && <IconCheck size={14} />}
            </button>
          </div>
        </div>

        {/* Section 2: Background Atmosphere Gallery */}
        <div className="appearance-section mt-18">
          <div className="flex items-center justify-between mb-8">
            <label className="appearance-section-label" style={{ marginBottom: 0 }}>
              Background Gallery
            </label>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Subtle atmospheric layer
            </span>
          </div>

          <div className="appearance-bg-grid" role="radiogroup" aria-label="Background atmosphere">
            {BACKGROUND_PRESETS.map((preset) => {
              const isSelected = background === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`appearance-bg-card ${isSelected ? 'active' : ''}`}
                  onClick={() => onBackgroundChange(preset.id)}
                >
                  <div 
                    className="appearance-bg-swatch"
                    style={{ 
                      background: preset.previewGradient,
                      borderColor: preset.previewBorder 
                    }}
                  >
                    {isSelected && (
                      <span className="appearance-bg-check">
                        <IconCheck size={13} />
                      </span>
                    )}
                  </div>
                  <span className="appearance-bg-name">{preset.label}</span>
                  <span className="appearance-bg-desc">{preset.badge}</span>
                </button>
              );
            })}

            {/* Custom Background Option */}
            <div 
              className={`appearance-bg-card custom-card ${background === 'custom' ? 'active' : ''}`}
              onClick={() => {
                if (customBg) {
                  onBackgroundChange('custom');
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div 
                className="appearance-bg-swatch custom-swatch"
                style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover' } : {}}
              >
                {background === 'custom' && customBg ? (
                  <span className="appearance-bg-check">
                    <IconCheck size={13} />
                  </span>
                ) : (
                  <IconUpload size={14} />
                )}
              </div>
              <span className="appearance-bg-name">
                {customBg ? 'Custom' : '+ Upload'}
              </span>
              {customBg ? (
                <button
                  type="button"
                  className="appearance-remove-custom"
                  onClick={handleRemoveCustom}
                  title="Remove custom background"
                  aria-label="Remove custom background"
                >
                  Remove
                </button>
              ) : (
                <span className="appearance-bg-desc">Image</span>
              )}
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleCustomFileUpload}
          />

          {uploadError && (
            <div className="appearance-upload-error mt-8">
              {uploadError}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="appearance-modal-footer mt-16 text-muted" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>
          <span>Theme controls all text readability & surfaces. Backgrounds apply subtle atmosphere.</span>
        </div>
      </div>
    </div>
  );
}
