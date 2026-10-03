import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { searchJobRoles } from '../../config/interviewOptions.js';
import { IconSearch, IconX, IconCheck, IconPlus } from '../Icons.jsx';

/**
 * RoleSelector — Production-quality Combobox for Target Job Role.
 *
 * Rules:
 * - Empty query = NO suggestions, NO catalog, NO dropdown.
 * - Suggestions appear only when the user types (case-insensitive fuzzy/keyword search).
 * - Compact dropdown with 6-8 max items and keyboard navigation (Up/Down/Enter/Escape).
 * - Multi-select supported: selecting a role adds it to the selected chips, clears the input,
 *   and closes the dropdown so the user can search for another role immediately.
 * - Click outside or Escape closes the dropdown.
 */
export default function RoleSelector({ 
  selectedRoles = [], 
  onChange, 
  isMulti = true,
  placeholder = "Search job roles (e.g. Java, Cloud, Data, Sales)..."
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [displayLimit, setDisplayLimit] = useState(6);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize selectedRoles to array
  const currentSelected = useMemo(() => {
    if (!selectedRoles) return [];
    if (Array.isArray(selectedRoles)) return selectedRoles;
    return selectedRoles.split(',').map(s => s.trim()).filter(Boolean);
  }, [selectedRoles]);

  // Compute filtered search results only when query is non-empty
  const searchResults = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    return searchJobRoles(trimmed, displayLimit + 1);
  }, [searchQuery, displayLimit]);

  const hasMoreResults = searchResults.length > displayLimit;
  const visibleResults = useMemo(() => {
    return searchResults.slice(0, displayLimit);
  }, [searchResults, displayLimit]);

  // Check if typed query exactly matches any result label
  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return visibleResults.some(r => r.label.toLowerCase() === q);
  }, [searchQuery, visibleResults]);

  // Total selectable items (results + optional custom role entry)
  const showCustomOption = searchQuery.trim().length > 0 && !exactMatchExists;
  const totalItems = visibleResults.length + (showCustomOption ? 1 : 0);

  // Open dropdown only when query is non-empty and there are results or custom option
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsOpen(true);
      setHighlightedIndex(0); // auto-highlight first match for instant Enter key
    } else {
      setIsOpen(false);
      setHighlightedIndex(-1);
      setDisplayLimit(6);
    }
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure highlighted item stays in view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const activeElement = listRef.current.children[highlightedIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Select a role
  const handleSelectRole = useCallback((roleLabel) => {
    if (!roleLabel) return;

    if (!isMulti) {
      onChange([roleLabel]);
    } else {
      if (!currentSelected.includes(roleLabel)) {
        onChange([...currentSelected, roleLabel]);
      }
    }

    // Reset search query and close dropdown
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    setDisplayLimit(6);
    inputRef.current?.focus();
  }, [currentSelected, isMulti, onChange]);

  // Remove a selected role chip
  const handleRemoveRole = useCallback((roleLabel, e) => {
    if (e) e.stopPropagation();
    onChange(currentSelected.filter(r => r !== roleLabel));
  }, [currentSelected, onChange]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || totalItems === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const custom = searchQuery.trim();
        if (custom) {
          handleSelectRole(custom);
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % totalItems);
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < visibleResults.length) {
          handleSelectRole(visibleResults[highlightedIndex].label);
        } else if (showCustomOption && highlightedIndex === visibleResults.length) {
          handleSelectRole(searchQuery.trim());
        } else if (visibleResults.length > 0) {
          handleSelectRole(visibleResults[0].label);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      default:
        break;
    }
  };

  return (
    <div className="role-selector-container" ref={containerRef}>
      {/* ── SELECTED ROLES (COMPACT CHIPS) ── */}
      {currentSelected.length > 0 && (
        <div className="role-selected-chips-row flex items-center gap-8 flex-wrap mb-8">
          <span className="role-selected-label text-muted">
            Selected:
          </span>
          {currentSelected.map((role) => (
            <span key={role} className="role-chip-tag flex items-center gap-6">
              <span>{role}</span>
              <button
                type="button"
                className="role-chip-remove"
                onClick={(e) => handleRemoveRole(role, e)}
                aria-label={`Remove ${role}`}
                title={`Remove ${role}`}
              >
                <IconX size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── SEARCH INPUT ── */}
      <div className={`role-input-box flex items-center gap-10 ${isOpen ? 'focused' : ''}`}>
        <span className="role-input-icon text-muted" aria-hidden="true">
          <IconSearch size={16} />
        </span>
        <input
          ref={inputRef}
          type="text"
          className="role-search-input"
          placeholder={currentSelected.length === 0 ? placeholder : "Search and add another role (e.g. Cloud, Data)..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="role-results-list"
          aria-label="Target Job Role search"
          autoComplete="off"
        />
        {searchQuery && (
          <button 
            type="button" 
            className="btn-ghost" 
            style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}
            onClick={(e) => {
              e.stopPropagation();
              setSearchQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            title="Clear search query"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── DROPDOWN RESULTS (RENDERED ONLY WHEN SEARCH QUERY IS NON-EMPTY) ── */}
      {isOpen && searchQuery.trim().length > 0 && (
        <div 
          className="role-dropdown-popover" 
          id="role-results-list"
          role="listbox"
        >
          <div className="role-list-scroll" ref={listRef}>
            {visibleResults.length === 0 && !showCustomOption ? (
              <div className="role-list-empty text-muted text-center py-16" style={{ fontSize: '13px' }}>
                No matching roles found for "{searchQuery.trim()}".
              </div>
            ) : (
              <>
                {visibleResults.map((r, index) => {
                  const isHighlighted = highlightedIndex === index;
                  const isAlreadySelected = currentSelected.includes(r.label);

                  return (
                    <div
                      key={r.id || r.label}
                      role="option"
                      aria-selected={isHighlighted}
                      className={`role-item-row flex items-center justify-between ${
                        isHighlighted ? 'highlighted' : ''
                      } ${isAlreadySelected ? 'already-selected' : ''}`}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => handleSelectRole(r.label)}
                    >
                      <div className="flex items-center gap-8">
                        {isAlreadySelected ? (
                          <span className="role-item-check text-muted" title="Already selected">
                            <IconCheck size={14} />
                          </span>
                        ) : (
                          <span className="role-item-bullet text-muted" aria-hidden="true">•</span>
                        )}
                        <span className="role-item-name">{r.label}</span>
                      </div>

                      <span className="role-category-badge">
                        {r.category}
                      </span>
                    </div>
                  );
                })}

                {/* Optional Custom Role Entry */}
                {showCustomOption && (
                  <div
                    role="option"
                    aria-selected={highlightedIndex === visibleResults.length}
                    className={`role-custom-add-item flex items-center justify-between ${
                      highlightedIndex === visibleResults.length ? 'highlighted' : ''
                    }`}
                    onMouseEnter={() => setHighlightedIndex(visibleResults.length)}
                    onClick={() => handleSelectRole(searchQuery.trim())}
                  >
                    <div className="flex items-center gap-8">
                      <IconPlus size={14} />
                      <span>Use custom role: <strong>"{searchQuery.trim()}"</strong></span>
                    </div>
                    <span className="role-category-badge">Custom</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* If there are more matching results, provide a compact View More link */}
          {hasMoreResults && (
            <div className="role-results-footer flex items-center justify-between">
              <span className="text-muted" style={{ fontSize: '11.5px' }}>
                Showing top {displayLimit} results
              </span>
              <button
                type="button"
                className="role-view-more-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDisplayLimit(prev => prev + 6);
                }}
              >
                View more results
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
