import { useState, useEffect, useCallback, useRef } from 'react';
import { documentsApi, analysisApi, type Document, type HomeworkQuestion } from '../lib/api';
import { Upload, FileText, RotateCcw, CheckCircle, ArrowRight, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const hasLoaded = useRef(false);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await documentsApi.getAll();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      const qs = await analysisApi.getHomeworkQuestions();
      setQuestions(qs);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) {
      loadDocuments();
      loadQuestions();
      hasLoaded.current = true;
    }
  }, [loadDocuments, loadQuestions]);

  const handleNewSession = async () => {
    try {
      // Call backend API to reset all data
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/reset-all`, {
        method: 'POST',
      });
      
      // Clear localStorage
      localStorage.clear();
      
      // Reset state
      setDocuments([]);
      setQuestions([]);
      setShowResetDialog(false);
      
      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset session:', error);
      alert('Erreur lors de la réinitialisation. Veuillez réessayer.');
    }
  };

  const getHomeworkStats = () => {
    const total = questions.length;
    const analyzed = questions.filter(q => q.status !== 'not_started').length;
    const hasSources = questions.filter(q => q.sources.length > 0).length;
    const hasDraft = questions.filter(q => q.draftAnswer.length > 0).length;
    const ready = questions.filter(q => q.status === 'ready_to_submit' || q.status === 'copied_to_document').length;
    const copied = questions.filter(q => q.copiedToDocument).length;
    const progress = total > 0 ? Math.round((ready / total) * 100) : 0;
    return { total, analyzed, hasSources, hasDraft, ready, copied, progress };
  };

  const stats = getHomeworkStats();
  const workflowSteps = [
    {
      step: 1,
      title: '1. Importer le document',
      description: 'Importez le PDF de lois fiscales (243 pages)',
      link: '/upload',
      completed: documents.length > 0,
      disabled: false,
    },
    {
      step: 2,
      title: '2. Ajouter les questions',
      description: 'Ajoutez vos questions une par une',
      link: '/homework',
      completed: stats.total > 0,
      disabled: documents.length === 0,
    },
    {
      step: 3,
      title: '3. Analyser et répondre',
      description: 'Analysez chaque question et générez des réponses guidées',
      link: stats.total > 0 ? '/question' : '#',
      completed: stats.hasDraft > 0,
      disabled: stats.total === 0,
    },
    {
      step: 4,
      title: '4. Vérifier et soumettre',
      description: 'Vérifiez tout avant soumission finale',
      link: '/verification',
      completed: stats.ready === stats.total && stats.total > 0,
      disabled: stats.total === 0 || stats.hasDraft === 0,
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Tableau de bord</h1>
            <p className="text-text-secondary">Gérez votre devoir de fiscalité des sociétés</p>
          </div>
          <button
            onClick={() => setShowResetDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-input border border-border text-text-secondary rounded-lg hover:bg-surface-card hover:text-text-primary transition-all"
          >
            <RotateCcw size={16} />
            Nouvelle session
          </button>
        </div>

        {/* Reset Dialog */}
        {showResetDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface-card border border-border rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-text-primary mb-3">Nouvelle session</h3>
              <p className="text-text-secondary mb-6">Voulez-vous vraiment recommencer ce devoir depuis zéro ? Cette action supprimera toutes les questions, analyses et brouillons.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetDialog(false)}
                  className="flex-1 px-4 py-2 bg-surface-input border border-border text-text-primary rounded-lg hover:bg-surface-card transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleNewSession}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  Recommencer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats - Homework Progress */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-surface-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText size={20} className="text-blue-400" />
              </div>
              {documents.length > 0 && <CheckCircle size={16} className="text-emerald-400" />}
            </div>
            <div className="text-2xl font-bold text-text-primary">{documents.length > 0 ? 'Importé' : 'Non'}</div>
            <div className="text-sm text-text-secondary">Document principal</div>
          </div>
          <div className="bg-surface-card border border-border rounded-xl p-5">
            <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
            <div className="text-sm text-text-secondary">Questions détectées</div>
          </div>
          <div className="bg-surface-card border border-border rounded-xl p-5">
            <div className="text-2xl font-bold text-text-primary">{stats.analyzed}</div>
            <div className="text-sm text-text-secondary">Analysées</div>
          </div>
          <div className="bg-surface-card border border-border rounded-xl p-5">
            <div className="text-2xl font-bold text-text-primary">{stats.hasDraft}</div>
            <div className="text-sm text-text-secondary">Brouillons</div>
          </div>
          <div className="bg-surface-card border border-border rounded-xl p-5">
            <div className="text-2xl font-bold text-text-primary">{stats.copied}</div>
            <div className="text-sm text-text-secondary">Copiées</div>
          </div>
          <div className="bg-surface-card border border-border rounded-xl p-5">
            <div className="text-2xl font-bold text-text-primary">{stats.ready}</div>
            <div className="text-sm text-text-secondary">Prêtes</div>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="bg-surface-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-text-primary">Progression globale</h3>
              <span className="text-2xl font-bold text-text-primary">{stats.progress}%</span>
            </div>
            <div className="w-full bg-surface-input rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Document Section */}
        <div className="mb-8 bg-surface-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Document principal</h2>
            {documents.length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <CheckCircle size={14} />
                Document prêt
              </span>
            )}
          </div>
          {loading ? (
            <p className="text-text-secondary">Chargement...</p>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-xl bg-surface-input border border-border flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-text-tertiary" />
              </div>
              <p className="text-text-secondary mb-4">Importez le document principal du devoir pour commencer.</p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                <Upload size={16} />
                Importer le document principal
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-surface-input border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{doc.name}</p>
                      <p className="text-sm text-text-secondary">
                        {doc.type.toUpperCase()} {doc.pages && `• ${doc.pages} pages`} • {doc.content.length.toLocaleString()} caractères extraits
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-medium">
                    Prêt
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workflow Steps */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Workflow du devoir</h2>
          <div className="space-y-3">
            {workflowSteps.map((step) => (
              <Link
                key={step.step}
                to={step.disabled ? '#' : step.link}
                onClick={(e) => step.disabled && e.preventDefault()}
                className={`block bg-surface-card border border-border rounded-xl p-5 transition-all ${
                  step.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-blue-500/30 hover:shadow-card'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    step.completed
                      ? 'bg-emerald-500/10'
                      : step.disabled
                      ? 'bg-slate-500/10'
                      : 'bg-blue-500/10'
                  }`}>
                    {step.completed ? (
                      <CheckCircle size={24} className="text-emerald-400" />
                    ) : step.disabled ? (
                      <Clock size={24} className="text-slate-400" />
                    ) : (
                      <span className="text-xl font-bold text-blue-400">{step.step}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold mb-1 ${
                      step.completed ? 'text-emerald-400' : 'text-text-primary'
                    }`}>{step.title}</h3>
                    <p className="text-sm text-text-secondary">{step.description}</p>
                  </div>
                  {!step.disabled && (
                    <ArrowRight className="text-blue-400" size={20} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Conseils de réussite</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  Importez d\'abord le document principal de lois fiscales
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  Ajoutez les questions une par une
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  Vérifiez toujours les sources dans le document
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  Respectez la limite de 15 lignes par réponse
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
