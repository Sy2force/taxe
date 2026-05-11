import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy, ChevronLeft, CheckCircle, Loader2, AlertCircle,
} from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';

export default function FinalCheckPage() {
  const { sessionData, generateFinalReport } = useSessionContext();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const questions = sessionData?.questions || [];
  const answers = sessionData?.answers || [];
  const finalChecks = sessionData?.finalChecks || [];
  const finalReport = sessionData?.finalReport;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateFinalReport();
    } catch (err) {
      console.error('Failed to generate final report:', err);
    }
    setGenerating(false);
  };

  const copyHebrewAnswers = () => {
    const text = questions.map((q: any, i: number) => {
      const answer = answers.find((a: any) => a.question_id === q.id);
      return `Question ${i + 1}:\n${answer?.hebrew_answer || 'Non générée'}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopyFeedback('Réponses hébreu copiées');
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const copyAnswersWithSources = () => {
    const text = questions.map((q: any, i: number) => {
      const answer = answers.find((a: any) => a.question_id === q.id);
      const sources = answer?.sources_json || [];
      return `Question ${i + 1}:\n${answer?.hebrew_answer || 'Non générée'}\n\nSources: ${sources.map((s: any) => s.extract).join('; ')}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopyFeedback('Réponses + sources copiées');
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const copyFinalReport = () => {
    const text = finalReport?.final_text || 'Rapport non généré';
    navigator.clipboard.writeText(text);
    setCopyFeedback('Rapport final copié');
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const avgScore = finalChecks.length > 0 
    ? finalChecks.reduce((sum: number, c: any) => sum + (c.score || 0), 0) / finalChecks.length 
    : 0;

  const isHebrew = (t: string) => /[\u0590-\u05FF]/.test(t);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <div className="inline-flex items-center px-3 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-widest"
          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fda4af' }}>
          Étape 5
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-1">Document final</h1>
            <p className="text-[13px] text-text-tertiary max-w-sm leading-relaxed">
              Rapport final avec toutes les réponses, sources et vérifications.
            </p>
          </div>
          <button onClick={() => navigate('/verification')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <ChevronLeft className="w-3.5 h-3.5" /> Vérification
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <AlertCircle className="w-7 h-7 text-indigo-400" />
          </div>
          <p className="text-[14px] font-semibold text-text-primary mb-1.5">Aucune question trouvée</p>
          <p className="text-[13px] text-text-tertiary mb-6">Commencez par importer votre exercice et générer les réponses.</p>
          <button onClick={() => navigate('/exercise')}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
            Aller à l'exercice
          </button>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(24,24,27,0.85)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[15px] font-bold text-text-primary tracking-tight">Rapport final</p>
                <p className="text-[11px] text-text-muted mt-0.5">{questions.length} question(s) • {answers.length} réponse(s) • {finalChecks.length} vérification(s)</p>
              </div>
              <div className="text-right">
                <p className="text-[32px] font-bold leading-none tracking-tight tabular-nums" style={{ color: avgScore >= 80 ? '#34d399' : avgScore >= 60 ? '#fbbf24' : '#fb923c' }}>
                  {Math.round(avgScore)}
                  <span className="text-[16px] text-text-muted font-normal">/100</span>
                </p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Score moyen</p>
              </div>
            </div>

            {/* Metadata sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Exercise metadata */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">Exercice</p>
                {sessionData?.documents?.find((d: any) => d.type === 'exercise') ? (
                  <div className="space-y-1">
                    <p className="text-[11px] text-text-secondary truncate">{sessionData.documents.find((d: any) => d.type === 'exercise').filename}</p>
                    <p className="text-[10px] text-text-muted">{sessionData.documents.find((d: any) => d.type === 'exercise').character_count?.toLocaleString()} caractères</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500">Non importé</p>
                )}
              </div>

              {/* Laws metadata */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.14)' }}>
                <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest mb-2">Lois fiscales</p>
                {sessionData?.documents?.find((d: any) => d.type === 'laws') ? (
                  <div className="space-y-1">
                    <p className="text-[11px] text-text-secondary truncate">{sessionData.documents.find((d: any) => d.type === 'laws').filename}</p>
                    <p className="text-[10px] text-text-muted">{sessionData.documents.find((d: any) => d.type === 'laws').page_count || '~243'} pages • {sessionData.documents.find((d: any) => d.type === 'laws').chunks_count || 0} chunks</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500">Non importé</p>
                )}
              </div>
            </div>

            {/* Final recommendation */}
            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-1">Recommandation finale</p>
              <p className="text-[12px] text-text-secondary">
                {avgScore >= 80 ? 'Prêt pour soumission' : avgScore >= 60 ? 'Besoin de révision mineure' : 'Besoin de révision importante'}
              </p>
            </div>

            {/* Copy buttons */}
            <div className="flex flex-wrap gap-2">
              <button onClick={copyHebrewAnswers}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={{ background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', color: '#71717a' }}>
                <Copy className="w-3.5 h-3.5" /> Copier réponses hébreu
              </button>
              <button onClick={copyAnswersWithSources}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                style={{ background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', color: '#71717a' }}>
                <Copy className="w-3.5 h-3.5" /> Copier réponses + sources
              </button>
              {finalReport && (
                <button onClick={copyFinalReport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                  style={{ background: 'rgba(39,39,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', color: '#71717a' }}>
                  <Copy className="w-3.5 h-3.5" /> Copier rapport final
                </button>
              )}
              {!finalReport && (
                <button onClick={handleGenerate} disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {generating ? 'Génération...' : 'Générer rapport'}
                </button>
              )}
            </div>
          </div>

          {/* Copy feedback */}
          {copyFeedback && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-6"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <p className="text-[12px] text-emerald-400">{copyFeedback}</p>
            </div>
          )}

          {/* Questions and answers */}
          <div className="space-y-4">
            {questions.map((q: any, i: number) => {
              const answer = answers.find((a: any) => a.question_id === q.id);
              const check = finalChecks.find((c: any) => c.question_id === q.id);
              const sources = answer?.sources_json || [];

              return (
                <div key={q.id} className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(24,24,27,0.75)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {/* Question header */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0 tabular-nums"
                      style={{ background: 'rgba(244,63,94,0.12)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.2)' }}>
                      {i + 1}
                    </span>
                    <p className={`flex-1 text-[12px] text-text-secondary leading-relaxed truncate ${isHebrew(q.original_text) ? 'text-right' : ''}`}
                      dir={isHebrew(q.original_text) ? 'rtl' : 'ltr'}>
                      {q.original_text.substring(0, 80)}{q.original_text.length > 80 ? '…' : ''}
                    </p>
                    {check && (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
                        {Math.round(check.score)}/100
                      </span>
                    )}
                  </div>

                  {/* Answer */}
                  <div className="px-4 py-4 space-y-3">
                    {answer?.hebrew_answer ? (
                      <div>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Réponse hébreu</p>
                        <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap" dir="rtl">{answer.hebrew_answer}</p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-text-muted italic">Non générée</p>
                    )}

                    {answer?.french_explanation && (
                      <div>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Explication française</p>
                        <p className="text-[12px] text-text-secondary leading-relaxed">{answer.french_explanation}</p>
                      </div>
                    )}

                    {sources.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Sources</p>
                        <div className="space-y-1.5">
                          {sources.slice(0, 2).map((s: any, si: number) => (
                            <div key={si} className="px-3 py-2 rounded-xl"
                              style={{ background: 'rgba(9,9,11,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2">{s.extract}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {check?.issues_json && check.issues_json.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-2">Problèmes</p>
                        <div className="space-y-1">
                          {check.issues_json.map((issue: string, ii: number) => (
                            <p key={ii} className="text-[12px] text-amber-400/90">• {issue}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {finalReport && (
            <div className="mt-6 p-4 rounded-2xl"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-[12px] text-emerald-400 text-center">
                Rapport final généré le {new Date(finalReport.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
