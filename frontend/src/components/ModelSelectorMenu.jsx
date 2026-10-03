import React, { useState, useRef, useEffect } from 'react';
import { MODELS } from '../config/models.ts';
import { IconCpu, IconChevronDown } from './Icons.jsx';

/**
 * ModelSelectorMenu: Subheader control for selecting the active AI Intelligence Model.
 * Provides a clean monochrome SVG trigger, single unified panel, and radio semantics.
 */
export default function ModelSelectorMenu({ selectedModel, onSelectModel }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (modelId) => {
    onSelectModel(modelId);
    // Smoothly close popover after selection
    setIsOpen(false);
  };

  return (
    <div className="model-menu-container" ref={containerRef}>
      {/* Trigger Button with Professional SVG CPU Icon + Chevron */}
      <button
        type="button"
        className={`model-menu-trigger ${isOpen ? 'menu-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="AI Intelligence Model settings"
      >
        <span className="model-trigger-icon" aria-hidden="true">
          <IconCpu size={15} />
        </span>
        <span className="model-trigger-label">{activeModel.displayName}</span>
        <span className="model-chevron-icon" aria-hidden="true">
          <IconChevronDown size={13} />
        </span>
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div 
          className="model-popover-panel" 
          role="dialog" 
          aria-label="AI Intelligence Model Selection"
        >
          <div className="model-popover-header flex justify-between items-center">
            <span className="model-popover-title">AI Intelligence Model</span>
            <span className="model-popover-badge">Active</span>
          </div>

          <div className="model-popover-list flex-col gap-4">
            {MODELS.map((m) => {
              const isSelected = selectedModel === m.id;
              const isAvailable = m.available;

              return (
                <div
                  key={m.id}
                  className={`model-item-row flex items-center justify-between ${
                    isSelected ? 'item-selected' : ''
                  } ${!isAvailable ? 'item-disabled' : ''}`}
                  onClick={() => {
                    if (isAvailable) {
                      handleSelect(m.id);
                    }
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={!isAvailable}
                  tabIndex={isAvailable ? 0 : -1}
                  onKeyDown={(e) => {
                    if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSelect(m.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-10">
                    <span 
                      className={`model-radio-indicator ${isSelected ? 'radio-checked' : ''}`}
                      aria-hidden="true"
                    >
                      {isSelected && <span className="model-radio-dot" />}
                    </span>
                    <span className="model-name-text">
                      {m.displayName}
                    </span>
                  </div>

                  <span className={`model-tag-badge ${isAvailable ? 'tag-active' : 'tag-coming'}`}>
                    {isAvailable ? (m.description || 'Fast') : 'Coming later'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
