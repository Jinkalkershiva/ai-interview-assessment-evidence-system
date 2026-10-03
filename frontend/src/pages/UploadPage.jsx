import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import FileDropzone from '../components/FileDropzone.jsx';
import FilePreview from '../components/FilePreview.jsx';
import UploadProgress from '../components/UploadProgress.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { IconSliders, IconPlus, IconMinus, IconBrain } from '../components/Icons.jsx';

const STAGES = [
  'Extracting document pages & slides...',
  'Indexing content into semantic chunks...',
  'Retrieving core concepts & source evidence...',
  'Formulating 2, 5 & 8-mark exam questions...',
  'Synthesizing grounded study guide...',
];

const PRESETS = [
  { name: 'Standard Exam', two: 10, five: 5, eight: 3, label: '10 × 2M · 5 × 5M · 3 × 8M' },
  { name: 'Quick Test', two: 5, five: 2, eight: 1, label: '5 × 2M · 2 × 5M · 1 × 8M' },
  { name: 'Comprehensive', two: 15, five: 8, eight: 4, label: '15 × 2M · 8 × 5M · 4 × 8M' },
];

export default function UploadPage({ onAnalyzed }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const stageRef = useRef(null);

  // Exam Pattern State
  const [twoMarkCount, setTwoMarkCount] = useState(10);
  const [fiveMarkCount, setFiveMarkCount] = useState(5);
  const [eightMarkCount, setEightMarkCount] = useState(3);

  const totalQuestions = twoMarkCount + fiveMarkCount + eightMarkCount;
  const totalMarks = (twoMarkCount * 2) + (fiveMarkCount * 5) + (eightMarkCount * 8);

  useEffect(() => {
    if (loading) {
      let i = 0;
      setStage(STAGES[0]);
      stageRef.current = setInterval(() => {
        i = Math.min(i + 1, STAGES.length - 1);
        setStage(STAGES[i]);
      }, 2200);
    } else {
      clearInterval(stageRef.current);
      setStage('');
    }
    return () => clearInterval(stageRef.current);
  }, [loading]);

  const handleFile = (f) => {
    setFile(f);
    setError('');
  };

  const handleRemove = () => {
    setFile(null);
    setError('');
  };

  const applyPreset = (preset) => {
    setTwoMarkCount(preset.two);
    setFiveMarkCount(preset.five);
    setEightMarkCount(preset.eight);
  };

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const pattern = {
        twoMarkCount,
        fiveMarkCount,
        eightMarkCount,
      };
      const result = await api.analyzeDocument(file, pattern);
      onAnalyzed(result);
    } catch (err) {
      setError(err.message || 'Exam paper generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="upload-page">
      <div className="upload-intro">
        <h2 className="upload-heading">Turn your study material into an AI-generated exam paper</h2>
        <p className="upload-sub">
          Upload your notes, slides, or documents. Choose the marks distribution and let AI generate questions grounded in your study material.
        </p>
      </div>

      {loading ? (
        <UploadProgress stage={stage} />
      ) : (
        <div className="upload-workflow-container">
          {/* File Upload Zone */}
          {!file ? (
            <FileDropzone onFileSelect={handleFile} disabled={loading} />
          ) : (
            <FilePreview file={file} onRemove={handleRemove} />
          )}

          <div className="supported-formats-line">
            <span>Supported:</span>
            <span className="formats-text">PDF · DOC · DOCX · PPT · PPTX · TXT</span>
          </div>

          {/* Exam Pattern Configuration */}
          <div className="exam-pattern-card">
            <div className="pattern-header">
              <div className="pattern-header-title">
                <IconSliders size={18} />
                <span>Exam Pattern & Marks Distribution</span>
              </div>
              <div className="pattern-totals-badge">
                <span>{totalQuestions} Questions</span>
                <span className="divider">·</span>
                <span className="marks-highlight">{totalMarks} Marks</span>
              </div>
            </div>

            {/* Presets */}
            <div className="pattern-presets">
              <span className="preset-label">Quick Presets:</span>
              <div className="preset-buttons">
                {PRESETS.map((p) => {
                  const isActive =
                    twoMarkCount === p.two &&
                    fiveMarkCount === p.five &&
                    eightMarkCount === p.eight;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      className={`preset-btn ${isActive ? 'active' : ''}`}
                      onClick={() => applyPreset(p)}
                    >
                      {p.name} ({p.label})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stepper Grid */}
            <div className="pattern-grid">
              {/* 2-Mark */}
              <div className="pattern-column">
                <div className="pattern-col-header">
                  <span className="section-tag section-tag-a">Section A</span>
                  <span className="marks-badge">2 Marks</span>
                </div>
                <div className="pattern-col-desc">Definitions, short answers & facts</div>
                <div className="stepper-control">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setTwoMarkCount((c) => Math.max(1, c - 1))}
                    disabled={twoMarkCount <= 1}
                    aria-label="Decrease 2-mark questions"
                  >
                    <IconMinus size={14} />
                  </button>
                  <span className="stepper-value">{twoMarkCount}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setTwoMarkCount((c) => Math.min(30, c + 1))}
                    disabled={twoMarkCount >= 30}
                    aria-label="Increase 2-mark questions"
                  >
                    <IconPlus size={14} />
                  </button>
                </div>
                <div className="pattern-col-subtotal">{twoMarkCount * 2} Marks</div>
              </div>

              {/* 5-Mark */}
              <div className="pattern-column">
                <div className="pattern-col-header">
                  <span className="section-tag section-tag-b">Section B</span>
                  <span className="marks-badge">5 Marks</span>
                </div>
                <div className="pattern-col-desc">Structured comparisons & mechanisms</div>
                <div className="stepper-control">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setFiveMarkCount((c) => Math.max(0, c - 1))}
                    disabled={fiveMarkCount <= 0}
                    aria-label="Decrease 5-mark questions"
                  >
                    <IconMinus size={14} />
                  </button>
                  <span className="stepper-value">{fiveMarkCount}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setFiveMarkCount((c) => Math.min(20, c + 1))}
                    disabled={fiveMarkCount >= 20}
                    aria-label="Increase 5-mark questions"
                  >
                    <IconPlus size={14} />
                  </button>
                </div>
                <div className="pattern-col-subtotal">{fiveMarkCount * 5} Marks</div>
              </div>

              {/* 8-Mark */}
              <div className="pattern-column">
                <div className="pattern-col-header">
                  <span className="section-tag section-tag-c">Section C</span>
                  <span className="marks-badge">8 Marks</span>
                </div>
                <div className="pattern-col-desc">Deep architecture & workflow analysis</div>
                <div className="stepper-control">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setEightMarkCount((c) => Math.max(0, c - 1))}
                    disabled={eightMarkCount <= 0}
                    aria-label="Decrease 8-mark questions"
                  >
                    <IconMinus size={14} />
                  </button>
                  <span className="stepper-value">{eightMarkCount}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => setEightMarkCount((c) => Math.min(10, c + 1))}
                    disabled={eightMarkCount >= 10}
                    aria-label="Increase 8-mark questions"
                  >
                    <IconPlus size={14} />
                  </button>
                </div>
                <div className="pattern-col-subtotal">{eightMarkCount * 8} Marks</div>
              </div>
            </div>
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={file ? handleGenerate : undefined}
            />
          )}

          {/* Primary Action */}
          <button
            className="btn btn-primary btn-full generate-paper-btn"
            onClick={handleGenerate}
            disabled={!file || loading || totalQuestions === 0}
          >
            <IconBrain size={18} />
            <span>Generate Exam Paper</span>
          </button>
        </div>
      )}
    </main>
  );
}
