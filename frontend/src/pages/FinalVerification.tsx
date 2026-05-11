import { useState, useEffect } from 'react';
import { analysisApi, type HomeworkQuestion } from '../lib/api';
import { CheckCircle, AlertTriangle, FileCheck, Download, ShieldCheck, Sparkles, TrendingUp, ClipboardCheck, AlertCircle } from 'lucide-react';

export default function FinalVerification() {
  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [checklistState, setChecklistState] = useState<boolean[]>([false, false, false, false, false, false, false]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const qs = await analysisApi.getHomeworkQuestions();
        setQuestions(qs);
      } catch (error) {
        console.error('Failed to load questions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, []);

  const handleChecklistToggle = (index: number) => {
    const newState = [...checklistState];
    newState[index] = !newState[index];
    setChecklistState(newState);
  };

  const handleExport = () => {
    alert('Fonctionnalité d\'export : Les questions sont prêtes à être exportées.');
  };

  const handleSubmit = () => {
    const allChecked = checklistState.every(checked => checked);
    if (allChecked) {
      alert('Devoir validé et prêt à soumettre !');
    } else {
      alert('Veuillez cocher tous les éléments de la liste de vérification avant de soumettre.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready_to_submit': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'corrected': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'copied_to_document': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'draft_written': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'sources_found': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ready_to_submit': return 'Prête à rendre';
      case 'corrected': return 'Corrigée';
      case 'copied_to_document': return 'Copiée dans le document';
      case 'draft_written': return 'Brouillon rédigé';
      case 'sources_found': return 'Sources trouvées';
      default: return 'Non commencée';
    }
  };

  const overallProgress = () => {
    const completed = questions.filter(q => q.status === 'ready_to_submit' || q.status === 'corrected' || q.status === 'copied_to_document').length;
    const needsWork = questions.filter(q => q.status === 'draft_written' || q.status === 'sources_found').length;
    const notStarted = questions.filter(q => q.status === 'not_started').length;
    const copied = questions.filter(q => q.copiedToDocument).length;
    return { completed, needsWork, notStarted, copied };
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          <span className="ml-4 text-text-primary">Chargement...</span>
        </div>
      </div>
    );
  }

  const progress = overallProgress();

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">Étape 4/4</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Vérification finale du devoir</h1>
          <p className="text-text-secondary">
            Vérifiez que toutes les questions sont complètes avant soumission
          </p>
        </div>

        {/* Empty State */}
        {questions.length === 0 && (
          <div className="bg-surface-card border border-border rounded-2xl p-12 text-center">
            <AlertCircle className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">Aucune question ajoutée</h2>
            <p className="text-text-secondary mb-6">
              Ajoutez d'abord les questions du devoir dans la section "Questions du devoir".
            </p>
          </div>
        )}

        {questions.length > 0 && (
          <>
            {/* Progress Overview */}
            <div className="bg-surface-card border border-border rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
            Progression globale
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
              <div className="text-3xl font-bold text-emerald-400">{progress.completed}</div>
              <div className="text-sm text-emerald-400/80">Prêt</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
              <div className="text-3xl font-bold text-green-400">{progress.copied}</div>
              <div className="text-sm text-green-400/80">Copié</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
              <div className="text-3xl font-bold text-amber-400">{progress.needsWork}</div>
              <div className="text-sm text-amber-400/80">À améliorer</div>
            </div>
            <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-5">
              <div className="text-3xl font-bold text-slate-400">{progress.notStarted}</div>
              <div className="text-sm text-slate-400/80">Non commencé</div>
            </div>
          </div>
            </div>

            {/* Questions List */}
            <div className="bg-surface-card border border-border rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <FileCheck className="h-4 w-4 text-purple-400" />
                </div>
                Statut des questions
              </h2>
              <div className="space-y-3">
                {questions.map((question) => {
                  const hasSources = question.sources.length > 0;
                  const hasAnswer = question.draftAnswer.length > 0 || question.correctedAnswer.length > 0;
                  const lineCount = question.draftAnswer.split('\n').length;
                  return (
                    <div key={question.id} className="bg-surface-input border border-border rounded-xl p-4 hover:border-blue-500/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-text-primary">Question {question.id}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(question.status)}`}>
                            {getStatusLabel(question.status)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          {hasSources ? (
                            <CheckCircle size={16} className="text-emerald-400" />
                          ) : (
                            <AlertTriangle size={16} className="text-amber-400" />
                          )}
                          <span className={hasSources ? 'text-emerald-400' : 'text-amber-400'}>
                            Sources
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasAnswer ? (
                            <CheckCircle size={16} className="text-emerald-400" />
                          ) : (
                            <AlertTriangle size={16} className="text-amber-400" />
                          )}
                          <span className={hasAnswer ? 'text-emerald-400' : 'text-amber-400'}>
                            Réponse
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasAnswer && lineCount <= 15 ? (
                            <CheckCircle size={16} className="text-emerald-400" />
                          ) : hasAnswer && lineCount > 15 ? (
                            <AlertTriangle size={16} className="text-red-400" />
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                          <span className={hasAnswer && lineCount <= 15 ? 'text-emerald-400' : hasAnswer && lineCount > 15 ? 'text-red-400' : 'text-text-tertiary'}>
                            {hasAnswer ? `${lineCount} lignes` : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {question.copiedToDocument ? (
                            <CheckCircle size={16} className="text-green-400" />
                          ) : (
                            <AlertTriangle size={16} className="text-amber-400" />
                          )}
                          <span className={question.copiedToDocument ? 'text-green-400' : 'text-amber-400'}>
                            Copié
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {question.status === 'ready_to_submit' || question.status === 'corrected' || question.status === 'copied_to_document' ? (
                            <CheckCircle size={16} className="text-emerald-400" />
                          ) : question.status === 'draft_written' || question.status === 'sources_found' ? (
                            <AlertTriangle size={16} className="text-amber-400" />
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                          <span className={question.status === 'ready_to_submit' || question.status === 'corrected' || question.status === 'copied_to_document' ? 'text-emerald-400' : question.status === 'draft_written' || question.status === 'sources_found' ? 'text-amber-400' : 'text-text-tertiary'}>
                            {question.status === 'copied_to_document' ? 'À vérifier' : question.status === 'ready_to_submit' ? 'Prêt' : question.status === 'corrected' ? 'Corrigé' : question.status === 'draft_written' ? 'Brouillon' : question.status === 'sources_found' ? 'Sources' : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final Checklist */}
            <div className="bg-surface-card border border-border rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ClipboardCheck className="h-4 w-4 text-blue-400" />
                </div>
                Liste de vérification finale
              </h2>
              <div className="space-y-3">
                {[
                  'Les questions ont été traitées',
                  'Chaque réponse cite ses sources (sections, pages)',
                  'Toutes les réponses respectent la limite de 15 lignes',
                  'Les calculs ont été vérifiés',
                  'Le raisonnement fiscal est cohérent',
                  'Les articles de loi sont correctement identifiés',
                  'La structure Faits-Règle-Application-Conclusion est suivie',
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-3 p-4 bg-surface-input border border-border rounded-xl cursor-pointer hover:border-blue-500/30 transition-all">
                    <input
                      type="checkbox"
                      checked={checklistState[idx] || false}
                      onChange={() => handleChecklistToggle(idx)}
                      className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500/50"
                    />
                    <span className="text-text-secondary">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleExport}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                <Download size={20} />
                Exporter le devoir
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-600 transition-all"
              >
                <CheckCircle size={20} />
                Valider et soumettre
              </button>
            </div>

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Rappel important
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Assurez-vous d'avoir vérifié toutes vos réponses avec le PDF fourni avant de soumettre.
                    Les réponses finales doivent être rédigées avec vos propres mots et refléter votre compréhension du matériel du cours.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
