import { useState } from 'react';
import { api } from '../services/api.js';
import { IconDownload, IconCheck } from './Icons.jsx';

const FORMATS = [
  { id: 'pdf',  label: 'PDF' },
  { id: 'docx', label: 'Word' },
  { id: 'txt',  label: 'Text' },
];

/**
 * Export buttons — PDF, Word, Text.
 * Uses api.exportDocument to stream the blob and trigger download.
 */
export default function ExportActions({ docName }) {
  const [states, setStates] = useState({}); // { pdf: 'idle'|'loading'|'done'|'error' }

  const handleExport = async (fmt) => {
    setStates(s => ({ ...s, [fmt]: 'loading' }));
    try {
      const blob = await api.exportDocument(fmt);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const name = (docName || 'Study_Guide').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.href     = url;
      a.download = `${name}_01.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      setStates(s => ({ ...s, [fmt]: 'done' }));
      setTimeout(() => setStates(s => ({ ...s, [fmt]: 'idle' })), 2500);
    } catch (err) {
      setStates(s => ({ ...s, [fmt]: 'error' }));
      setTimeout(() => setStates(s => ({ ...s, [fmt]: 'idle' })), 3000);
    }
  };

  return (
    <div className="export-actions">
      <p className="export-label">Export study guide</p>
      <div className="export-btns">
        {FORMATS.map(({ id, label }) => {
          const st = states[id] || 'idle';
          return (
            <button
              key={id}
              className={`btn btn-export ${st === 'error' ? 'btn-error' : ''}`}
              onClick={() => handleExport(id)}
              disabled={st === 'loading'}
              title={st === 'error' ? 'Export failed' : `Export as ${label}`}
            >
              {st === 'loading' ? '...' : st === 'done' ? <IconCheck size={14} /> : (
                <><IconDownload size={14} /> {label}</>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
