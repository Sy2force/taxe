import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, AlertCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';

export default function FinalCheckPage() {
  const { sessionData, generateFinalReport } = useSessionContext();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  const questions = sessionData?.questions || [];
  const finalChecks = sessionData?.finalChecks || [];
  const finalReport = sessionData?.finalReport;
  const hasVerification = finalChecks.length > 0;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateFinalReport();
    } catch (err) {
      console.error('Failed to generate final report:', err);
    }
    setGenerating(false);
  };

  const avgScore = finalChecks.length > 0 
    ? finalChecks.reduce((sum: number, c: any) => sum + (c.score || 0), 0) / finalChecks.length 
    : 0;

  // Calculate strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  finalChecks.forEach((check: any) => {
    if (check.score >= 80) {
      strengths.push(`Question ${check.question_id}: excellente compréhension`);
    } else if (check.score < 60) {
      weaknesses.push(`Question ${check.question_id}: révision nécessaire`);
    }
  });

  if (finalChecks.length === 0) {
    weaknesses.push('Aucune correction effectuée');
  }

  // Global suggestions based on average score
  let globalSuggestions: string[] = [];
  if (avgScore >= 80) {
    globalSuggestions = ['Excellent travail, prêt pour soumission', 'Vérifier la cohérence globale des réponses'];
  } else if (avgScore >= 60) {
    globalSuggestions = ['Bon travail, quelques améliorations nécessaires', 'Revoir les questions avec score < 80', 'Vérifier les sources citées'];
  } else {
    globalSuggestions = ['Révision importante nécessaire', 'Consulter le document de lois fiscales', 'Reprendre les questions avec score < 60'];
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">
      {/* Workflow guard: verification not done */}
      {!hasVerification && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-[18px] font-semibold text-text-primary mb-2">Vérification non effectuée</h2>
          <p className="text-[13px] text-text-tertiary mb-6">Effectuez d'abord la correction des réponses avec les lois fiscales.</p>
          <button onClick={() => navigate('/verification')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            Corriger les réponses
          </button>
        </div>
      )}

      {/* Page header */}
      {hasVerification && (
      <>
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-widest" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fda4af' }}>
          Étape 6
        </div>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-2">Rapport global final</h1>
        <p className="text-[14px] text-text-tertiary leading-relaxed max-w-xl">
          Synthèse globale de la correction de toutes les réponses.
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <AlertCircle className="w-7 h-7 text-indigo-400" />
          </div>
          <p className="text-[14px] font-semibold text-text-primary mb-1.5">Aucune question trouvée</p>
          <p className="text-[13px] text-text-tertiary mb-6">Commencez par importer votre exercice et compléter le workflow.</p>
          <button onClick={() => navigate('/exercise')} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
            Aller à l'exercice
          </button>
        </div>
      ) : (
        <>
          {/* Global score card */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(24,24,27,0.85)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-center mb-6">
              <p className="text-[15px] font-semibold text-text-secondary mb-3">Note globale</p>
              <p className="text-[48px] font-bold leading-none tracking-tight tabular-nums" style={{ color: avgScore >= 80 ? '#34d399' : avgScore >= 60 ? '#fbbf24' : '#fb923c' }}>
                {Math.round(avgScore)}
                <span className="text-[24px] text-text-muted font-normal">/100</span>
              </p>
              <p className="text-[12px] text-text-muted mt-2">{finalChecks.length} réponse(s) corrigée(s)</p>
            </div>

            {/* Recommendation */}
            <div className="rounded-xl p-4 text-center" style={{ background: avgScore >= 80 ? 'rgba(16,185,129,0.1)' : avgScore >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(249,115,22,0.1)', border: avgScore >= 80 ? '1px solid rgba(16,185,129,0.2)' : avgScore >= 60 ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(249,115,22,0.2)' }}>
              <p className="text-[14px] font-semibold" style={{ color: avgScore >= 80 ? '#34d399' : avgScore >= 60 ? '#fbbf24' : '#fb923c' }}>
                {avgScore >= 80 ? 'Excellent - Prêt pour soumission' : avgScore >= 60 ? 'Bon - Quelques améliorations nécessaires' : 'Révision importante nécessaire'}
              </p>
            </div>
          </div>

          {/* Summary of corrections */}
          <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-[16px] font-semibold text-text-primary mb-4">Résumé des corrections</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-text-tertiary">Questions corrigées:</span>
                <span className="text-text-primary">{finalChecks.length}/{questions.length}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-text-tertiary">Score moyen:</span>
                <span className="text-text-primary">{Math.round(avgScore)}/100</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-text-tertiary">Questions avec score ≥ 80:</span>
                <span className="text-text-primary">{finalChecks.filter((c: any) => c.score >= 80).length}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-text-tertiary">Questions avec score &lt; 60:</span>
                <span className="text-text-primary">{finalChecks.filter((c: any) => c.score < 60).length}</span>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h2 className="text-[15px] font-semibold text-emerald-400">Points forts</h2>
              </div>
              <ul className="space-y-2">
                {strengths.map((strength, i) => (
                  <li key={i} className="text-[13px] text-text-secondary">• {strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {weaknesses.length > 0 && (
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="text-[15px] font-semibold text-amber-400">Points faibles</h2>
              </div>
              <ul className="space-y-2">
                {weaknesses.map((weakness, i) => (
                  <li key={i} className="text-[13px] text-text-secondary">• {weakness}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Global suggestions */}
          <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-indigo-400" />
              <h2 className="text-[15px] font-semibold text-indigo-400">Suggestions globales</h2>
            </div>
            <ul className="space-y-2">
              {globalSuggestions.map((suggestion, i) => (
                <li key={i} className="text-[13px] text-text-secondary">• {suggestion}</li>
              ))}
            </ul>
          </div>

          {/* Generate report button */}
          {!finalReport && (
            <div className="mb-6">
              <button onClick={handleGenerate} disabled={generating} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50 transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
                {generating ? <CheckCircle className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {generating ? 'Génération en cours...' : 'Générer le rapport final'}
              </button>
            </div>
          )}

          {finalReport && (
            <div className="rounded-2xl p-4 mb-6 text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-[12px] text-emerald-400">Rapport final généré le {new Date(finalReport.created_at).toLocaleString('fr-FR')}</p>
            </div>
          )}

          {/* Back button */}
          <div className="flex justify-between">
            <button onClick={() => navigate('/verification')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium text-text-tertiary hover:text-text-secondary transition-colors" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <ChevronLeft className="w-4 h-4" /> Vérification
            </button>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
