import { IconAlert } from './Icons.jsx';

/**
 * Error display with optional retry button.
 */
export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-block" role="alert">
      <span className="error-icon"><IconAlert size={16} /></span>
      <div className="error-body">
        <p className="error-text">{message}</p>
        {onRetry && (
          <button className="btn btn-retry" onClick={onRetry}>Retry</button>
        )}
      </div>
    </div>
  );
}
