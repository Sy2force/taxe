import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronLeft, Loader2, RefreshCw, ChevronRight, BookOpen } from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';

export default function VerificationPage() {
  const { sessionData, correctFinalDocument } = useSessionContext();
  const [correcting, setCorrecting] = useState(false);
  const navigate = useNavigate();

  const questions = sessionData?.questions || [];
  const finalChecks = sessionData?.finalChecks || [];
  const lawsDocument = sessionData?.documents?.find((d: any) => d.type === 'laws');
  const hasLaws = !!lawsDocument;
  const finalDocument = sessionData?.documents?.find((d: any) => d.type === 'final');
  const hasFinalDocument = !!finalDocument;

  const handleCorrect = async () => {
    if (!hasLaws) return;
    setCorrecting(true);
    try {
      await correctFinalDocument();
    } catch (err) {
      console.error('Correction failed:', err);
    }
    setCorrecting(false);
  };

  const handleRegenerate = async () => {
    setCorrecting(true);
    try {
      await correctFinalDocument();
    } catch (err) {
      console.error('Regeneration failed:', err);
    }
    setCorrecting(false);
  };

  if (!hasLaws) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-[18px] font-semibold text-text-primary mb-2">Lois fiscales non importées</h2>
          <p className="text-[13px] text-text-tertiary mb-6">Importez d'abord le PDF des lois fiscales pour corriger les réponses.</p>
          <button onClick={() => navigate('/laws')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            <BookOpen className="w-4 h-4" /> Importer les lois fiscales
          </button>
        </div>
      </div>
    );
  }

  if (!hasFinalDocument) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-[18px] font-semibold text-text-primary mb-2">Document final non importé</h2>
          <p className="text-[13px] text-text-tertiary mb-6">Importez d'abord le PDF de l'exercice rempli par l'étudiant.</p>
          <button onClick={() => navigate('/final-document')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            Importer le document final
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-widest" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
          Étape 5
        </div>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-2">Correction des réponses</h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed max-w-xl">
          Les réponses sont corrigées exclusivement depuis le document de lois fiscales importé.
        </p>
      </div>

      {/* Correct button */}
      {!correcting && finalChecks.length === 0 && (
        <div className="mb-6">
          <button onClick={handleCorrect} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            Corriger toutes les réponses
          </button>
        </div>
      )}

      {correcting && (
        <div className="mb-6 flex items-center gap-2 text-[13px] text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Correction en cours...
        </div>
      )}

      {finalChecks.length > 0 && (
        <div className="mb-6">
          <button onClick={handleRegenerate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
            <RefreshCw className="w-3.5 h-3.5" /> Régénérer la correction
          </button>
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-4">
        {questions.map((q) => {
          const check = finalChecks.find((c: any) => c.question_id === q.id);
          const answer = sessionData?.answers?.find((a: any) => a.question_id === q.id);
          const studentAnswer = answer?.user_answer || answer?.suggested_answer || '';
          const confidence = answer?.confidence || 0;
          const sources = answer?.sources_json ? (Array.isArray(answer.sources_json) ? answer.sources_json : JSON.parse(answer.sources_json || '[]')) : [];
          const keywords = answer?.keywords_json ? (Array.isArray(answer.keywords_json) ? answer.keywords_json : JSON.parse(answer.keywords_json || '[]')) : [];
          const reasoning = answer?.reasoning_fr || '';

          if (!check) {
            return (
              <div key={q.id} className="rounded-2xl p-5" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-semibold text-text-secondary">Question {q.id}</h3>
                  <span className="text-[11px] text-text-muted">Non corrigé</span>
                </div>
                <p className="text-[13px] text-text-primary leading-relaxed" dir="rtl">{q.original_text || q.original_hebrew || ''}</p>
              </div>
            );
          }

          const score = check?.score || 0;

          return (
            <div key={q.id} className="rounded-2xl p-5" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-semibold text-text-secondary">Question {q.id}</h3>
                <span className="text-[18px] font-bold tabular-nums px-2 py-1 rounded-lg" style={{ background: score >= 80 ? 'rgba(16,185,129,0.1)' : score >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(249,115,22,0.1)', border: score >= 80 ? '1px solid rgba(16,185,129,0.2)' : score >= 60 ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(249,115,22,0.2)', color: score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#fb923c' }}>
                  {Math.round(score)}/100
                </span>
              </div>

              {/* Question */}
              <div className="mb-3">
                <p className="text-[11px] font-medium text-text-tertiary mb-1">Question:</p>
                <p className="text-[13px] text-text-primary leading-relaxed" dir="rtl">{q.original_text || q.original_hebrew || ''}</p>
              </div>

              {/* Student answer */}
              {studentAnswer && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1">Réponse étudiant:</p>
                  <p className="text-[13px] text-text-secondary leading-relaxed" dir="rtl">{studentAnswer}</p>
                </div>
              )}

              {/* RAG Sources */}
              {sources.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1">Pages utilisées:</p>
                  <div className="space-y-1">
                    {sources.slice(0, 3).map((s: any, i: number) => (
                      <p key={i} className="text-[12px] text-cyan-400/90">
                        - Page {s.pageNumber}: {s.whyUseful}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1">Mots-clés:</p>
                  <p className="text-[12px] text-text-tertiary">{keywords.join(', ')}</p>
                </div>
              )}

              {/* Confidence */}
              {confidence > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1">Confiance de la génération: {confidence}%</p>
                </div>
              )}

              {/* Reasoning */}
              {reasoning && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1">Pourquoi cette réponse:</p>
                  <p className="text-[12px] text-text-secondary">{reasoning}</p>
                </div>
              )}

              {/* Correction */}
              {check.corrections_json && check.corrections_json.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1">Correction:</p>
                  <div className="space-y-1">
                    {check.corrections_json.slice(0, 3).map((correction: string, i: number) => (
                      <p key={i} className="text-[12px] text-indigo-400/90">• {correction}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              {check.issues_json && check.issues_json.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1">Suggestions d'amélioration:</p>
                  <div className="space-y-1">
                    {check.issues_json.slice(0, 3).map((issue: string, i: number) => (
                      <p key={i} className="text-[12px] text-amber-400/90">• {issue}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {finalChecks.length > 0 && (
        <div className="mt-8 flex justify-end">
          <button onClick={() => navigate('/final')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            Continuer vers Final
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Back button */}
      <div className="mt-6">
        <button onClick={() => navigate('/final-document')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium text-text-tertiary hover:text-text-secondary transition-colors" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <ChevronLeft className="w-4 h-4" /> Document final
        </button>
      </div>
    </div>
  );
}
