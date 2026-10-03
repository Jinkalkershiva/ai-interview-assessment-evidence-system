import { INTERVIEW_TYPES } from '../../config/interviewOptions.js';
import { IconLayers, IconBrain, IconUser, IconCode } from '../Icons.jsx';

const TYPE_ICONS = {
  Mixed: IconLayers,
  Technical: IconBrain,
  HR: IconUser,
  Coding: IconCode,
};

export default function InterviewTypeSelector({ value, onChange }) {
  return (
    <div className="interview-type-grid" role="radiogroup" aria-label="Interview Type">
      {INTERVIEW_TYPES.map((t) => {
        const isSelected = value === t.value;
        const IconComponent = TYPE_ICONS[t.id] || IconLayers;

        return (
          <label
            key={t.id}
            className={`interview-type-card ${isSelected ? 'active' : ''}`}
          >
            <input
              type="radio"
              name="interview_type"
              value={t.value}
              checked={isSelected}
              onChange={() => onChange(t.value)}
              className="sr-only"
            />
            <div className="flex items-center justify-between mb-8">
              <div className="interview-type-icon-box">
                <IconComponent size={18} />
              </div>
              {t.badge && (
                <span className="interview-type-badge">{t.badge}</span>
              )}
            </div>
            <div className="interview-type-title">{t.label}</div>
            <div className="interview-type-desc text-muted">{t.description}</div>
          </label>
        );
      })}
    </div>
  );
}
