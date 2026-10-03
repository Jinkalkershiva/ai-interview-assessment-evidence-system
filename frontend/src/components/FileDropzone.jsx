import { useRef, useState } from 'react';
import { IconUpload } from './Icons.jsx';

const ACCEPTED = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
const ACCEPT_STR = ACCEPTED.join(',');

/**
 * Drag-and-drop file selection zone.
 * Calls onFileSelect(File) when a valid file is chosen.
 */
export default function FileDropzone({ onFileSelect, disabled, accept }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const acceptedTypes = accept ? accept.split(',').map(type => type.trim().toLowerCase()) : ACCEPTED;
  const acceptedValue = acceptedTypes.join(',');

  const validate = (file) => {
    if (!file) return null;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!acceptedTypes.includes(ext)) return null;
    return file;
  };

  const handle = (file) => {
    const valid = validate(file);
    if (valid) onFileSelect(valid);
  };

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone-over' : ''} ${disabled ? 'dropzone-disabled' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handle(e.dataTransfer.files[0]); }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      aria-label="Drop file here or click to select"
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedValue || ACCEPT_STR}
        hidden
        onChange={(e) => { handle(e.target.files[0]); e.target.value = ''; }}
      />
      <div className="dropzone-icon"><IconUpload size={28} /></div>
      <p className="dropzone-label">Drop file here or <span className="link">browse</span></p>
      <p className="dropzone-hint">{acceptedTypes.map(type => type.slice(1).toUpperCase()).join(' · ')}</p>
    </div>
  );
}
