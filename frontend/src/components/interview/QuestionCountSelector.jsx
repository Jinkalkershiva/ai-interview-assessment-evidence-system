import { QUESTION_COUNTS, CODING_PROBLEM_COUNTS } from '../../config/interviewOptions.js';

export default function QuestionCountSelector({ 
  value, 
  onChange, 
  isCoding = false 
}) {
  const options = isCoding ? CODING_PROBLEM_COUNTS : QUESTION_COUNTS;

  return (
    <div className="question-count-group" role="radiogroup" aria-label="Question Count">
      {options.map((opt) => {
        const isSelected = String(value) === String(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            className={`question-count-pill ${isSelected ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={isSelected}
          >
            <span className="question-count-val">{opt.label}</span>
            {opt.duration && (
              <span className="question-count-duration">{opt.duration}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
