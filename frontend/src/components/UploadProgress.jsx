/**
 * Loading state with animated progress bar and stage label.
 * No JS timers — CSS animation only.
 */
export default function UploadProgress({ stage }) {
  return (
    <div className="progress-wrap">
      <div className="progress-bar">
        <div className="progress-fill" />
      </div>
      <p className="progress-stage">{stage || 'Processing...'}</p>
    </div>
  );
}
