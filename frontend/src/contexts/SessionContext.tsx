import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_BASE_URL = "http://localhost:5050";
const API = `${API_BASE_URL}/api`;
const PUBLIC_APP_URL = "http://localhost:5173";

export interface SessionData {
  session: any;
  documents: any[];
  questions: any[];
  answers: any[];
  finalChecks: any[];
  chunks: any[];
  finalReport: any;
}

export interface ProgressData {
  exerciseImported: boolean;
  lawsImported: boolean;
  totalQuestions: number;
  generatedAnswers: number;
  verifiedAnswers: number;
  updatedAt: string;
}

interface SessionContextType {
  sessionId: string | null;
  mode: 'edit' | 'view';
  sessionData: SessionData | null;
  loading: boolean;
  error: string | null;
  isReadOnly: boolean;
  refreshSession: () => Promise<void>;
  createSession: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  saveToServer: () => Promise<void>;
  getSessionLink: () => string;
  getSpectatorLink: () => string;
  copySessionLink: () => void;
  copySpectatorLink: () => void;
  getProgress: () => Promise<ProgressData | null>;
  uploadExercise: (file: File) => Promise<void>;
  syncExercise: (data: { extractedText: string; questions: any[] }) => Promise<void>;
  uploadLaws: (file: File) => Promise<void>;
  syncLaws: (data: { extractedText: string; chunks: any[]; pageCount: number }) => Promise<void>;
  validateQuestions: (questions: any[]) => Promise<void>;
  generateAnswer: (questionId: string) => Promise<void>;
  generateAllAnswers: () => Promise<void>;
  optimizeAnswer: (questionId: string, instruction: string) => Promise<void>;
  finalVerify: () => Promise<void>;
  generateFinalReport: () => Promise<void>;
  resetSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'edit' | 'view'>('edit');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const isReadOnly = mode === 'view';

  // Initialize session on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFromUrl = urlParams.get('session');
    const modeFromUrl = urlParams.get('mode');

    if (sessionFromUrl) {
      setSessionId(sessionFromUrl);
      setMode(modeFromUrl === 'view' ? 'view' : 'edit');
      loadSession(sessionFromUrl);
    } else {
      // Force new session creation when using production backend
      localStorage.removeItem('current_session_id');
      createSession();
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Setup polling for spectator mode
  useEffect(() => {
    if (mode === 'view' && sessionId) {
      const interval = setInterval(async () => {
        try {
          const progress = await getProgress();
          if (progress) {
            const currentUpdatedAt = sessionData?.session?.updated_at;
            if (currentUpdatedAt !== progress.updatedAt) {
              await refreshSession();
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000);

      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }
  }, [mode, sessionId, sessionData]);

  const createSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Session sans titre' })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setSessionId(data.sessionId);
      localStorage.setItem('current_session_id', data.sessionId);
      await loadSession(data.sessionId);
    } catch (err) {
      console.error('Erreur création session:', err);
      setError('Impossible de se connecter au backend. Vérifiez que le serveur est démarré.');
      setLoading(false);
    }
  };

  const loadSession = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/sessions/${id}`);
      
      if (!response.ok) {
        // Session doesn't exist, clear localStorage and create new one
        localStorage.removeItem('current_session_id');
        await createSession();
        return;
      }
      
      const data = await response.json();
      setSessionData(data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement session:', err);
      localStorage.removeItem('current_session_id');
      await createSession();
    }
  };

  const refreshSession = async () => {
    if (sessionId) {
      await loadSession(sessionId);
    }
  };

  const saveToServer = async () => {
    // This is a placeholder - individual save operations happen in specific components
    // This can be used for bulk saves if needed
    if (sessionId) {
      await refreshSession();
    }
  };

  const getProgress = async (): Promise<ProgressData | null> => {
    if (!sessionId) return null;

    try {
      const response = await fetch(`${API}/sessions/${sessionId}/progress`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Erreur récupération progrès:', err);
      return null;
    }
  };

  const getSessionLink = () => {
    if (!sessionId) return '';
    const url = new URL(PUBLIC_APP_URL);
    url.searchParams.set('session', sessionId);
    return url.toString();
  };

  const getSpectatorLink = () => {
    if (!sessionId) return '';
    const url = new URL(PUBLIC_APP_URL);
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

  const uploadExercise = async (file: File) => {
    if (!sessionId) throw new Error('Aucune session active');
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API}/sessions/${sessionId}/upload-exercise`;
    console.log("UPLOAD_EXERCISE_DEBUG", {
      apiUrl: API_BASE_URL,
      sessionId,
      url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors de l\'upload de l\'exercice');
    }
    await refreshSession();
  };

  const uploadLaws = async (file: File) => {
    if (!sessionId) throw new Error('Aucune session active');
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API}/sessions/${sessionId}/upload-laws`;
    console.log("UPLOAD_LAWS_DEBUG", {
      apiUrl: API_BASE_URL,
      sessionId,
      url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors de l\'upload du document de lois');
    }
    await refreshSession();
  };

  const generateAnswer = async (questionId: string) => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/questions/${questionId}/generate`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Erreur lors de la génération de la réponse');
    await refreshSession();
  };

  const generateAllAnswers = async () => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/generate-all-answers`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Erreur lors de la génération des réponses');
    await refreshSession();
  };

  const optimizeAnswer = async (questionId: string, instruction: string) => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/questions/${questionId}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction })
    });
    if (!response.ok) throw new Error('Erreur lors de l\'optimisation de la réponse');
    await refreshSession();
  };

  const finalVerify = async () => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/final-verify`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Erreur lors de la vérification finale');
    await refreshSession();
  };

  const resetSession = async () => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/reset`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Erreur lors de la réinitialisation de la session');
    await refreshSession();
  };

  const syncExercise = async (data: { extractedText: string; questions: any[] }) => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/sync-exercise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Erreur lors de la synchronisation de l\'exercice');
    await refreshSession();
  };

  const syncLaws = async (data: { extractedText: string; chunks: any[]; pageCount: number }) => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/sync-laws`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Erreur lors de la synchronisation des lois');
    await refreshSession();
  };

  const validateQuestions = async (questions: any[]) => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/questions/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions })
    });
    if (!response.ok) throw new Error('Erreur lors de la validation des questions');
    await refreshSession();
  };

  const generateFinalReport = async () => {
    if (!sessionId) throw new Error('Aucune session active');
    const response = await fetch(`${API}/sessions/${sessionId}/final`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Erreur lors de la génération du rapport final');
    await refreshSession();
  };

  const value: SessionContextType = {
    sessionId,
    mode,
    sessionData,
    loading,
    error,
    isReadOnly,
    refreshSession,
    createSession,
    loadSession,
    saveToServer,
    getSessionLink,
    getSpectatorLink,
    copySessionLink,
    copySpectatorLink,
    getProgress,
    uploadExercise,
    syncExercise,
    uploadLaws,
    syncLaws,
    validateQuestions,
    generateAnswer,
    generateAllAnswers,
    optimizeAnswer,
    finalVerify,
    generateFinalReport,
    resetSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
