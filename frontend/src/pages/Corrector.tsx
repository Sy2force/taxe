import { useState } from 'react';
import { analysisApi, type AnswerCorrection, type LineCount } from '../lib/api';
import { CheckCircle, XCircle, AlertTriangle, FileText, LineChart, Sparkles, AlertCircle, Zap, TrendingUp, Award } from 'lucide-react';

export default function Corrector() {
  const [answer, setAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [correction, setCorrection] = useState<AnswerCorrection | null>(null);
  const [lineCount, setLineCount] = useState<LineCount | null>(null);
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);

  const handleCountLines = async () => {
    try {
      const count = await analysisApi.countLines(answer);
      setLineCount(count);
    } catch (error) {
      console.error('Count failed:', error);
    }
  };

  const handleCorrect = async () => {
    if (!answer.trim() || !question.trim()) return;
    
    setLoading(true);
    try {
      const result = await analysisApi.correctAnswer(answer, question, useAI);
      setCorrection(result);
    } catch (error) {
      console.error('Correction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'complete': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500';
      case 'almost_complete': return 'bg-gold-500/20 text-gold-400 border-gold-500';
      case 'needs_improvement': return 'bg-orange-500/20 text-orange-400 border-orange-500';
      case 'incomplete': return 'bg-red-500/20 text-red-400 border-red-500';
      default: return 'bg-surface-input text-text-secondary border-border';
    }
  };

  const getScoreLabel = (score: string) => {
    switch (score) {
      case 'complete': return 'Complet';
      case 'almost_complete': return 'Presque complet';
      case 'needs_improvement': return 'À améliorer';
      case 'incomplete': return 'Incomplet';
      default: return score;
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Correction de Réponse</h1>
          <p className="text-text-secondary">
            Collez votre réponse et question pour une correction détaillée
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-surface-card border border-border rounded-2xl p-6">
            <label className="block text-sm font-medium text-text-primary mb-2">Question de devoir</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Collez la question ici..."
              rows={4}
              className="w-full px-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
            />
          </div>

          <div className="bg-surface-card border border-border rounded-2xl p-6">
            <label className="block text-sm font-medium text-text-primary mb-2">Votre réponse</label>
            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                handleCountLines();
              }}
              placeholder="Collez votre réponse ici..."
              rows={4}
              className="w-full px-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
            />
            {lineCount && (
              <div className={`mt-3 flex items-center gap-2 text-sm ${lineCount.exceedsLimit ? 'text-red-400' : 'text-emerald-400'}`}>
                <LineChart className="h-4 w-4" />
                <span>{lineCount.lines} lignes • {lineCount.words} mots</span>
                {lineCount.exceedsLimit && (
                  <span className="font-semibold bg-red-500/20 px-2 py-0.5 rounded">(Dépasse la limite de 15 lignes !)</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-input border border-border rounded-full peer peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-text-tertiary rounded-full transition-all peer-checked:translate-x-5 peer-checked:bg-white"></div>
            </div>
            <span className="text-sm text-text-secondary">Utiliser l'IA (si disponible)</span>
          </label>
          
          <button
            onClick={handleCorrect}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Correction en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Corriger la réponse
              </>
            )}
          </button>
        </div>

        {correction && (
          <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-1">Score global</h2>
                  <p className="text-sm text-text-secondary">Basé sur la complétude et la qualité</p>
                </div>
                <span className={`px-6 py-3 rounded-full border-2 font-semibold text-lg ${getScoreColor(correction.score)}`}>
                  {getScoreLabel(correction.score)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="bg-surface-card border border-border rounded-2xl p-6 border-l-4 border-l-emerald-500">
                <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                  Points forts
                </h2>
                <ul className="space-y-3">
                  {correction.positivePoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3 text-text-secondary">
                      <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Missing Elements */}
              <div className="bg-surface-card border border-border rounded-2xl p-6 border-l-4 border-l-red-500">
                <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-400" />
                  </div>
                  Éléments manquants
                </h2>
                <ul className="space-y-3">
                  {correction.missingElements.map((item, index) => (
                    <li key={index} className="flex items-start gap-3 text-text-secondary">
                      <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Legal/Tax Issues */}
            <div className="bg-surface-card border border-border rounded-2xl p-6 border-l-4 border-l-orange-500">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                </div>
                Problèmes juridiques et fiscaux à vérifier
              </h2>
              <ul className="space-y-3">
                {correction.legalTaxIssues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-3 text-text-secondary">
                    <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Language Correction */}
              <div className="bg-surface-card border border-border rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-400" />
                  </div>
                  Correction linguistique
                </h2>
                <p className="text-text-secondary leading-relaxed">{correction.languageCorrection}</p>
              </div>

              {/* Improvement Advice */}
              <div className="bg-surface-card border border-border rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                  </div>
                  Conseils d'amélioration
                </h2>
                <ul className="space-y-3">
                  {correction.improvementAdvice.map((advice, index) => (
                    <li key={index} className="flex items-start gap-3 text-text-secondary">
                      <Zap className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Final Checklist */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Award className="h-4 w-4 text-emerald-400" />
                </div>
                Liste de vérification finale
              </h2>
              <ul className="space-y-3">
                {correction.finalChecklist.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-text-secondary">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
