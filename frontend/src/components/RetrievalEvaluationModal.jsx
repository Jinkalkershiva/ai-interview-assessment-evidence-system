import { IconSliders, IconX, IconFileText, IconCheck } from './Icons.jsx';

/**
 * Inspection drawer/modal for Hybrid RAG Retrieval Evaluation.
 * Allows developers and evaluators to inspect BM25, Semantic, and Hybrid RRF scores.
 */
export default function RetrievalEvaluationModal({ report, isOpen, onClose }) {
  if (!isOpen || !report) return null;

  const evidence = report.topRankedEvidence || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="retrieval-eval-modal" onClick={(e) => e.stopPropagation()}>
        <div className="eval-modal-header">
          <div className="eval-modal-title-group">
            <IconSliders size={18} />
            <h3>Hybrid RAG Retrieval Evaluation & Scoring</h3>
          </div>
          <button type="button" className="appearance-close-btn" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        {/* High-level stats */}
        <div className="eval-stats-grid">
          <div className="eval-stat-card">
            <span className="eval-stat-label">Embedding Model</span>
            <span className="eval-stat-val text-accent">{report.embeddingModel || 'BAAI/bge-small-en-v1.5'}</span>
          </div>
          <div className="eval-stat-card">
            <span className="eval-stat-label">Fusion Strategy</span>
            <span className="eval-stat-val">Reciprocal Rank Fusion (k=60)</span>
          </div>
          <div className="eval-stat-card">
            <span className="eval-stat-label">Indexed Chunks</span>
            <span className="eval-stat-val">{report.totalIndexedChunks}</span>
          </div>
          <div className="eval-stat-card">
            <span className="eval-stat-label">Evidence to LLM</span>
            <span className="eval-stat-val">{report.topKEvidencePassedToLlm} Chunks</span>
          </div>
        </div>

        {/* Evidence Scoring Table */}
        <div className="eval-table-container">
          <table className="eval-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Source Loc</th>
                <th>BM25 Score</th>
                <th>Semantic Score</th>
                <th>Hybrid RRF</th>
                <th>Grounded Evidence Snippet</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((ev) => (
                <tr key={ev.chunkId}>
                  <td className="rank-cell">#{ev.finalRank}</td>
                  <td className="loc-cell">
                    <span className="badge badge-source">{ev.pageOrSection}</span>
                  </td>
                  <td>
                    <div className="score-with-rank">
                      <span className="score-val">{ev.bm25Score}</span>
                      <span className="rank-badge">r#{ev.bm25Rank}</span>
                    </div>
                  </td>
                  <td>
                    <div className="score-with-rank">
                      <span className="score-val">{ev.semanticScore}</span>
                      <span className="rank-badge">r#{ev.semanticRank}</span>
                    </div>
                  </td>
                  <td className="rrf-cell font-mono">{ev.hybridRrfScore}</td>
                  <td className="snippet-cell">
                    <p className="snippet-text">"{ev.snippet}"</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="eval-modal-footer">
          <span className="eval-footer-note">
            Dense vectors: 384 dimensions · Dual independent candidate retrieval · Deduplicated & ranked
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
