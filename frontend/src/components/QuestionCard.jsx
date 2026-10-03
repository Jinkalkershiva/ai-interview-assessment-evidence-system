import { useState } from 'react';
import { IconStar, IconChevronDown, IconChevronUp, IconFileText } from './Icons.jsx';

const TYPE_LABELS = {
  SHORT_ANSWER: 'Short Answer',
  LONG_ANSWER:  'Long Answer',
  CONCEPTUAL:   'Conceptual',
  DEFINITION:   'Definition',
  COMPARISON:   'Comparison',
  PROGRAMMING:  'Programming',
  MCQ:          'MCQ',
};

const DIFF_COLORS = {
  EASY:   'var(--success)',
  MEDIUM: 'var(--warning)',
  HARD:   'var(--danger)',
};

/**
 * StarRating component rendering professional SVG stars without emojis.
 */
function StarRating({ rating = 5 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="star-rating-row" title={`Importance Rating: ${rating}/5`}>
      <div className="star-icons">
        {stars.map((s) => (
          <IconStar key={s} size={13} filled={s <= rating} />
        ))}
      </div>
      <span className="rating-text">{rating}/5</span>
    </div>
  );
}

export default function QuestionCard({ question: q, starred, onToggleStar }) {
  const [open, setOpen] = useState(false);

  const typeLabel = TYPE_LABELS[q.type] || q.type || 'Question';
  const diffColor = DIFF_COLORS[q.difficulty] || 'var(--text-muted)';
  const marks = q.marks || 2;
  const rating = q.importanceRating || 5;

  const sectionLabel = q.section || (
    marks === 2 ? 'Section A — 2 Marks' :
    marks === 5 ? 'Section B — 5 Marks' :
    'Section C — 8 Marks'
  );

  const primaryEvidence = q.sourceEvidence?.[0];

  return (
    <div className={`q-card ${q.importance === 'HIGH' ? 'q-card-high' : ''} ${open ? 'q-card-expanded' : ''}`}>
      {/* Question Card Header (Summary View) */}
      <div className="q-card-header" onClick={() => setOpen((o) => !o)}>
        <div className="q-card-meta-top">
          <div className="q-card-badges">
            <span className={`badge badge-marks-tier badge-marks-${marks}`}>
              {marks} Marks
            </span>
            <span className="badge badge-subtle">{typeLabel}</span>
            <span className="badge badge-subtle" style={{ color: diffColor }}>
              {q.difficulty}
            </span>
            {primaryEvidence?.pageOrSection && (
              <span className="badge badge-source" title={`Grounded in ${primaryEvidence.document || 'Document'}`}>
                <IconFileText size={11} />
                <span>{primaryEvidence.pageOrSection}</span>
              </span>
            )}
          </div>

          <div className="q-card-rating-actions" onClick={(e) => e.stopPropagation()}>
            <StarRating rating={rating} />
            <button
              type="button"
              className={`star-btn ${starred ? 'star-btn-on' : ''}`}
              onClick={() => onToggleStar(q.id)}
              aria-label={starred ? 'Unstar question' : 'Star question'}
              title={starred ? 'Unstar question' : 'Star question'}
            >
              <IconStar size={15} filled={starred} />
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="q-card-question-row">
          <span className="q-num">Q{q.id}.</span>
          <p className="q-card-question">{q.question}</p>
        </div>

        {/* Bottom Bar: Topic & Toggle Button */}
        <div className="q-card-footer-bar">
          <span className="q-topic-tag">{q.topic || sectionLabel}</span>
          <button
            type="button"
            className="btn-toggle-details"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            <span>{open ? 'Hide Details' : 'View Details'}</span>
            {open ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Collapsible Details Drawer */}
      {open && (
        <div className="q-card-body">
          {/* Model Answer */}
          <div className="q-detail-section">
            <span className="detail-section-title">Model Answer</span>
            <div className="q-answer-box">
              <p className="q-answer">{q.answer}</p>
            </div>
          </div>

          {/* Grounded Source Evidence */}
          {q.sourceEvidence?.length > 0 && (
            <div className="q-detail-section">
              <span className="detail-section-title">Grounded Source Evidence</span>
              <div className="evidence-list">
                {q.sourceEvidence.map((ev, idx) => (
                  <div key={idx} className="evidence-card">
                    <div className="evidence-header">
                      <IconFileText size={13} />
                      <span className="evidence-doc">{ev.document || 'Uploaded Notes'}</span>
                      <span className="evidence-loc">{ev.pageOrSection || 'Source Reference'}</span>
                    </div>
                    {ev.snippet && (
                      <blockquote className="evidence-snippet">
                        "{ev.snippet}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {q.keywords?.length > 0 && (
            <div className="q-detail-section">
              <span className="detail-section-title">Key Terminology</span>
              <div className="q-keywords">
                {q.keywords.map((kw, i) => (
                  <span key={i} className="kw-chip">{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
