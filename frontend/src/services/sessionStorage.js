/**
 * Storage utility for active coding session persistence using localStorage.
 */

const ACTIVE_SESSION_KEY = 'coding_active_session';
const DRAFT_PREFIX = 'coding_draft_';

const storage = {
  get: async (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set: async (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage quota or permission issue
    }
  },

  remove: async (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
};

/**
 * Retrieve the active coding session marker.
 * Returns { interviewId, problemId, language, hintsRevealed } or null.
 */
export async function getActiveCodingSession() {
  return await storage.get(ACTIVE_SESSION_KEY);
}

/**
 * Save or update the active coding session marker.
 */
export async function saveActiveCodingSession(sessionData) {
  if (!sessionData || !sessionData.interviewId) return;
  const minimalData = {
    interviewId: sessionData.interviewId,
    problemId: sessionData.problemId || null,
    language: sessionData.language || 'java',
    hintsRevealed: sessionData.hintsRevealed || 0,
    updatedAt: Date.now()
  };
  await storage.set(ACTIVE_SESSION_KEY, minimalData);
}

/**
 * Clear the active coding session marker upon completion or abandonment.
 */
export async function clearActiveCodingSession() {
  await storage.remove(ACTIVE_SESSION_KEY);
}

/**
 * Save draft candidate code and approach for a specific interview & problem.
 */
export async function saveCodingDraft(interviewId, problemId, draftData) {
  if (!interviewId || !problemId) return;
  const key = `${DRAFT_PREFIX}${interviewId}_${problemId}`;
  await storage.set(key, {
    code: draftData.code || '',
    approach: draftData.approach || '',
    language: draftData.language || 'java',
    updatedAt: Date.now()
  });
}

/**
 * Get draft code and approach for a specific interview & problem.
 */
export async function getCodingDraft(interviewId, problemId) {
  if (!interviewId || !problemId) return null;
  const key = `${DRAFT_PREFIX}${interviewId}_${problemId}`;
  return await storage.get(key);
}

/**
 * Clear draft code and approach for a specific problem once submitted.
 */
export async function clearCodingDraft(interviewId, problemId) {
  if (!interviewId || !problemId) return;
  const key = `${DRAFT_PREFIX}${interviewId}_${problemId}`;
  await storage.remove(key);
}
