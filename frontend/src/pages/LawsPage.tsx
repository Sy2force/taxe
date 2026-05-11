import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, BookOpen, CheckCircle, AlertCircle, ChevronRight, Loader2, Zap } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5050';

interface LawsInfo {
  name: string;
  chars: number;
  pages: number;
  chunks: number;
  documentId: string;
}

export default function LawsPage() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lawsInfo, setLawsInfo] = useState<LawsInfo | null>(null);
  const [genError, setGenError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleUpload = async (f: File) => {
    setUploading(true);
    setStatus('idle');
    setErrorMsg('');
    try {
      // Check backend health first
      try {
        const healthRes = await fetch(`${API}/health`);
        if (!healthRes.ok) {
          throw new Error('Impossible de contacter le serveur Render. Vérifiez que le backend est réveillé.');
        }
      } catch (healthErr) {
        throw new Error('Impossible de contacter le serveur Render. Vérifiez que le backend est réveillé.');
      }

      const formData = new FormData();
      formData.append('file', f);
      const res = await fetch(`${API}/api/upload-laws`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'import');
      setLawsInfo({
        name: f.name,
        chars: data.chars || data.content?.length || 0,
        pages: data.pages || Math.ceil((data.chars || data.content?.length || 0) / 2000),
        chunks: data.chunks || 0,
        documentId: data.id || '',
      });
      localStorage.setItem('laws_document_id', data.id || '');
      localStorage.setItem('laws_document_name', f.name);
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      if (errorMessage.includes('Le fichier est trop volumineux')) {
        setErrorMsg('Le fichier est trop volumineux. Essayez un fichier de moins de 50 Mo.');
      } else if (errorMessage.includes('Format non supporté')) {
        setErrorMsg('Format non supporté. Utilisez PDF, DOCX, DOC ou TXT.');
      } else if (errorMessage.includes('Impossible de contacter le serveur')) {
        setErrorMsg('Impossible de contacter le serveur Render. Vérifiez que le backend est réveillé.');
      } else {
        setErrorMsg(errorMessage);
      }
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  };

  // Déclenche la génération côté /answers — la page Answers gère tout (résilient au refresh / navigation)
  const handleGenerateAnswers = () => {
    const questionsRaw = localStorage.getItem('exercise_questions');
    if (!questionsRaw) {
      setGenError('Aucune question trouvée. Retournez à l\'étape Exercice pour importer vos questions.');
      return;
    }
    // Signale à AnswersPage qu'il faut (re)générer toutes les questions
    localStorage.setItem('generation_requested_at', new Date().toISOString());
    localStorage.removeItem('answers_data');
    navigate('/answers');
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">

      {/* Page header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-widest"
          style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#67e8f9' }}>
          Étape 2
        </div>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-2">Lois fiscales</h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed max-w-xl">
          Importez le document de 243 pages. Il sera la <strong className="text-text-secondary font-medium">seule source</strong> pour générer toutes les réponses — aucune loi inventée.
        </p>
      </div>

      {/* Upload */}
      {status !== 'success' && (
        <div
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-6 group"
          style={{
            background: uploading ? 'rgba(6,182,212,0.06)' : 'rgba(24,24,27,0.6)',
            border: uploading ? '1.5px dashed rgba(6,182,212,0.4)' : '1.5px dashed rgba(255,255,255,0.08)',
          }}
          onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.border = '1.5px dashed rgba(6,182,212,0.3)'; }}
          onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLElement).style.border = '1.5px dashed rgba(255,255,255,0.08)'; }}
        >
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.22)' }}>
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
              <p className="text-[14px] font-medium text-text-secondary">Lecture du document…</p>
              <p className="text-[12px] text-text-muted">Un document de 243 pages peut prendre quelques secondes.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
                style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Upload className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-text-secondary">Glissez le document de lois ou <span className="text-cyan-400">cliquez pour importer</span></p>
                <p className="text-[12px] text-text-muted mt-1">PDF · DOCX · DOC · TXT</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-red-400 mb-0.5">Erreur d'import</p>
            <p className="text-[12px] text-red-400/70">{errorMsg}</p>
          </div>
          <button onClick={() => setStatus('idle')} className="text-[11px] text-red-400/60 hover:text-red-400 underline">Réessayer</button>
        </div>
      )}

      {/* Success card */}
      {status === 'success' && lawsInfo && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-text-primary tracking-tight">Document de lois prêt</p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate">{lawsInfo.name}</p>
            </div>
            <button onClick={() => setStatus('idle')} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">Changer</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Type', value: lawsInfo.name.split('.').pop()?.toUpperCase() || 'PDF' },
              { label: 'Caractères', value: lawsInfo.chars.toLocaleString() },
              { label: 'Pages', value: String(lawsInfo.pages || '~243') },
              { label: 'Chunks', value: String(lawsInfo.chunks || '—') },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(18,18,20,0.8)' }}>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-[15px] font-bold text-text-primary tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <BookOpen className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
            <p className="text-[12px] text-cyan-400/80">
              Source unique activée — toutes les réponses seront générées exclusivement depuis ce document.
            </p>
          </div>
        </div>
      )}

      {/* Generation error */}
      {genError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-5"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-red-400">{genError}</p>
        </div>
      )}

      {/* Actions */}
      {status === 'success' && <ActionsBar onGenerate={handleGenerateAnswers} onBack={() => navigate('/exercise')} />}

      {status === 'idle' && !uploading && (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-zinc-800" />
          <p className="text-[13px] text-text-muted">Importez le document de lois fiscales pour commencer.</p>
        </div>
      )}
    </div>
  );
}

// Barre d'actions — bouton générer désactivé si aucune question importée
function ActionsBar({ onGenerate, onBack }: { onGenerate: () => void; onBack: () => void }) {
  let hasQuestions = false;
  try {
    const raw = localStorage.getItem('exercise_questions');
    hasQuestions = !!raw && JSON.parse(raw).length > 0;
  } catch { /* ignore */ }

  return (
    <div className="flex items-center justify-between">
      <button onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium text-text-tertiary hover:text-text-secondary transition-colors"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        ← Exercice
      </button>
      {hasQuestions ? (
        <button onClick={onGenerate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 0 1px rgba(16,185,129,0.3), 0 4px 16px rgba(16,185,129,0.25)' }}>
          <Zap className="w-4 h-4" /> Générer les réponses <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', color: '#fcd34d' }}>
          <AlertCircle className="w-3.5 h-3.5" />
          Importez d'abord les questions
        </div>
      )}
    </div>
  );
}
