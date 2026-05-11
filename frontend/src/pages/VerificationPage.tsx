import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { useSessionContext } from '../contexts/SessionContext';

interface AnswerData {
  question_id: string;
  hebrew_answer: string;
  sources_json: any[];
  status: string;
  copied: boolean;
}

type FinalStatus = 'ready' | 'verify' | 'no_source' | 'too_long' | 'not_generated';

function getFinalStatus(a: AnswerData | undefined): FinalStatus {
  if (!a || a.status === 'error' || a.status === 'loading') return 'not_generated';
  if (a.status === 'no_source' || !a.sources_json || a.sources_json.length === 0) return 'no_source';
  const lines = a.hebrew_answer.split('\n').filter(l => l.trim()).length;
  if (lines > 15) return 'too_long';
  if (a.status === 'completed' && a.hebrew_answer.length > 20) return 'ready';
  return 'verify';
}

const statusConfig: Record<FinalStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  ready: { label: 'Prête', color: 'text-emerald-400', icon: CheckCircle },
  verify: { label: 'À vérifier', color: 'text-yellow-400', icon: AlertCircle },
  no_source: { label: 'Source manquante', color: 'text-orange-400', icon: AlertCircle },
  too_long: { label: 'Trop longue', color: 'text-red-400', icon: XCircle },
  not_generated: { label: 'Non générée', color: 'text-text-tertiary', icon: XCircle },
};

export default function VerificationPage() {
  const { sessionData, finalVerify } = useSessionContext();
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  const questions = sessionData?.questions || [];
  const answers = sessionData?.answers || [];
  
  const answersMap = new Map(answers.map((a: AnswerData) => [a.question_id, a]));
  
  const ready = questions.filter(q => getFinalStatus(answersMap.get(q.id)) === 'ready').length;
  const total = questions.length;
  const pct = total > 0 ? Math.round((ready / total) * 100) : 0;

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await finalVerify();
    } catch (err) {
      console.error('Verification failed:', err);
    }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-3xl mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <div className="inline-flex items-center px-3 py-1.5 rounded-full mb-4 text-[11px] font-semibold uppercase tracking-widest"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
          Étape 4
        </div>
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight mb-1">Vérification</h1>
        <p className="text-[13px] text-text-tertiary">État de chaque réponse avant soumission finale.</p>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <AlertCircle className="w-7 h-7 text-indigo-400" />
          </div>
          <p className="text-[14px] font-semibold text-text-primary mb-1.5">Aucune question trouvée</p>
          <p className="text-[13px] text-text-tertiary mb-6">Commencez par importer votre exercice.</p>
          <button onClick={() => navigate('/exercise')}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
            Aller à l'exercice
          </button>
        </div>
      ) : (
        <>
          {/* Score card */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-text-secondary tracking-tight">Progression globale</p>
              <p className="text-[26px] font-bold tracking-tight"
                style={{ color: pct === 100 ? '#34d399' : pct >= 50 ? '#818cf8' : '#fb923c' }}>
                {pct}%
              </p>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct === 100
                    ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : pct >= 50
                    ? 'linear-gradient(90deg,#6366f1,#818cf8)'
                    : 'linear-gradient(90deg,#f59e0b,#fb923c)',
                }} />
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { key: 'ready',         label: 'Prêtes',          color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                { key: 'verify',        label: 'À vérifier',      color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                { key: 'no_source',     label: 'Sans source',     color: '#fb923c', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
                { key: 'not_generated', label: 'Non générées',    color: '#71717a', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.2)' },
              ] as const).map(s => {
                const count = questions.filter(q => getFinalStatus(answersMap.get(q.id)) === s.key).length;
                return (
                  <div key={s.key} className="rounded-xl p-3 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <p className="text-[18px] font-bold tabular-nums" style={{ color: s.color }}>{count}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question rows */}
          <div className="space-y-2 mb-6">
            {questions.map((q) => {
              const a = answersMap.get(q.id);
              const finalStatus = getFinalStatus(a);
              const cfg = statusConfig[finalStatus];
              const StatusIcon = cfg.icon;
              const lines = a?.hebrew_answer ? a.hebrew_answer.split('\n').filter(l => l.trim()).length : 0;
              const hasAnswer = !!a?.hebrew_answer && a.hebrew_answer.length > 10;
              const hasSource = (a?.sources_json?.length || 0) > 0;
              const within15 = lines <= 15 && lines > 0;

              return (
                <div key={q.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(24,24,27,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>

                  {/* Q number */}
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 tabular-nums"
                    style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.22)' }}>
                    {q.id}
                  </span>

                  {/* Question text */}
                  <span className="flex-1 text-[12px] text-text-tertiary truncate">{q.original_text.substring(0, 55)}{q.original_text.length > 55 ? '…' : ''}</span>

                  {/* Checks — hidden on mobile, visible sm+ */}
                  <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    {[
                      { val: hasSource, label: 'src' },
                      { val: hasAnswer, label: 'rép' },
                      { val: within15,  label: '≤15' },
                      { val: !!a?.copied, label: 'cpy' },
                    ].map(({ val, label }) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        {val
                          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          : <XCircle className="w-3.5 h-3.5 text-zinc-700" />}
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status badge */}
                  <span className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-1 rounded-lg flex-shrink-0 ${cfg.color}`}
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">{cfg.label}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/answers')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium text-text-tertiary hover:text-text-secondary transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <ChevronLeft className="w-4 h-4" /> Réponses
            </button>
            <div className="flex items-center gap-3">
              {!verifying && (
                <button onClick={handleVerify}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
                  Lancer la vérification
                </button>
              )}
              {verifying && (
                <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-text-tertiary">
                  <Loader2 className="w-4 h-4 animate-spin" /> Vérification...
                </div>
              )}
              {pct === 100 && sessionData?.finalChecks && sessionData.finalChecks.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                  <CheckCircle className="w-4 h-4" /> Vérifié
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
