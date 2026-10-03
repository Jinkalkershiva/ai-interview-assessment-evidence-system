import React from 'react';
import '../styles/globals.css';

export default function SegmentedControl({ options, value, onChange, ariaLabelledBy }) {
  return (
    <div className="segmented-control" role="radiogroup" aria-labelledby={ariaLabelledBy}>
      {options.map((opt) => (
        <label 
          key={opt.value} 
          className={`segment-label ${value === opt.value ? 'active' : ''}`}
        >
          <input
            type="radio"
            name={ariaLabelledBy || 'segmented'}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
