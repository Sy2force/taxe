import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, BookOpen, Trash2, CheckCircle, Clock, KanbanSquare, MoreHorizontal, Edit, FileText, ClipboardCheck, Clipboard } from 'lucide-react';
import { analysisApi, type HomeworkQuestion, detectQuestions } from '../lib/api';

const statusConfig = {
  not_started: { label: 'À commencer', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30', icon: Clock },
  sources_found: { label: 'Sources trouvées', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: BookOpen },
  draft_written: { label: 'Brouillon rédigé', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Edit },
  corrected: { label: 'Corrigé', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: CheckCircle },
  ready_to_submit: { label: 'Prêt à soumettre', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  copied_to_document: { label: 'Copiée dans le document', color: 'bg-green-500/10 text-green-400 border-green-500/30', icon: CheckCircle },
};

interface StatusBadgeProps {
  status: HomeworkQuestion['status'];
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </div>
  );
};

interface QuestionCardProps {
  question: HomeworkQuestion;
  selectedId: number | null;
  onSelect: (question: HomeworkQuestion) => void;
  onDelete: (id: number) => void;
}

const QuestionCard = ({ question, selectedId, onSelect, onDelete }: QuestionCardProps) => (
  <div
    onClick={() => onSelect(question)}
    className={`p-4 bg-surface-card border border-border rounded-xl cursor-pointer hover:border-blue-500/30 transition-all group ${
      selectedId === question.id ? 'border-blue-500/50 shadow-card' : ''
    }`}
  >
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-text-primary text-sm">
          Question {question.id}
        </div>
        {question.questionText && (
          <div className="text-xs text-text-secondary mt-1 line-clamp-2">
            {question.questionText}
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(question.id);
        }}
        className="p-1.5 text-text-tertiary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
    
    <div className="flex items-center justify-between">
      <StatusBadge status={question.status} />
      {question.draftAnswer && (
        <div className="flex items-center gap-1 text-xs text-text-tertiary">
          <FileText size={12} />
          <span>{question.draftAnswer.length} caractères</span>
        </div>
      )}
    </div>
  </div>
);

export default function HomeworkQuestions() {
  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<HomeworkQuestion | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const hasLoaded = useRef(false);

  const loadQuestions = useCallback(async () => {
    try {
      const data = await analysisApi.getHomeworkQuestions();
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) {
      loadQuestions();
      hasLoaded.current = true;
    }
  }, [loadQuestions]);

  const createNewQuestion = async (id: number) => {
    try {
      const newQuestion = await analysisApi.createHomeworkQuestion({ id, questionText: '', draftAnswer: '' });
      setQuestions([...questions, newQuestion]);
      setSelectedQuestion(newQuestion);
    } catch (error) {
      console.error('Failed to create question:', error);
    }
  };

  const updateQuestion = async (updates: Partial<HomeworkQuestion>) => {
    if (!selectedQuestion) return;
    try {
      const updated = await analysisApi.updateHomeworkQuestion(selectedQuestion.id, updates);
      setSelectedQuestion(updated);
      setQuestions(questions.map(q => q.id === updated.id ? updated : q));
    } catch (error) {
      console.error('Failed to update question:', error);
    }
  };

  const deleteQuestion = async (id: number) => {
    try {
      await analysisApi.deleteHomeworkQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
      if (selectedQuestion?.id === id) {
        setSelectedQuestion(null);
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const markAsCopied = async (id: number) => {
    try {
      await analysisApi.updateHomeworkQuestion(id, { 
        copiedToDocument: true, 
        copiedAt: new Date().toISOString(),
        status: 'copied_to_document'
      });
      setQuestions(questions.map(q => q.id === id ? { ...q, copiedToDocument: true, copiedAt: new Date().toISOString(), status: 'copied_to_document' as const } : q));
      if (selectedQuestion?.id === id) {
        setSelectedQuestion({ ...selectedQuestion, copiedToDocument: true, copiedAt: new Date().toISOString(), status: 'copied_to_document' as const });
      }
    } catch (error) {
      console.error('Failed to mark as copied:', error);
    }
  };

  const handleImportFromPaste = async () => {
    if (!pastedText.trim()) return;
    
    const detectedQuestions = detectQuestions(pastedText);
    
    if (detectedQuestions.length === 0) {
      alert('Aucune question détectée dans le texte collé. Vérifiez le format.');
      return;
    }
    
    try {
      for (let i = 0; i < detectedQuestions.length; i++) {
        const newQuestion = await analysisApi.createHomeworkQuestion({ id: questions.length + i + 1, questionText: detectedQuestions[i], draftAnswer: '' });
        setQuestions(prev => [...prev, newQuestion]);
      }
      setPastedText('');
      setShowImportDialog(false);
      alert(`${detectedQuestions.length} questions détectées et importées.`);
    } catch (error) {
      console.error('Failed to import questions:', error);
      alert('Erreur lors de l\'import des questions.');
    }
  };

  const getQuestionsByStatus = (status: HomeworkQuestion['status']) => {
    return questions.filter(q => q.status === status);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Questions de devoir</h1>
              <p className="text-text-secondary">Gérez vos 8 questions de devoir avec suivi style Kanban</p>
            </div>
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
            >
              <Clipboard size={18} />
              Coller les questions
            </button>
            <button
              onClick={() => createNewQuestion(questions.length + 1)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg"
            >
              <Plus size={18} />
              Ajouter une question
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const statusQuestions = getQuestionsByStatus(status as HomeworkQuestion['status']);
            return (
              <div key={status} className="bg-surface-input border border-border rounded-2xl p-4">
                <div className={`flex items-center gap-2 mb-4 px-2 py-1.5 rounded-lg border ${config.color}`}>
                  <Icon size={16} />
                  <span className="font-semibold text-sm">{config.label}</span>
                  <span className="ml-auto text-xs font-medium">{statusQuestions.length}</span>
                </div>
                <div className="space-y-3 min-h-[200px]">
                  {statusQuestions.map((question) => (
                    <QuestionCard 
                      key={question.id} 
                      question={question} 
                      selectedId={selectedQuestion?.id || null}
                      onSelect={setSelectedQuestion}
                      onDelete={deleteQuestion}
                    />
                  ))}
                  {statusQuestions.length === 0 && (
                    <div className="text-center py-8 text-text-tertiary text-sm">
                      Aucune question
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Question Detail Panel */}
        {selectedQuestion && (
          <div className="bg-surface-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <KanbanSquare className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">Question {selectedQuestion.id}</h2>
                  <StatusBadge status={selectedQuestion.status} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-input rounded-lg transition-colors"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Texte de la question</label>
                <textarea
                  value={selectedQuestion.questionText}
                  onChange={(e) => updateQuestion({ questionText: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
                  rows={4}
                  placeholder="Collez le texte de la question ici..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Notes personnelles</label>
                <textarea
                  value={selectedQuestion.notes}
                  onChange={(e) => updateQuestion({ notes: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
                  rows={4}
                  placeholder="Vos notes et réflexions..."
                />
              </div>

              {/* Sources */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Sources trouvées</label>
                <div className="bg-surface-input border border-border rounded-xl p-4 min-h-[120px]">
                  {selectedQuestion.sources.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedQuestion.sources.map((source, idx) => (
                        <li key={idx} className="text-sm text-text-secondary p-2 bg-surface-card rounded-lg">
                          <span className="font-medium text-text-primary">{source.keyword}</span>: {source.extract.substring(0, 80)}...
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-tertiary">Aucune source enregistrée</p>
                  )}
                </div>
              </div>

              {/* Checklist */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Liste de vérification</label>
                <div className="bg-surface-input border border-border rounded-xl p-4 min-h-[120px]">
                  {selectedQuestion.checklist.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedQuestion.checklist.map((item, idx) => (
                        <li key={idx} className="text-sm text-text-secondary flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-tertiary">Aucun élément de liste</p>
                  )}
                </div>
              </div>

              {/* Draft Answer */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-2">Brouillon de réponse</label>
                <textarea
                  value={selectedQuestion.draftAnswer}
                  onChange={(e) => updateQuestion({ draftAnswer: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none font-mono text-sm transition-all"
                  rows={6}
                  placeholder="Écrivez votre brouillon ici..."
                />
              </div>

              {/* Status Update */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-2">Statut</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <button
                      key={status}
                      onClick={() => updateQuestion({ status: status as HomeworkQuestion['status'] })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedQuestion.status === status
                          ? config.color
                          : 'bg-surface-input border-border text-text-secondary hover:border-blue-500/30'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                  <button
                    onClick={() => markAsCopied(selectedQuestion.id)}
                    disabled={selectedQuestion.copiedToDocument}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectedQuestion.copiedToDocument
                        ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-not-allowed'
                        : 'bg-surface-input border-border text-text-secondary hover:border-blue-500/30'
                    }`}
                  >
                    <ClipboardCheck size={14} />
                    Marquer comme collée
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-card border border-border rounded-2xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-semibold text-text-primary mb-3">Coller les questions du devoir</h3>
            <p className="text-text-secondary mb-4">Collez le texte contenant les questions. Le système détectera automatiquement les questions numérotées.</p>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Collez les questions ici...
Exemple:
1. Qu'est-ce que...
2. Comment calculer..."
              rows={10}
              className="w-full px-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowImportDialog(false)}
                className="flex-1 px-4 py-2 bg-surface-input border border-border text-text-primary rounded-lg hover:bg-surface-card transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleImportFromPaste}
                disabled={!pastedText.trim()}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Détecter et importer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
