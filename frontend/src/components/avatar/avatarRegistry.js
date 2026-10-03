/**
 * Data-driven registry of interview avatars.
 * Modular and extensible to allow adding new characters easily.
 * NOTE: All animal and robot characters are 100% ORIGINAL designs
 * inspired only by general concepts (talking animated animals/robots)
 * with no copyrighted or trademarked elements.
 */

export const AVATAR_REGISTRY = [
  {
    id: 'none',
    name: 'Audio Only',
    type: 'none',
    title: 'Minimal Voice Mode',
    description: 'Clean text and voice synthesis without an animated visual avatar.',
    themeColor: 'var(--text-muted)',
    voiceConfig: { pitch: 1.0, rate: 0.95 },
    enabled: true
  },
  {
    id: 'human',
    name: 'Elena Vance',
    type: 'human',
    title: 'Lead Technical Interviewer',
    description: 'Professional enterprise software interviewer with a calm, analytical demeanor.',
    themeColor: '#3b5bdb',
    voiceConfig: { pitch: 1.0, rate: 0.95 },
    enabled: true
  },
  {
    id: 'mouse',
    name: 'Milo the Mouse',
    type: 'mouse',
    title: 'Junior Mentor & Algorithmist',
    description: 'Original animated scholarly mouse wearing round spectacles, encouraging and detail-oriented.',
    themeColor: '#d97706',
    voiceConfig: { pitch: 1.15, rate: 0.98 },
    enabled: true
  },
  {
    id: 'cat',
    name: 'Jasper the Cat',
    type: 'cat',
    title: 'Senior Systems Architect',
    description: 'Original animated feline engineer with sharp ears, sleek posture, and observant gaze.',
    themeColor: '#059669',
    voiceConfig: { pitch: 0.95, rate: 0.95 },
    enabled: true
  },
  {
    id: 'robot',
    name: 'Nexus-7',
    type: 'robot',
    title: 'Autonomous AI Evaluator',
    description: 'Original sleek robotic interface featuring glowing optical sensors and acoustic feedback.',
    themeColor: '#0284c7',
    voiceConfig: { pitch: 0.88, rate: 1.0 },
    enabled: true
  }
];

export function getAvatarById(id) {
  return AVATAR_REGISTRY.find(a => a.id === id) || AVATAR_REGISTRY[1]; // default to Elena
}
