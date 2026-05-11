import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RotateCcw, Loader2, Copy, Share2, Eye } from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';

const pageInfo: Record<string, { step: string; title: string }> = {
  '/exercise':     { step: '01', title: 'Exercice' },
  '/laws':         { step: '02', title: 'Lois fiscales' },
  '/answers':      { step: '03', title: 'Réponses' },
  '/verification': { step: '04', title: 'Vérification' },
  '/final-check':  { step: '05', title: 'Document final' },
};

export default function Header() {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { sessionId, isReadOnly, copySessionLink, copySpectatorLink } = useSessionContext();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/health`);
        setBackendStatus(res.ok ? 'connected' : 'disconnected');
      } catch {
        setBackendStatus('disconnected');
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const handleNewSession = async () => {
    setResetting(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/reset-session`, { method: 'POST' });
    } catch (e) { console.error('Reset failed', e); }
    localStorage.clear();
    setResetting(false);
    setShowConfirm(false);
    navigate('/exercise');
    window.location.reload();
  };

  const info = pageInfo[location.pathname];

  return (
    <>
      <header className="sticky top-0 z-50 h-12 flex items-center px-3 sm:px-6 gap-3" style={{
        background: 'rgba(9,9,11,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Logo mobile only (visible when no sidebar) */}
        <div className="md:hidden flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <span className="text-white text-[10px] font-bold">CF</span>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {info && (
            <>
              <span className="hidden sm:inline text-[11px] font-bold tracking-widest text-zinc-600 uppercase tabular-nums select-none">
                {info.step}
              </span>
              <span className="hidden sm:inline text-zinc-700 select-none">/</span>
              <span className="text-[13px] font-semibold text-text-primary tracking-tight truncate">
                {info.title}
              </span>
            </>
          )}
          {!info && (
            <span className="text-[13px] font-semibold text-text-primary tracking-tight truncate">
              Correcteur Fiscalité Pro
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Session ID badge */}
          {sessionId && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
              <span>Session: {sessionId.slice(0, 8)}...</span>
            </div>
          )}

          {/* Spectator mode badge */}
          {isReadOnly && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">Mode lecture seule</span>
            </div>
          )}

          {/* Share buttons - only in edit mode */}
          {!isReadOnly && sessionId && (
            <>
              <button
                onClick={copySessionLink}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
                title="Copier le lien de session"
              >
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">Session</span>
              </button>
              <button
                onClick={() => {
                  const link = `${import.meta.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173'}/answers?session=${sessionId}`;
                  navigator.clipboard.writeText(link);
                }}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
                title="Copier le lien réponses"
              >
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">Réponses</span>
              </button>
              <button
                onClick={copySpectatorLink}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}
                title="Partager en lecture seule"
              >
                <Share2 className="w-3 h-3" />
                <span className="hidden sm:inline">Lecture seule</span>
              </button>
              <button
                onClick={() => {
                  const link = `http://localhost:5173/answers?session=${sessionId}`;
                  navigator.clipboard.writeText(link);
                  alert('Le lien local fonctionne uniquement sur votre ordinateur. Pour partager, utilisez le lien Vercel.');
                }}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}
                title="Copier le lien local (debug)"
              >
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">Local</span>
              </button>
            </>
          )}

          {/* Backend status — dot only on mobile, full pill on sm+ */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium" style={{
            background: backendStatus === 'connected'
              ? 'rgba(16,185,129,0.1)'
              : backendStatus === 'disconnected'
              ? 'rgba(239,68,68,0.1)'
              : 'rgba(245,158,11,0.1)',
            border: backendStatus === 'connected'
              ? '1px solid rgba(16,185,129,0.25)'
              : backendStatus === 'disconnected'
              ? '1px solid rgba(239,68,68,0.25)'
              : '1px solid rgba(245,158,11,0.25)',
          }}>
            {backendStatus === 'checking' ? (
              <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                backendStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'
              }`} style={backendStatus === 'connected' ? { boxShadow: '0 0 6px rgba(16,185,129,0.8)' } : {}} />
            )}
            <span className={`hidden sm:inline ${
              backendStatus === 'connected' ? 'text-emerald-400' :
              backendStatus === 'disconnected' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {backendStatus === 'connected' ? 'En ligne' : backendStatus === 'disconnected' ? 'Hors ligne' : '…'}
            </span>
          </div>

          {/* Reset — icon only on mobile, icon+text on sm+ */}
          {!isReadOnly && (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-500 hover:text-red-400 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              title="Nouvelle session"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Nouvelle session</span>
            </button>
          )}
        </div>
      </header>

      {/* Confirm dialog — Apple Sheet style */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              background: 'rgba(24,24,27,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(32px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <RotateCcw className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-text-primary text-center mb-1.5 tracking-tight">
              Recommencer depuis zéro ?
            </h3>
            <p className="text-[13px] text-text-tertiary text-center mb-6 leading-relaxed">
              Toutes les données seront supprimées : exercice, questions, document de lois, réponses.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary transition-all"
                style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleNewSession}
                disabled={resetting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Recommencer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

