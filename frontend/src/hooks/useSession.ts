import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
const API = `${API_BASE_URL}/api`;

export interface SessionData {
  session: any;
  documents: any[];
  questions: any[];
  answers: any[];
  finalChecks: any[];
  chunks: any[];
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);

  useEffect(() => {
    // Check URL for session parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('session');
    const mode = urlParams.get('mode');

    if (urlSessionId) {
      setSessionId(urlSessionId);
      setIsSpectator(mode === 'view');
      loadSession(urlSessionId);
    } else {
      // Check localStorage
      const storedSessionId = localStorage.getItem('current_session_id');
      if (storedSessionId) {
        setSessionId(storedSessionId);
        loadSession(storedSessionId);
      } else {
        // Create new session
        createNewSession();
      }
    }
  }, []);

  const createNewSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Session sans titre' })
      });
      const data = await response.json();
      setSessionId(data.sessionId);
      localStorage.setItem('current_session_id', data.sessionId);
      loadSession(data.sessionId);
    } catch (err) {
      setError('Erreur lors de la création de session');
      setLoading(false);
    }
  };

  const loadSession = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/sessions/${id}`);
      const data = await response.json();
      setSessionData(data);
      setLoading(false);
    } catch (err) {
      setError('Erreur lors du chargement de session');
      setLoading(false);
    }
  };

  const uploadExercise = async (file: File) => {
    if (!sessionId) return;
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/sessions/${sessionId}/upload-exercise`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      await loadSession(sessionId);
      return data;
    } catch (err) {
      setError('Erreur lors de l\'upload de l\'exercice');
      throw err;
    }
  };

  const uploadLaws = async (file: File) => {
    if (!sessionId) return;
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/sessions/${sessionId}/upload-laws`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      await loadSession(sessionId);
      return data;
    } catch (err) {
      setError('Erreur lors de l\'upload du document de lois');
      throw err;
    }
  };

  const generateAllAnswers = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API}/sessions/${sessionId}/generate-all-answers`, {
        method: 'POST'
      });
      const data = await response.json();
      await loadSession(sessionId);
      setLoading(false);
      return data;
    } catch (err) {
      setError('Erreur lors de la génération des réponses');
      setLoading(false);
      throw err;
    }
  };

  const generateAnswer = async (questionId: string) => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API}/sessions/${sessionId}/questions/${questionId}/generate`, {
        method: 'POST'
      });
      const data = await response.json();
      await loadSession(sessionId);
      setLoading(false);
      return data;
    } catch (err) {
      setError('Erreur lors de la génération de la réponse');
      setLoading(false);
      throw err;
    }
  };

  const finalVerify = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API}/sessions/${sessionId}/final-verify`, {
        method: 'POST'
      });
      const data = await response.json();
      await loadSession(sessionId);
      setLoading(false);
      return data;
    } catch (err) {
      setError('Erreur lors de la vérification finale');
      setLoading(false);
      throw err;
    }
  };

  const getProgress = async () => {
    if (!sessionId) return null;

    try {
      const response = await fetch(`${API}/sessions/${sessionId}/progress`);
      const data = await response.json();
      return data;
    } catch (err) {
      return null;
    }
  };

  const getSessionLink = () => {
    if (!sessionId) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    return url.toString();
  };

  const getSpectatorLink = () => {
    if (!sessionId) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    url.searchParams.set('mode', 'view');
    return url.toString();
  };

  const copySessionLink = () => {
    const link = getSessionLink();
    navigator.clipboard.writeText(link);
  };

  const copySpectatorLink = () => {
    const link = getSpectatorLink();
    navigator.clipboard.writeText(link);
  };

  return {
    sessionId,
    sessionData,
    loading,
    error,
    isSpectator,
    createNewSession,
    loadSession,
    uploadExercise,
    uploadLaws,
    generateAllAnswers,
    generateAnswer,
    finalVerify,
    getProgress,
    getSessionLink,
    getSpectatorLink,
    copySessionLink,
    copySpectatorLink
  };
}
