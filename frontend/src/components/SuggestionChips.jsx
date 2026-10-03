import React from 'react';

export default function SuggestionChips({ options, onSelect }) {
  return (
    <div className="suggestion-chips">
      {options.map(opt => (
        <button 
          key={opt} 
          type="button" 
          className="chip"
          onClick={() => onSelect(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
