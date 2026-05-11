import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";
const API = `${API_BASE_URL}/api`;
const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;

export interface SessionData {
  session: any;
  documents: any[];
  questions: any[];
  answers: any[];
  finalChecks: any[];
  chunks: any[];
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
      const storedSessionId = localStorage.getItem('current_session_id');
      if (storedSessionId) {
        setSessionId(storedSessionId);
        loadSession(storedSessionId);
      } else {
        createSession();
      }
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
      setError('Erreur lors de la création de session');
      setLoading(false);
      // Fallback to local-only session
      const localSessionId = `local_${Date.now()}`;
      setSessionId(localSessionId);
      localStorage.setItem('current_session_id', localSessionId);
    }
  };

  const loadSession = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/sessions/${id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setSessionData(data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement session:', err);
      setError('Erreur lors du chargement de session');
      setLoading(false);
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
    getProgress
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
