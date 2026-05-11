import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, ChevronRight, Plus, Trash2, Loader2, Eye, Scissors, Copy, Share2 } from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';

interface DetectedQuestion {
  id: number;
  originalHebrew: string;
  frenchTranslation: string;
  frenchUnderstanding: string;
  points: string;
  answerLimitLines: number;
  bullets: string[];
  status: "detected" | "validated" | "needs_review";
}

export default function ExercisePage() {
  const {
    sessionId,
    sessionData,
    isReadOnly,
    uploadExercise,
    validateQuestions
  } = useSessionContext();

  const [uploading, setUploading] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [questions, setQuestions] = useState<DetectedQuestion[]>([]);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileInfo, setFileInfo] = useState<{ name: string; chars: number } | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [manualText, setManualText] = useState('');
  const [showManualMode, setShowManualMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load questions from session data when available
  useEffect(() => {
    if (sessionData && sessionData.questions.length > 0) {
      const sessionQuestions = sessionData.questions.map((q: any, index: number) => ({
        id: index + 1,
        originalHebrew: q.original_text || q.originalHebrew || '',
        frenchTranslation: q.frenchTranslation || '',
        frenchUnderstanding: q.frenchUnderstanding || '',
        points: q.points || '',
        answerLimitLines: q.answerLimitLines || 15,
        bullets: q.bullets || [],
        status: (q.status || 'detected') as "detected" | "validated" | "needs_review"
      }));
      setQuestions(sessionQuestions);
      setExtractedText(sessionData.documents?.find((d: any) => d.type === 'exercise')?.extracted_text || '');
      setManualText(sessionData.documents?.find((d: any) => d.type === 'exercise')?.extracted_text || '');
      setFileInfo({ 
        name: sessionData.documents?.find((d: any) => d.type === 'exercise')?.filename || '',
        chars: sessionData.documents?.find((d: any) => d.type === 'exercise')?.character_count || 0
      });
      setStatus('success');
    }
  }, [sessionData]);

  const handleUpload = async (f: File) => {
    setUploading(true);
    setStatus('idle');
    setErrorMsg('');
    setShowRawText(false);
    setShowManualMode(false);
    try {
      // Ensure session exists before upload
      if (!sessionId) {
        throw new Error('Session introuvable. Rechargez la page pour créer une nouvelle session.');
      }
      // Use SessionContext to upload to backend
      await uploadExercise(f);
      const text = sessionData?.documents?.find((d: any) => d.type === 'exercise')?.extracted_text || '';
      if (text.length === 0) {
        throw new Error('Le texte du document n\'a pas pu être extrait. Convertissez le fichier en .docx ou en PDF avec texte sélectionnable.');
      }
      setExtractedText(text);
      setManualText(text);
      setFileInfo({ name: f.name, chars: text.length });
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Upload error:', err);
      setErrorMsg(errorMessage);
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

  // Découpage manuel via séparateur ---
  const handleManualSplit = () => {
    const blocks = manualText.split(/\n\s*---\s*\n/).map(b => b.trim()).filter(b => b.length > 0);
    if (blocks.length === 0) return;
    const qs: DetectedQuestion[] = blocks.map((b, i) => ({
      id: i + 1,
      originalHebrew: b,
      frenchTranslation: '',
      frenchUnderstanding: '',
      points: '',
      answerLimitLines: 15,
      bullets: [],
      status: 'detected' as const
    }));
    setQuestions(qs);
    setShowManualMode(false);
    setStatus('success');
  };

  const updateQuestion = async (id: number, originalHebrew: string) => {
    const updated = questions.map(q => q.id === id ? { ...q, originalHebrew } : q);
    setQuestions(updated);
    // Call validateQuestions to sync with backend if session exists
    if (sessionId) {
      try {
        await validateQuestions(updated.map(q => ({
          id: q.id.toString(),
          original_text: q.originalHebrew,
          frenchTranslation: q.frenchTranslation,
          frenchUnderstanding: q.frenchUnderstanding,
          points: q.points,
          answerLimitLines: q.answerLimitLines,
          bullets: q.bullets,
          status: q.status
        })));
      } catch (err) {
        console.error('Failed to validate questions:', err);
      }
    }
  };

  const deleteQuestion = (id: number) => {
    const updated = questions.filter(q => q.id !== id).map((q, i) => ({ ...q, id: i + 1 }));
    setQuestions(updated);
  };

  const addQuestion = () => {
    const qs = [...questions, {
      id: questions.length + 1,
      originalHebrew: '',
      frenchTranslation: '',
      frenchUnderstanding: '',
      points: '',
      answerLimitLines: 15,
      bullets: [],
      status: 'detected' as const
    }];
    setQuestions(qs);
  };

  const splitBySeparator = (separator: string) => {
    const parts = manualText.split(separator).map(p => p.trim()).filter(p => p.length > 10);
    const detected = parts.map((originalHebrew, i) => ({
      id: i + 1,
      originalHebrew,
      frenchTranslation: '',
      frenchUnderstanding: '',
      points: '',
      answerLimitLines: 15,
      bullets: [],
      status: 'detected' as const
    }));
    setQuestions(detected);
    setShowManualMode(false);
  };

  const isHebrew = (text: string) => /[\u0590-\u05FF]/.test(text);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">

      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
            Étape 1
          </div>
          <div className="flex items-center gap-2">
            {sessionId && (
              <div className="text-[11px] text-text-tertiary">
                Données sauvegardées sur le serveur
              </div>
            )}
            {sessionId && !isReadOnly && (
              <div className="flex gap-2">
                <button onClick={() => {}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
                  <Copy className="w-3.5 h-3.5" /> Copier le lien
                </button>
                <button onClick={() => {}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                  <Share2 className="w-3.5 h-3.5" /> Partager
                </button>
              </div>
            )}
            {isReadOnly && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                <Eye className="w-3.5 h-3.5" /> Mode lecture seule
              </div>
            )}
          </div>
        </div>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-2">
          Fichier d'exercice
        </h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed max-w-xl">
          Importez le fichier contenant les questions de votre devoir. Le système détecte automatiquement les questions numérotées (FR + hébreu).
        </p>
      </div>

      {/* Upload Zone — visible si pas encore importé et pas en mode spectateur */}
      {status !== 'success' && !isReadOnly && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-6 group"
          style={{
            background: uploading ? 'rgba(99,102,241,0.06)' : 'rgba(24,24,27,0.6)',
            border: uploading ? '1.5px dashed rgba(99,102,241,0.4)' : '1.5px dashed rgba(255,255,255,0.08)',
          }}
          onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.border = '1.5px dashed rgba(99,102,241,0.35)'; }}
          onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLElement).style.border = '1.5px dashed rgba(255,255,255,0.08)'; }}
        >
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
              <p className="text-[14px] font-medium text-text-secondary">Analyse du document…</p>
              <p className="text-[12px] text-text-muted">Extraction du texte et détection des questions</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
                style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Upload className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-text-secondary">Glissez le fichier ou <span className="text-indigo-400">cliquez pour importer</span></p>
                <p className="text-[12px] text-text-muted mt-1">PDF · DOCX · DOC · TXT</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spectator message when no data */}
      {status !== 'success' && isReadOnly && (
        <div className="rounded-2xl p-10 text-center mb-6"
          style={{ background: 'rgba(39,39,42,0.6)', border: '1.5px dashed rgba(255,255,255,0.08)' }}>
          <Eye className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
          <p className="text-[14px] font-medium text-text-secondary mb-2">Aucun document importé</p>
          <p className="text-[12px] text-text-muted">En mode lecture seule, vous ne pouvez voir que les documents déjà importés par l'éditeur.</p>
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
          <button onClick={() => setStatus('idle')}
            className="text-[11px] text-red-400/60 hover:text-red-400 transition-colors underline">Réessayer</button>
        </div>
      )}

      {/* Success stats */}
      {status === 'success' && fileInfo && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-text-primary tracking-tight">Exercice importé</p>
              <p className="text-[11px] text-text-muted mt-0.5">{fileInfo.name}</p>
            </div>
            <button onClick={() => { setStatus('idle'); setQuestions([]); setExtractedText(''); setManualText(''); setFileInfo(null); }}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">Changer</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'Fichier', value: fileInfo.name.split('.').pop()?.toUpperCase() || 'DOC' },
              { label: 'Caractères', value: fileInfo.chars.toLocaleString() },
              { label: 'Questions', value: String(questions.length), accent: questions.length >= 1 ? 'emerald' : 'orange' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-3" style={{ background: 'rgba(18,18,20,0.8)' }}>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={`text-[15px] font-bold tracking-tight ${
                  stat.accent === 'emerald' ? 'text-emerald-400' :
                  stat.accent === 'orange' ? 'text-orange-400' : 'text-text-primary'
                }`}>{stat.value}</p>
              </div>
            ))}
          </div>
          {questions.length < 8 && questions.length > 0 && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] text-amber-400/90 mb-1">
                  Moins de 8 questions détectées ({questions.length}/8). Vérifiez la liste et ajoutez les questions manquantes.
                </p>
                <button
                  onClick={() => setShowManualMode(true)}
                  className="text-[11px] text-indigo-400 underline"
                >
                  Découper manuellement le texte
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Fallback 0 questions ── */}
      {status === 'success' && questions.length === 0 && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-400 mb-1">Aucune question détectée automatiquement</p>
              <p className="text-[12px] text-red-400/70">
                Le texte a été extrait ({fileInfo?.chars.toLocaleString() || 0} caractères), mais aucun marqueur de question n'a été trouvé.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowRawText(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
              <Eye className="w-3.5 h-3.5" /> {showRawText ? 'Masquer le texte' : 'Voir le texte extrait'}
            </button>
            <button
              onClick={() => setShowManualMode(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
              <Scissors className="w-3.5 h-3.5" /> Découper manuellement
            </button>
            <button
              onClick={addQuestion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
              <Plus className="w-3.5 h-3.5" /> Ajouter une question
            </button>
          </div>
        </div>
      )}

      {/* Texte brut extrait */}
      {showRawText && extractedText && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'rgba(24,24,27,0.9)' }}>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Texte extrait</span>
            <span className="text-[10px] text-text-muted">{extractedText.length.toLocaleString()} caractères</span>
          </div>
          <textarea
            readOnly
            value={extractedText}
            rows={12}
            dir={isHebrew(extractedText) ? 'rtl' : 'ltr'}
            className="w-full bg-zinc-950/60 text-[12px] text-text-tertiary p-4 focus:outline-none resize-none leading-relaxed font-mono"
          />
        </div>
      )}

      {/* Mode découpage manuel */}
      {showManualMode && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.25)' }}>
          <div className="px-4 py-2.5" style={{ background: 'rgba(99,102,241,0.08)' }}>
            <p className="text-[12px] font-semibold text-indigo-300 mb-0.5">Découpage manuel</p>
            <p className="text-[11px] text-indigo-300/60">
              Séparez chaque question avec une ligne contenant uniquement <code className="bg-zinc-800 px-1 rounded">---</code> puis cliquez "Valider les questions".
            </p>
          </div>
          <textarea
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            rows={16}
            dir={isHebrew(manualText) ? 'rtl' : 'ltr'}
            className="w-full bg-zinc-950/60 text-[13px] text-text-primary p-4 focus:outline-none resize-none leading-relaxed"
            placeholder={`Question 1...\n---\nQuestion 2...\n---\nQuestion 3...`}
          />
          <div className="px-4 py-3 flex flex-wrap gap-2 justify-between items-center" style={{ background: 'rgba(18,18,20,0.8)' }}>
            <div className="flex gap-2">
              <button
                onClick={() => splitBySeparator('---')}
                className="px-3 py-1.5 rounded-lg text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                Découper par ---
              </button>
              <button
                onClick={() => splitBySeparator('\n\n')}
                className="px-3 py-1.5 rounded-lg text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                Découper par sauts de ligne
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowManualMode(false)}
                className="px-3 py-1.5 rounded-lg text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">
                Annuler
              </button>
              <button onClick={handleManualSplit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                <Scissors className="w-3.5 h-3.5" /> Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions list */}
      {questions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-text-secondary tracking-tight">
              {questions.length} question{questions.length > 1 ? 's' : ''} détectée{questions.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-3">
              {extractedText && (
                <button onClick={() => setShowRawText(v => !v)}
                  className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                  <Eye className="w-3 h-3" /> {showRawText ? 'Masquer' : 'Voir texte'}
                </button>
              )}
              <button onClick={addQuestion}
                className="flex items-center gap-1.5 text-[12px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
          </div>

          {/* Texte brut si demandé depuis la liste */}
          {showRawText && extractedText && questions.length > 0 && (
            <div className="mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <textarea readOnly value={extractedText} rows={8} dir={isHebrew(extractedText) ? 'rtl' : 'ltr'}
                className="w-full bg-zinc-950/60 text-[11px] text-text-muted p-3 focus:outline-none resize-none leading-relaxed font-mono" />
            </div>
          )}

          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="group rounded-2xl transition-all"
                style={{ background: 'rgba(24,24,27,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 tabular-nums"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                      {q.id}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded" style={{
                      background: q.status === 'validated' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: q.status === 'validated' ? '#34d399' : '#fbbf24',
                      border: q.status === 'validated' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)'
                    }}>
                      {q.status === 'validated' ? 'Validée' : 'À vérifier'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => deleteQuestion(q.id)}
                      className="p-1 text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Hebrew original */}
                <div className="px-4 py-3">
                  <div className="text-[11px] font-medium text-text-tertiary mb-2">Texte original en hébreu:</div>
                  <textarea
                    value={q.originalHebrew}
                    onChange={e => updateQuestion(q.id, e.target.value)}
                    rows={Math.min(6, Math.max(2, q.originalHebrew.split('\n').length + 1))}
                    dir="rtl"
                    className="w-full bg-zinc-950/60 text-[13px] text-text-primary p-3 rounded-lg focus:outline-none resize-none leading-relaxed placeholder:text-zinc-700 text-right"
                    placeholder="שאלה בעברית..."
                  />
                </div>

                {/* French translation */}
                <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[11px] font-medium text-text-tertiary mb-2">Version française:</div>
                  <textarea
                    value={q.frenchTranslation}
                    onChange={e => {
                      const updated = questions.map(qq => qq.id === q.id ? { ...qq, frenchTranslation: e.target.value } : qq);
                      setQuestions(updated);
                    }}
                    rows={3}
                    dir="ltr"
                    className="w-full bg-zinc-950/60 text-[13px] text-text-primary p-3 rounded-lg focus:outline-none resize-none leading-relaxed placeholder:text-zinc-700"
                    placeholder="Traduction / compréhension en français..."
                  />
                </div>

                {/* Footer with buttons */}
                <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-text-tertiary">
                    Limite: {q.answerLimitLines} lignes
                  </div>
                  <div className="flex gap-2">
                    {q.status !== 'validated' && (
                      <button
                        onClick={() => {
                          const updated = questions.map(qq => qq.id === q.id ? { ...qq, status: 'validated' as const } : qq);
                          setQuestions(updated);
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
                      >
                        Valider
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state initial */}
      {status === 'idle' && !uploading && questions.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 mx-auto mb-3 text-zinc-800" />
          <p className="text-[13px] text-text-muted">Importez le fichier de l'exercice pour commencer.</p>
        </div>
      )}

      {/* CTA */}
      {questions.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => navigate('/laws')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 4px 16px rgba(99,102,241,0.25)',
            }}>
            Lois fiscales
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
