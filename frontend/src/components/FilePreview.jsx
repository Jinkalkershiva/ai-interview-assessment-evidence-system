import { IconFile, IconX } from './Icons.jsx';

function formatSize(bytes) {
  if (bytes < 1024)         return bytes + ' B';
  if (bytes < 1024 * 1024)  return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function truncateName(name, max = 36) {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  return name.slice(0, max - ext.length - 3) + '...' + ext;
}

/**
 * Displays selected file information with a remove button.
 */
export default function FilePreview({ file, onRemove }) {
  if (!file) return null;

  return (
    <div className="file-preview">
      <span className="file-preview-icon"><IconFile size={18} /></span>
      <div className="file-preview-info">
        <span className="file-preview-name" title={file.name}>{truncateName(file.name)}</span>
        <span className="file-preview-size">{formatSize(file.size)}</span>
      </div>
      <button type="button" className="file-preview-remove" onClick={onRemove} aria-label="Remove file" title="Remove">
        <IconX size={14} />
      </button>
    </div>
  );
}
