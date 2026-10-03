import { EXPERIENCE_LEVELS } from '../../config/interviewOptions.js';

export default function ExperienceLevelSelector({ value, onChange }) {
  return (
    <div className="experience-level-group" role="radiogroup" aria-label="Experience Level">
      {EXPERIENCE_LEVELS.map((lvl) => {
        const isSelected = value === lvl.value;
        return (
          <label
            key={lvl.id}
            className={`experience-level-card ${isSelected ? 'active' : ''}`}
          >
            <input
              type="radio"
              name="experience_level"
              value={lvl.value}
              checked={isSelected}
              onChange={() => onChange(lvl.value)}
              className="sr-only"
            />
            <div className="flex items-center justify-between w-full mb-4">
              <span className="experience-level-title">{lvl.label}</span>
              <span className="experience-level-badge">{lvl.badge}</span>
            </div>
            <span className="experience-level-desc text-muted">{lvl.description}</span>
          </label>
        );
      })}
    </div>
  );
}
