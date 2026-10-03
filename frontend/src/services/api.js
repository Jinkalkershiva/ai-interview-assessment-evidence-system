const BASE = 'http://localhost:8080/api';

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export const api = {
  /**
   * Check if the Spring Boot backend is reachable.
   * Returns true if healthy, false otherwise.
   */
  checkHealth: async () => {
    try {
      const res = await fetchWithTimeout(`${BASE}/health`, {}, 3000);
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Upload a file and get AI analysis.
   * @param {File} file
   * @returns {Promise<AnalysisResponse>}
   */
  analyzeDocument: async (file, examPattern = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (examPattern?.twoMarkCount !== undefined) {
      fd.append('twoMarkCount', examPattern.twoMarkCount);
    }
    if (examPattern?.fiveMarkCount !== undefined) {
      fd.append('fiveMarkCount', examPattern.fiveMarkCount);
    }
    if (examPattern?.eightMarkCount !== undefined) {
      fd.append('eightMarkCount', examPattern.eightMarkCount);
    }

    let res;
    try {
      res = await fetchWithTimeout(`${BASE}/exams/analyze`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      }, 60000);
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The file may be too large or the server is slow.');
      }
      throw new Error(
        'Unable to connect to the AI Exam Helper server. ' +
        'Make sure Spring Boot is running on port 8080.'
      );
    }

    const json = await res.json().catch(() => ({ error: 'Invalid server response.' }));

    if (!res.ok) {
      throw new Error(json.error || `Server error (${res.status})`);
    }

    // Handle ApiResponse<AnalysisResponse> wrapper
    return json.data ?? json;
  },

  /**
   * Download exported file (pdf, docx, txt).
   * @param {string} format
   * @returns {Promise<Blob>}
   */
  exportDocument: async (format) => {
    let res;
    try {
      res = await fetchWithTimeout(`${BASE}/exams/export/${format}`, {
        credentials: 'include',
      }, 30000);
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Export request timed out.');
      throw new Error('Unable to connect to the server for export.');
    }

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `Export failed (${res.status})`);
    }

    return res.blob();
  },

  // ─── Interview Coach APIs ────────────────────────────────────────────────
  
  startInterview: async (resumeFile, jobRole, interviewType, difficulty, questionCount, jobDescription) => {
    const fd = new FormData();
    if (resumeFile) fd.append('resume', resumeFile);
    fd.append('jobRole', jobRole);
    fd.append('interviewType', interviewType);
    fd.append('difficulty', difficulty);
    fd.append('questionCount', questionCount);
    if (jobDescription) fd.append('jobDescription', jobDescription);

    const res = await fetch(`${BASE}/interview/start`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to start interview');
    return json.data ?? json;
  },

  submitInterviewAnswer: async (interviewId, answerText) => {
    const res = await fetch(`${BASE}/interview/${interviewId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: answerText }),
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit answer');
    return json.data ?? json;
  },

  evaluateInterview: async (interviewId) => {
    // Evaluation might take a bit longer (e.g., 30s)
    const res = await fetchWithTimeout(`${BASE}/interview/${interviewId}/evaluate`, {
      method: 'POST',
      credentials: 'include',
    }, 60000);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to evaluate interview');
    return json.data ?? json;
  },

  startCodingInterview: async (resumeFile, jobRole, difficulty, focusTopics, problemCount, jobDescription) => {
    const fd = new FormData();
    if (resumeFile) fd.append('resume', resumeFile);
    fd.append('jobRole', jobRole || 'Software Engineer');
    fd.append('difficulty', difficulty || 'Intermediate');
    fd.append('focusTopics', focusTopics || 'Data Structures & Algorithms');
    fd.append('problemCount', problemCount || 1);
    if (jobDescription) fd.append('jobDescription', jobDescription);

    let res;
    try {
      res = await fetchWithTimeout(`${BASE}/interview/coding/start`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      }, 60000);
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Problem generation timed out.');
      throw new Error('Unable to connect to the interview server.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to generate coding problem');
    return json.data ?? json;
  },

  runCodingCode: async (interviewId, { language, sourceCode, problemId }) => {
    const res = await fetchWithTimeout(`${BASE}/interview/${interviewId}/coding/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, sourceCode, problemId }),
      credentials: 'include',
    }, 30000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to execute code');
    return json.data ?? json;
  },

  submitCodingSolution: async (interviewId, payload) => {
    const res = await fetchWithTimeout(`${BASE}/interview/${interviewId}/coding/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    }, 60000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to submit solution');
    return json.data ?? json;
  },

  getCodingInterviewState: async (interviewId) => {
    const res = await fetchWithTimeout(`${BASE}/interview/${interviewId}/coding/state`, {
      method: 'GET',
      credentials: 'include',
    }, 15000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to retrieve coding session state');
    return json.data ?? json;
  },

  // ─── Work Update Room APIs ──────────────────────────────────────────────
  
  createWorkUpdateRoom: async (payload) => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    }, 15000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to create work update room');
    return json.data ?? json;
  },

  listWorkUpdateRooms: async () => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms`, {
      method: 'GET',
      credentials: 'include',
    }, 10000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to list work update rooms');
    return json.data ?? json;
  },

  getWorkUpdateRoom: async (roomId, token) => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms/${roomId}${token ? `?token=${encodeURIComponent(token)}` : ''}`, {
      method: 'GET',
      headers: token ? { 'X-Auth-Token': token } : {},
      credentials: 'include',
    }, 10000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to retrieve work update room');
    return json.data ?? json;
  },

  startWorkUpdateSession: async (roomId, token) => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms/${roomId}/start`, {
      method: 'POST',
      headers: { 'X-Auth-Token': token },
      credentials: 'include',
    }, 10000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to start session');
    return json.data ?? json;
  },

  pauseWorkUpdateSession: async (roomId, token) => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms/${roomId}/pause`, {
      method: 'POST',
      headers: { 'X-Auth-Token': token },
      credentials: 'include',
    }, 10000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to pause session');
    return json.data ?? json;
  },

  logWorkUpdateTranscript: async (roomId, token, { text, category }) => {
    await fetch(`${BASE}/work-update/rooms/${roomId}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({ text, category }),
      credentials: 'include',
    }).catch(() => {});
  },

  analyzeWorkUpdateFrame: async (roomId, token, { imageBase64, participantNote, currentTranscript }) => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms/${roomId}/frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({ imageBase64, participantNote, currentTranscript }),
      credentials: 'include',
    }, 20000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to analyze screen frame');
    return json.data ?? json;
  },

  answerWorkUpdateQuestion: async (roomId, token, { questionId, answer }) => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms/${roomId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({ questionId, answer }),
      credentials: 'include',
    }, 10000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to submit answer');
    return json.data ?? json;
  },

  completeWorkUpdateSession: async (roomId, token) => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms/${roomId}/complete`, {
      method: 'POST',
      headers: { 'X-Auth-Token': token },
      credentials: 'include',
    }, 45000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to complete session and generate report');
    return json.data ?? json;
  },

  updateWorkUpdateReview: async (roomId, token, payload) => {
    const res = await fetchWithTimeout(`${BASE}/work-update/rooms/${roomId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    }, 15000);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to update review');
    return json.data ?? json;
  },

  downloadWorkUpdatePdf: async (roomId, token) => {
    const url = `${BASE}/work-update/rooms/${roomId}/export/pdf?token=${encodeURIComponent(token)}`;
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      credentials: 'include',
    }, 30000);
    if (!res.ok) throw new Error('Failed to download PDF report');
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `work-update-${roomId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
