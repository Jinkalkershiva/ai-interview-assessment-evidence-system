import { useState, useMemo } from 'react';
import QuestionCard from '../components/QuestionCard.jsx';
import ExportActions from '../components/ExportActions.jsx';
import MermaidViewer from '../components/MermaidViewer.jsx';
import RetrievalEvaluationModal from '../components/RetrievalEvaluationModal.jsx';
import {
  IconArrowLeft,
  IconStar,
  IconBookOpen,
  IconAward,
  IconFileText,
  IconLayers,
  IconSliders,
} from '../components/Icons.jsx';

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

export default function ResultsPage({ data, onBack }) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SEC_A' | 'SEC_B' | 'SEC_C' | 'STUDY_GUIDE'
  const [starredIds, setStarredIds] = useState(new Set());
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);

  const toggleStar = (id) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const questions = useMemo(() => data.questions || [], [data.questions]);
  const topics = useMemo(() => data.topics || [], [data.topics]);

  const pattern = data.examPattern || {
    twoMarkCount: questions.filter((q) => q.marks === 2).length,
    fiveMarkCount: questions.filter((q) => q.marks === 5).length,
    eightMarkCount: questions.filter((q) => q.marks === 8).length,
  };

  const totalMarks =
    pattern.totalMarks ??
    ((pattern.twoMarkCount * 2) + (pattern.fiveMarkCount * 5) + (pattern.eightMarkCount * 8));

  // Partition questions by marks
  const secAQuestions = useMemo(() => questions.filter((q) => q.marks === 2), [questions]);
  const secBQuestions = useMemo(() => questions.filter((q) => q.marks === 5), [questions]);
  const secCQuestions = useMemo(() => questions.filter((q) => q.marks === 8), [questions]);

  const displayedQuestions = useMemo(() => {
    let list = questions;
    if (activeTab === 'SEC_A') list = secAQuestions;
    else if (activeTab === 'SEC_B') list = secBQuestions;
    else if (activeTab === 'SEC_C') list = secCQuestions;

    if (showStarredOnly) {
      list = list.filter((q) => starredIds.has(q.id));
    }
    return list;
  }, [activeTab, questions, secAQuestions, secBQuestions, secCQuestions, showStarredOnly, starredIds]);

  return (
    <main className="results-page">
      {/* Top Header Bar */}
      <div className="results-topbar">
        <button className="btn-back" onClick={onBack}>
          <IconArrowLeft size={15} />
          <span>Back to Upload</span>
        </button>

        <div className="results-title-group">
          <h2 className="results-docname" title={data.documentName}>
            {data.documentName}
          </h2>
          <div className="results-pattern-badge">
            <span className="pattern-badge-pill">{totalMarks} Total Marks</span>
            <span className="divider">·</span>
            <span>{questions.length} Questions</span>
            <span className="divider">·</span>
            <span className="pattern-distribution">
              {pattern.twoMarkCount} × 2M · {pattern.fiveMarkCount} × 5M · {pattern.eightMarkCount} × 8M
            </span>
          </div>
        </div>

        <div className="results-topbar-actions">
          {data.retrievalReport && (
            <button
              type="button"
              className="btn-inspect-rag"
              onClick={() => setShowEvalModal(true)}
              title="Inspect Hybrid BM25 & BGE-small RRF Scores"
            >
              <IconSliders size={14} />
              <span>Inspect RAG Retrieval</span>
            </button>
          )}
          <ExportActions docName={data.documentName} />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="results-tabs-wrapper">
        <div className="results-nav-tabs">
          <button
            className={`results-nav-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <IconLayers size={14} />
            <span>All Questions</span>
            <span className="tab-count-chip">{questions.length}</span>
          </button>

          <button
            className={`results-nav-btn ${activeTab === 'SEC_A' ? 'active' : ''}`}
            onClick={() => setActiveTab('SEC_A')}
          >
            <span>Section A (2M)</span>
            <span className="tab-count-chip">{secAQuestions.length}</span>
          </button>

          <button
            className={`results-nav-btn ${activeTab === 'SEC_B' ? 'active' : ''}`}
            onClick={() => setActiveTab('SEC_B')}
          >
            <span>Section B (5M)</span>
            <span className="tab-count-chip">{secBQuestions.length}</span>
          </button>

          <button
            className={`results-nav-btn ${activeTab === 'SEC_C' ? 'active' : ''}`}
            onClick={() => setActiveTab('SEC_C')}
          >
            <span>Section C (8M)</span>
            <span className="tab-count-chip">{secCQuestions.length}</span>
          </button>

          <button
            className={`results-nav-btn ${activeTab === 'STUDY_GUIDE' ? 'active' : ''}`}
            onClick={() => setActiveTab('STUDY_GUIDE')}
          >
            <IconBookOpen size={14} />
            <span>Study Guide & Diagrams</span>
            <span className="tab-count-chip">{topics.length}</span>
          </button>
        </div>

        {activeTab !== 'STUDY_GUIDE' && (
          <div className="results-filter-toggle">
            <button
              type="button"
              className={`filter-chip-btn ${!showStarredOnly ? 'active' : ''}`}
              onClick={() => setShowStarredOnly(false)}
            >
              All ({displayedQuestions.length})
            </button>
            <button
              type="button"
              className={`filter-chip-btn ${showStarredOnly ? 'active' : ''}`}
              onClick={() => setShowStarredOnly(true)}
            >
              <IconStar size={13} filled={showStarredOnly} />
              <span>Starred ({starredIds.size})</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Main Tab Content ── */}
      {activeTab !== 'STUDY_GUIDE' ? (
        <div className="results-tab-content">
          {displayedQuestions.length === 0 ? (
            <div className="empty-results-box">
              <IconFileText size={32} />
              <p>
                {showStarredOnly
                  ? 'No starred questions found in this view. Click the star icon on any question to bookmark it.'
                  : 'No questions available for this section.'}
              </p>
            </div>
          ) : activeTab === 'ALL' && !showStarredOnly ? (
            /* Render Grouped by Sections when Viewing All */
            <div className="sections-container">
              {/* Section A */}
              {secAQuestions.length > 0 && (
                <div className="exam-section-block">
                  <div className="section-header-banner banner-sec-a">
                    <div className="banner-left">
                      <span className="section-letter-tag">Section A</span>
                      <div className="banner-info">
                        <h3 className="banner-heading">Definitions & Short Answers</h3>
                        <p className="banner-sub">
                          2 Marks each · Concise answers grounded in source material ({secAQuestions.length} Questions = {secAQuestions.length * 2} Marks)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="question-list">
                    {secAQuestions.map((q) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        starred={starredIds.has(q.id)}
                        onToggleStar={toggleStar}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section B */}
              {secBQuestions.length > 0 && (
                <div className="exam-section-block">
                  <div className="section-header-banner banner-sec-b">
                    <div className="banner-left">
                      <span className="section-letter-tag">Section B</span>
                      <div className="banner-info">
                        <h3 className="banner-heading">Detailed Mechanisms & Comparisons</h3>
                        <p className="banner-sub">
                          5 Marks each · Structured technical explanations ({secBQuestions.length} Questions = {secBQuestions.length * 5} Marks)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="question-list">
                    {secBQuestions.map((q) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        starred={starredIds.has(q.id)}
                        onToggleStar={toggleStar}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section C */}
              {secCQuestions.length > 0 && (
                <div className="exam-section-block">
                  <div className="section-header-banner banner-sec-c">
                    <div className="banner-left">
                      <span className="section-letter-tag">Section C</span>
                      <div className="banner-info">
                        <h3 className="banner-heading">Architectural & Workflow Analysis</h3>
                        <p className="banner-sub">
                          8 Marks each · Comprehensive system design & workflow considerations ({secCQuestions.length} Questions = {secCQuestions.length * 8} Marks)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="question-list">
                    {secCQuestions.map((q) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        starred={starredIds.has(q.id)}
                        onToggleStar={toggleStar}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Filtered or single section list */
            <div className="question-list">
              {displayedQuestions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  starred={starredIds.has(q.id)}
                  onToggleStar={toggleStar}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Study Guide & Diagrams Tab ── */
        <div className="study-guide-container">
          {/* Executive Academic Summary */}
          {data.summary && (
            <div className="guide-summary-card">
              <div className="guide-summary-header">
                <IconAward size={18} />
                <h3>Curriculum & Revision Overview</h3>
              </div>
              <p className="guide-summary-body">{data.summary}</p>
            </div>
          )}

          {/* Topics Grid */}
          <div className="guide-topics-grid">
            {topics.map((t, idx) => (
              <div key={idx} className="topic-guide-card">
                <div className="topic-guide-header">
                  <div className="topic-title-area">
                    <span className="topic-index">Topic 0{idx + 1}</span>
                    <h4 className="topic-name">{t.name}</h4>
                  </div>
                  <StarRating rating={t.importanceRating || 5} />
                </div>

                {t.summary && <p className="topic-summary">{t.summary}</p>}

                {t.keyPoints?.length > 0 && (
                  <div className="topic-keypoints-box">
                    <span className="keypoints-title">Key Principles & Findings:</span>
                    <ul className="keypoints-list">
                      {t.keyPoints.map((kp, kIdx) => (
                        <li key={kIdx} className="keypoint-item">
                          <span className="bullet">›</span>
                          <span className="point-text">{kp.point}</span>
                          <span className="point-rating">({kp.importanceRating || 5}/5)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Structured Diagram with Mermaid Viewer */}
                {t.diagram && (
                  <MermaidViewer chart={t.diagram} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hybrid RAG Retrieval Inspection Modal */}
      <RetrievalEvaluationModal
        report={data.retrievalReport}
        isOpen={showEvalModal}
        onClose={() => setShowEvalModal(false)}
      />
    </main>
  );
}
