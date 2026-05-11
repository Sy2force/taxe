import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, CheckCircle, RefreshCw, Loader2, ClipboardCopy, ChevronRight, Edit, Save, X, Sparkles, MessageSquare, FileText, Eye } from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5050';

interface Question {
  id: number;
  text: string;
  detectedLanguage?: 'he' | 'fr' | 'mixed';
}

interface Source {
  extract: string;
  page?: number;
  documentName: string;
  relevanceScore?: number;
  matchedTerms?: string[];
  reason?: string;
}

type AnswerStatus = 'not_started' | 'loading' | 'generating' | 'done' | 'needs_review' | 'no_source' | 'error' | 'copied';

interface Answer {
  questionId: number;
  answer: string;
  editedAnswer?: string;
  understanding?: string;
  frenchExplanation?: string;
  reasoning?: string;
  keywordsHe?: string[];
  keywordsFr?: string[];
  sources: Source[];
  status: AnswerStatus;
  copied: boolean;
  aiNotes?: string;
  validationStatus?: 'valid' | 'invalid' | 'unknown';
  generatedAt?: string;
  updatedAt?: string;
}

export default function AnswersPage() {
  const { sessionData, generateAnswer } = useSessionContext();
  const [questions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<Record<number, string>>({});
  const hasLoaded = useRef(false);
  const navigate = useNavigate();

  // Load questions and answers from sessionData
  useEffect(() => {
    if (sessionData) {
      const qs = sessionData.questions.map((q: any) => ({
        id: q.number,
        text: q.original_text || q.originalHebrew || '',
        detectedLanguage: q.language || 'he'
      }));
      // @ts-ignore
      setQuestions(qs);

      const ansMap = new Map<number, Answer>();
      sessionData.answers.forEach((a: any) => {
        ansMap.set(a.question_id, {
          questionId: a.question_id,
          answer: a.hebrew_answer || '',
          editedAnswer: a.edited_answer,
          understanding: a.french_explanation || '',
          reasoning: a.reasoning || '',
          sources: a.sources_json || [],
          status: a.status || 'not_started',
          copied: a.copied || false,
          generatedAt: a.created_at,
          updatedAt: a.updated_at
        });
      });
      setAnswers(ansMap);
    }
  }, [sessionData]);

  const saveAnswers = useCallback((map: Map<number, Answer>) => {
    const result: Record<number, Answer> = {};
    map.forEach((v, k) => { result[k] = v; });
    localStorage.setItem('answers_data', JSON.stringify(result));
    localStorage.setItem('answers_saved_at', new Date().toISOString());
  }, []);

  const generateOne = useCallback(async (q: Question, map: Map<number, Answer>) => {
    try {
      await generateAnswer(q.id.toString());
      // After generation, the sessionData will be updated automatically
      // We'll let the useEffect handle the update
    } catch {
      map.set(q.id, { questionId: q.id, answer: '', sources: [], status: 'error', copied: false });
    }
    setAnswers(new Map(map));
  }, [generateAnswer]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    if (questions.length === 0) return;
    // Answers are loaded from sessionData via the useEffect above
    // No need to load from localStorage anymore
  }, [questions]);

  useEffect(() => {
    if (answers.size > 0) saveAnswers(answers);
  }, [answers, saveAnswers]);

  const regenerate = async (q: Question) => {
    const newMap = new Map(answers);
    newMap.set(q.id, { questionId: q.id, answer: '', sources: [], status: 'loading', copied: false });
    setAnswers(newMap);
    await generateOne(q, newMap);
  };

  const retryFailed = async () => {
    const failed = questions.filter(q => answers.get(q.id)?.status === 'error');
    if (failed.length === 0) return;
    setLoading(true);
    const newMap = new Map(answers);
    for (const q of failed) {
      newMap.set(q.id, { questionId: q.id, answer: '', sources: [], status: 'loading', copied: false });
    }
    setAnswers(newMap);
    for (const q of failed) {
      await generateOne(q, newMap);
    }
    setLoading(false);
  };

  const copyText = async (text: string, key: number, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: label }));
    setTimeout(() => setCopyFeedback(prev => { const n = { ...prev }; delete n[key]; return n; }), 2500);
  };


  const copyAll = async () => {
    const lines: string[] = [];
    questions.forEach(q => {
      const a = answers.get(q.id);
      if (a?.answer) {
        lines.push(`Question ${q.id}`);
        lines.push(q.text);
        lines.push('');
        lines.push('Réponse :');
        lines.push(a.answer);
        lines.push('');
        if (a.sources.length > 0) {
          lines.push('Sources :');
          a.sources.forEach((s) => {
            lines.push(`- ${s.documentName}${s.page ? ` (p.${s.page})` : ''} : ${s.extract.substring(0, 150)}…`);
          });
        }
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    });
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopyFeedback(prev => ({ ...prev, 0: 'Tout copié !' }));
    setTimeout(() => setCopyFeedback(prev => { const n = { ...prev }; delete n[0]; return n; }), 2500);
  };

  const selectedAnswer = selectedId !== null ? answers.get(selectedId) : null;
  const selectedQuestion = selectedId !== null ? questions.find(q => q.id === selectedId) : null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#09090b' }}>
      {/* ── Panneau gauche : Liste des questions ── */}
      <div className="w-full md:w-72 lg:w-80 flex-shrink-0 border-b md:border-b-0 md:border-r" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="p-4 md:p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-[15px] font-bold text-text-primary tracking-tight mb-1">Questions du devoir</h2>
          <p className="text-[11px] text-text-tertiary">{questions.length} questions</p>
        </div>
        <div className="p-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {questions.map(q => {
            const a = answers.get(q.id);
            const status = a?.status || 'not_started';
            const isSelected = selectedId === q.id;
            const lines = a?.answer ? a.answer.split('\n').filter(l => l.trim()).length : 0;
            return (
              <button
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 ${isSelected ? 'ring-1 ring-indigo-500/30' : ''}`}
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                  border: isSelected ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <StatusDot status={status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-secondary truncate leading-snug">{q.text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge status={status} />
                      {lines > 0 && <span className="text-[10px] text-zinc-600">{lines}L</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Panneau principal : Détail de la question ── */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto">
          {/* Header global */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 text-[11px] font-semibold uppercase tracking-widest"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                Étape 3
              </div>
              <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-1">Réponses générées</h1>
              <p className="text-[13px] text-text-tertiary">
                {(() => {
                  const done = questions.filter(q => answers.get(q.id)?.status === 'done').length;
                  const failed = questions.filter(q => answers.get(q.id)?.status === 'error').length;
                  const noSrc = questions.filter(q => answers.get(q.id)?.status === 'no_source').length;
                  return `${done}/${questions.length} prêtes${failed > 0 ? ` · ${failed} erreur(s)` : ''}${noSrc > 0 ? ` · ${noSrc} sans source` : ''}`;
                })()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#a5b4fc' }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> Génération…
                </div>
              )}
              {!loading && questions.some(q => answers.get(q.id)?.status === 'error') && (
                <button onClick={retryFailed}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <RefreshCw className="w-3.5 h-3.5" /> Réessayer les erreurs
                </button>
              )}
              <button onClick={copyAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
                <ClipboardCopy className="w-3.5 h-3.5" /> Tout copier
              </button>
              <button onClick={() => navigate('/verification')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
                Vérification <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Détail de la question sélectionnée */}
          {!selectedQuestion ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <FileText className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-[14px] font-semibold text-text-primary mb-1.5">Sélectionnez une question</p>
              <p className="text-[13px] text-text-tertiary">Cliquez sur une question dans la liste pour voir les détails.</p>
            </div>
          ) : (
            <AnswerDetailPanel
              question={selectedQuestion}
              answer={selectedAnswer || undefined}
              onRegenerate={() => regenerate(selectedQuestion)}
              onCopy={(text) => copyText(text, selectedQuestion.id * 10 + 1, 'Copié !')}
              onCopyWithSources={() => {
                if (selectedAnswer?.answer) {
                  copyText(`Question ${selectedQuestion.id}\n${selectedQuestion.text}\n\nRéponse :\n${selectedAnswer.answer}\n\nSources :\n${selectedAnswer.sources.map(s => `- ${s.documentName}${s.page ? ` (p.${s.page})` : ''} : ${s.extract.substring(0, 200)}…`).join('\n')}`, selectedQuestion.id * 10 + 2, 'Copié !');
                }
              }}
              onSaveEdited={(edited) => {
                const newMap = new Map(answers);
                const a = newMap.get(selectedQuestion.id);
                if (a) {
                  a.editedAnswer = edited;
                  a.updatedAt = new Date().toISOString();
                  const lineCount = edited.split('\n').filter(l => l.trim()).length;
                  if (lineCount > 15) a.status = 'needs_review';
                  newMap.set(selectedQuestion.id, a);
                  setAnswers(newMap);
                  saveAnswers(newMap);
                }
              }}
              onAiAction={async (action, userQuestion) => {
                const a = selectedAnswer;
                if (!a) return;
                const res = await fetch(`${API}/api/answer-action`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action,
                    questionText: selectedQuestion.text,
                    currentAnswer: a.editedAnswer || a.answer,
                    sources: a.sources,
                    userQuestion,
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  const newMap = new Map(answers);
                  const existing = newMap.get(selectedQuestion.id);
                  if (!existing) return;
                  const updated: Answer = { ...existing };
                  updated.editedAnswer = data.result;
                  updated.updatedAt = new Date().toISOString();
                  if (action === 'validate') {
                    updated.aiNotes = data.result;
                    updated.validationStatus = data.result.toLowerCase().includes('correct') ? 'valid' : 'invalid';
                  } else if (action === 'ask') {
                    // géré dans AnswerDetailPanel
                  } else {
                    updated.aiNotes = data.result;
                  }
                  if (data.lineCount > 15) updated.status = 'needs_review';
                  newMap.set(selectedQuestion.id, updated);
                  setAnswers(newMap);
                  saveAnswers(newMap);
                }
              }}
              copyFeedback={copyFeedback}
              isRTL={selectedQuestion.detectedLanguage === 'he' || selectedQuestion.detectedLanguage === 'mixed'}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Composant : Point de statut ──
function StatusDot({ status }: { status: AnswerStatus }) {
  const colors: Record<AnswerStatus, string> = {
    not_started: 'bg-zinc-600',
    loading: 'bg-indigo-400 animate-pulse',
    generating: 'bg-indigo-400 animate-pulse',
    done: 'bg-emerald-400',
    needs_review: 'bg-amber-400',
    no_source: 'bg-orange-500',
    error: 'bg-red-400',
    copied: 'bg-emerald-400',
  };
  return (
    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${colors[status] || 'bg-zinc-600'}`}
      style={status === 'done' ? { boxShadow: '0 0 6px rgba(16,185,129,0.6)' } : {}} />
  );
}

// ── Composant : Badge statut ──
function StatusBadge({ status }: { status: AnswerStatus }) {
  const labels: Record<AnswerStatus, string> = {
    not_started: 'À générer',
    loading: 'Chargement',
    generating: 'En cours',
    done: 'Prête',
    needs_review: 'À vérifier',
    no_source: 'Sans source',
    error: 'Erreur',
    copied: 'Copiée',
  };
  const colors: Record<AnswerStatus, { bg: string; border: string; text: string }> = {
    not_started: { bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.18)', text: '#a1a1aa' },
    loading: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.18)', text: '#a5b4fc' },
    generating: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.18)', text: '#a5b4fc' },
    done: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)', text: '#6ee7b7' },
    needs_review: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', text: '#fcd34d' },
    no_source: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.18)', text: '#fdba74' },
    error: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)', text: '#f87171' },
    copied: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)', text: '#6ee7b7' },
  };
  const c = colors[status] || colors.not_started;
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: c.bg, border: c.border, color: c.text }}>
      {labels[status] || status}
    </span>
  );
}

// ── Composant : Panneau détail question ──
interface AnswerDetailPanelProps {
  question: Question;
  answer: Answer | undefined;
  onRegenerate: () => void;
  onCopy: (text: string) => void;
  onCopyWithSources: () => void;
  onSaveEdited: (edited: string) => void;
  onAiAction: (action: 'optimize' | 'shorten' | 'clarify' | 'explain' | 'validate' | 'ask', userQuestion?: string) => void;
  copyFeedback: Record<number, string>;
  isRTL: boolean;
}

function AnswerDetailPanel({ question, answer, onRegenerate, onCopy, onCopyWithSources, onSaveEdited, onAiAction, copyFeedback, isRTL }: AnswerDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [showSources, setShowSources] = useState(true);

  const displayAnswer = editing ? editedText : (answer?.editedAnswer || answer?.answer || '');
  const lineCount = displayAnswer.split('\n').filter(l => l.trim()).length;

  const handleStartEdit = () => {
    setEditedText(answer?.editedAnswer || answer?.answer || '');
    setEditing(true);
  };

  const handleSaveEdit = () => {
    onSaveEdited(editedText);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleAiAction = async (action: 'optimize' | 'shorten' | 'clarify' | 'explain' | 'validate') => {
    setAiLoading(true);
    await onAiAction(action);
    setAiLoading(false);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', content: chatInput }]);
    const q = chatInput;
    setChatInput('');
    setAiLoading(true);
    await onAiAction('ask', q);
    setAiLoading(false);
  };

  if (!answer || answer.status === 'not_started') {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-indigo-400 animate-spin" />
        <p className="text-[14px] font-medium text-text-secondary mb-2">Réponse non générée</p>
        <button onClick={onRegenerate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
          <Sparkles className="w-4 h-4" /> Générer
        </button>
      </div>
    );
  }

  if (answer.status === 'loading') {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-indigo-400 animate-spin" />
        <p className="text-[14px] font-medium text-text-secondary">Génération en cours depuis le document de lois…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Question originale */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest">Question originale</h3>
          <StatusBadge status={answer.status} />
        </div>
        <p className={`text-[14px] text-text-primary leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          {question.text}
        </p>
      </div>

      {/* Compréhension en français */}
      {answer.understanding && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
          <h3 className="text-[13px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">Question en français</h3>
          <p className="text-[13px] text-text-secondary leading-relaxed">{answer.understanding}</p>
        </div>
      )}

      {/* Explication en français */}
      {answer.frenchExplanation && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.14)' }}>
          <h3 className="text-[13px] font-semibold text-amber-400 uppercase tracking-widest mb-2">Explication en français</h3>
          <p className="text-[13px] text-text-secondary leading-relaxed">{answer.frenchExplanation}</p>
        </div>
      )}

      {/* Réponse guidée */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest">Réponse guidée à copier</h3>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lineCount > 15 ? 'text-red-400' : 'text-emerald-400'}`}
              style={lineCount > 15
                ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
                : { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
              {lineCount}L
            </span>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <button onClick={handleSaveEdit}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-emerald-400"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Save className="w-3 h-3" /> Enregistrer
                </button>
                <button onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500"
                  style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <X className="w-3 h-3" /> Annuler
                </button>
              </div>
            ) : (
              <button onClick={handleStartEdit}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                style={{ background: 'rgba(39,39,42,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Edit className="w-3 h-3" /> Modifier
              </button>
            )}
          </div>
        </div>
        {editing ? (
          <textarea
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            className="w-full h-48 p-4 rounded-xl text-[13px] text-text-primary leading-relaxed resize-none focus:outline-none"
            style={{ background: 'rgba(9,9,11,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        ) : (
          <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-line">{displayAnswer}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => onCopy(displayAnswer)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={copyFeedback[question.id * 10 + 1]
              ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }
              : { background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
            <Copy className="w-3.5 h-3.5" /> {copyFeedback[question.id * 10 + 1] || 'Copier réponse hébreu'}
          </button>
          <button onClick={onCopyWithSources}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
            style={copyFeedback[question.id * 10 + 2]
              ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }
              : { background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
            <Copy className="w-3.5 h-3.5" /> {copyFeedback[question.id * 10 + 2] || 'Copier hébreu + sources'}
          </button>
          {answer.frenchExplanation && (
            <button onClick={() => onCopy(answer.frenchExplanation || '')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
              style={copyFeedback[question.id * 10 + 3]
                ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }
                : { background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
              <Copy className="w-3.5 h-3.5" /> {copyFeedback[question.id * 10 + 3] || 'Copier explication française'}
            </button>
          )}
        </div>
      </div>

      {/* Pourquoi cette réponse */}
      {answer.reasoning && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors mb-2">
            <span>{showSources ? '▾' : '▸'}</span> Pourquoi cette réponse ?
          </button>
          {showSources && (
            <p className="text-[13px] text-text-tertiary leading-relaxed">{answer.reasoning}</p>
          )}
        </div>
      )}

      {/* Sources utilisées */}
      {answer.sources.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest mb-3">Sources utilisées dans les 243 pages</h3>
          <div className="space-y-2">
            {answer.sources.slice(0, 3).map((s) => (
              <div key={`${s.page}-${s.documentName}`} className="p-3 rounded-xl" style={{ background: 'rgba(18,18,20,0.8)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-indigo-400">{s.documentName}</span>
                  <span className="text-[10px] text-text-muted">{s.page ? `p. ${s.page}` : 'Page non détectée'}</span>
                  {s.relevanceScore !== undefined && <span className="text-[9px] text-zinc-600 ml-auto">score {s.relevanceScore}</span>}
                </div>
                <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-3">{s.extract}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions IA */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-widest mb-3">Améliorer avec l'IA</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleAiAction('optimize')} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#a5b4fc' }}>
            <Sparkles className="w-3.5 h-3.5" /> Optimiser
          </button>
          <button onClick={() => handleAiAction('shorten')} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
            <FileText className="w-3.5 h-3.5" /> Raccourcir à 15L
          </button>
          <button onClick={() => handleAiAction('clarify')} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
            <Eye className="w-3.5 h-3.5" /> Rendre plus clair
          </button>
          <button onClick={() => handleAiAction('explain')} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
            <MessageSquare className="w-3.5 h-3.5" /> Expliquer simplement
          </button>
          <button onClick={() => handleAiAction('validate')} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', color: '#6ee7b7' }}>
            <CheckCircle className="w-3.5 h-3.5" /> Vérifier
          </button>
        </div>
        {aiLoading && (
          <div className="flex items-center gap-2 mt-3 text-[11px] text-zinc-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Traitement IA en cours…
          </div>
        )}
        {answer.aiNotes && !aiLoading && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
            <p className="text-[12px] text-indigo-400/90 leading-relaxed">{answer.aiNotes}</p>
          </div>
        )}
      </div>

      {/* Chat IA */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(24,24,27,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors mb-3">
          <span>{chatOpen ? '▾' : '▸'}</span> Question à l'IA sur cette réponse
        </button>
        {chatOpen && (
          <div className="space-y-3">
            {chatHistory.map((msg) => (
              <div key={`${msg.role}-${msg.content.substring(0, 15)}`} className={`p-3 rounded-xl ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}
                style={{ background: msg.role === 'user' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.06)', border: msg.role === 'user' ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(16,185,129,0.14)' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: msg.role === 'user' ? '#a5b4fc' : '#6ee7b7' }}>{msg.content}</p>
              </div>
            ))}
            {answer.aiNotes && chatHistory.length === 0 && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}>
                <p className="text-[12px] text-emerald-400/90 leading-relaxed">{answer.aiNotes}</p>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Posez une question sur cette réponse…"
                className="flex-1 px-3 py-2 rounded-xl text-[12px] text-text-primary placeholder-zinc-600 focus:outline-none"
                style={{ background: 'rgba(9,9,11,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
                onKeyPress={e => { if (e.key === 'Enter') handleChatSubmit(); }}
              />
              <button onClick={handleChatSubmit} disabled={aiLoading || !chatInput.trim()}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                Envoyer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Points à vérifier */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
        <h3 className="text-[13px] font-semibold text-amber-400 uppercase tracking-widest mb-2">Brouillon d'aide à la rédaction</h3>
        <p className="text-[12px] text-amber-400/80 mb-3">Vérifiez les sources et reformulez avec vos propres mots avant soumission.</p>
        <p className="text-[11px] text-zinc-500 mb-2">Validation stricte basée uniquement sur les sources du document.</p>
        <ul className="space-y-1.5 text-[11px] text-amber-400/80">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" /> Source suffisante ?
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" /> Réponse ≤ 15 lignes ?
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" /> Conclusion présente ?
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" /> Réponse reformulée avec vos propres mots ?
          </li>
        </ul>
      </div>

      {/* Actions de régénération */}
      {(answer.status === 'error' || answer.status === 'no_source') && (
        <button onClick={onRegenerate}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: '#a5b4fc' }}>
          <RefreshCw className="w-4 h-4" /> Régénérer cette réponse
        </button>
      )}
    </div>
  );
}
