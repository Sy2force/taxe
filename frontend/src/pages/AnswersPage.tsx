import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, CheckCircle, RefreshCw, Loader2, ChevronRight, Sparkles, AlertCircle, BookOpen } from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';

interface Question {
  id: number;
  originalText: string;
  frenchTranslation?: string;
}

interface Source {
  extract: string;
  page?: number;
  documentName: string;
  relevanceScore?: number;
  matchedTerms?: string[];
}

type AnswerStatus = 'not_started' | 'loading' | 'done' | 'no_laws' | 'error';

interface Answer {
  questionId: number;
  suggestion: string;
  whyThisAnswer: string;
  sources: Source[];
  keywords: string[];
  confidence: number;
  status: AnswerStatus;
}

export default function AnswersPage() {
  const { sessionData, generateAnswer, generateAllSuggestions } = useSessionContext();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if laws are imported
  const lawsDocument = sessionData?.documents?.find((d: any) => d.type === 'laws');
  const hasLaws = !!lawsDocument;

  // Load questions from sessionData
  useEffect(() => {
    if (sessionData && sessionData.questions) {
      const qs = sessionData.questions.map((q: any) => ({
        id: q.number,
        originalText: q.original_text || q.originalHebrew || q.original_hebrew || '',
        frenchTranslation: q.frenchTranslation || q.french_translation || ''
      }));
      setQuestions(qs);
    }
  }, [sessionData]);

  // Load answers from sessionData
  useEffect(() => {
    if (sessionData && sessionData.answers) {
      const ansMap = new Map<number, Answer>();
      sessionData.answers.forEach((a: any) => {
        ansMap.set(a.question_id, {
          questionId: a.question_id,
          suggestion: a.suggested_answer || a.hebrew_answer || a.answer || '',
          whyThisAnswer: a.reasoning_fr || a.reasoning || a.french_explanation || '',
          sources: a.sources_json ? (Array.isArray(a.sources_json) ? a.sources_json : JSON.parse(a.sources_json || '[]')) : [],
          keywords: a.keywords_json ? (Array.isArray(a.keywords_json) ? a.keywords_json : JSON.parse(a.keywords_json || '[]')) : (a.keywords_he || a.keywords_fr || []),
          confidence: a.confidence || a.confidence_score || 0,
          status: a.status === 'insufficient_source' ? 'no_laws' : (a.status === 'generated' || a.status === 'improved' ? 'done' : 'not_started')
        });
      });
      setAnswers(ansMap);
    }
  }, [sessionData]);

  const generateAll = async () => {
    if (!hasLaws) return;
    setLoading(true);
    try {
      await generateAllSuggestions();
    } catch (error) {
      console.error('Error generating answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateOne = async (q: Question) => {
    const newMap = new Map(answers);
    newMap.set(q.id, { questionId: q.id, suggestion: '', whyThisAnswer: '', sources: [], keywords: [], confidence: 0, status: 'loading' });
    setAnswers(newMap);
    try {
      await generateAnswer(q.id.toString());
    } catch (error) {
      console.error('Error regenerating answer:', error);
    }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  if (!hasLaws) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-[18px] font-semibold text-text-primary mb-2">Lois fiscales non importées</h2>
          <p className="text-[13px] text-text-tertiary mb-6">Importez d'abord le PDF des lois fiscales pour générer des suggestions.</p>
          <button onClick={() => navigate('/laws')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            <BookOpen className="w-4 h-4" /> Importer les lois fiscales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-widest" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
          Étape 3
        </div>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-2">Suggestions de réponse</h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed max-w-xl">
          Les réponses sont générées exclusivement depuis le document de lois fiscales importé.
        </p>
      </div>

      {/* Generate all button */}
      {!loading && questions.length > 0 && (
        <div className="mb-6">
          <button onClick={generateAll} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            <Sparkles className="w-4 h-4" /> Générer toutes les suggestions
          </button>
        </div>
      )}

      {loading && (
        <div className="mb-6 flex items-center gap-2 text-[13px] text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Génération en cours...
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-4">
        {questions.map((q) => {
          const a = answers.get(q.id);
          const status = a?.status || 'not_started';
          return (
            <div key={q.id} className="rounded-2xl p-5 transition-all" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-text-secondary">Question {q.id}</h3>
                <div className="flex items-center gap-2">
                  {status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {status === 'loading' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                  {status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                </div>
              </div>

              {/* Hebrew question */}
              <div className="mb-3">
                <p className="text-[11px] font-medium text-text-tertiary mb-1">Question (hébreu):</p>
                <p className="text-[13px] text-text-primary leading-relaxed" dir="rtl">{q.originalText}</p>
              </div>

              {/* French translation */}
              {q.frenchTranslation && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1">Traduction (français):</p>
                  <p className="text-[13px] text-text-secondary leading-relaxed">{q.frenchTranslation}</p>
                </div>
              )}

              {/* Suggestion */}
              {status === 'done' && a && (
                <>
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-text-tertiary mb-1">Suggestion de réponse:</p>
                    <p className="text-[13px] text-text-primary leading-relaxed" dir="rtl">{a.suggestion}</p>
                  </div>

                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-text-tertiary mb-1">Pourquoi cette réponse:</p>
                    <p className="text-[13px] text-text-secondary leading-relaxed">{a.whyThisAnswer}</p>
                  </div>

                  {a.sources.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-medium text-text-tertiary mb-1">Sources:</p>
                      <div className="space-y-1">
                        {a.sources.slice(0, 3).map((s, i) => (
                          <p key={i} className="text-[12px] text-text-tertiary">
                            - Page {s.page || '?'} : {s.extract.substring(0, 100)}...
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {a.keywords.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-medium text-text-tertiary mb-1">Mots-clés:</p>
                      <p className="text-[12px] text-text-tertiary">{a.keywords.join(', ')}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-text-tertiary mb-1">Confiance: {a.confidence}%</p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => copyText(a.suggestion)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
                      <Copy className="w-3 h-3" /> Copier
                    </button>
                    <button onClick={() => regenerateOne(q)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                      <RefreshCw className="w-3 h-3" /> Régénérer
                    </button>
                  </div>
                </>
              )}

              {status === 'not_started' && (
                <button onClick={() => regenerateOne(q)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                  <Sparkles className="w-3.5 h-3.5" /> Générer
                </button>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-[12px] text-red-400">Erreur lors de la génération</span>
                  <button onClick={() => regenerateOne(q)} className="text-[11px] text-indigo-400 underline">Réessayer</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {questions.length > 0 && Array.from(answers.values()).some(a => a.status === 'done') && (
        <div className="mt-8 flex justify-end">
          <button onClick={() => navigate('/final-document')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            Continuer vers Document final
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
