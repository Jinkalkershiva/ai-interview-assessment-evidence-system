import React from 'react';
import { MODELS } from '../config/models.ts';

/**
 * Unified AI Intelligence Model selection panel.
 * Uses single unified container with radio selection semantics.
 */
export default function ModelPicker({ value, onChange }) {
  return (
    <div className="model-unified-picker flex-col gap-4">
      {MODELS.map((m) => {
        const isSelected = value === m.id;
        const isAvailable = m.available;

        return (
          <div
            key={m.id}
            className={`model-item-row flex items-center justify-between ${
              isSelected ? 'item-selected' : ''
            } ${!isAvailable ? 'item-disabled' : ''}`}
            onClick={() => isAvailable && onChange(m.id)}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={!isAvailable}
            tabIndex={isAvailable ? 0 : -1}
            onKeyDown={(e) => {
              if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onChange(m.id);
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
              <span className="model-name-text">{m.displayName}</span>
            </div>

            <span className={`model-tag-badge ${isAvailable ? 'tag-active' : 'tag-coming'}`}>
              {isAvailable ? (m.description || 'Fast') : 'Coming later'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
