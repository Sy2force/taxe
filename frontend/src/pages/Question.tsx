import { useState, useCallback, useEffect } from 'react';
import { analysisApi, documentsApi, type QuestionAnalysis } from '../lib/api';
import { CheckCircle, AlertTriangle, Lightbulb, Sparkles, Brain, Target, ListChecks, AlertCircle, Zap, BookOpen, FileText, Copy, ClipboardCheck } from 'lucide-react';

interface GuidedAnswer {
  title: string;
  sections: Array<{ title: string; content: string }>;
  metadata: { subject: string; detectedConcepts: string[]; sourceCount: number };
}

export default function Question() {
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null);
  const [guidedAnswer, setGuidedAnswer] = useState<GuidedAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    const checkDocument = async () => {
      try {
        const docs = await documentsApi.getAll();
        setHasDocument(docs.length > 0);
      } catch (error) {
        console.error('Failed to check documents:', error);
      }
    };
    checkDocument();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    setGuidedAnswer(null);
    try {
      const result = await analysisApi.analyzeQuestion(question, useAI);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  }, [question, useAI]);

  const handleGenerateGuidedAnswer = useCallback(async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    try {
      const result = await analysisApi.generateGuidedAnswer(question, useAI);
      if (result.success && result.guidedAnswer) {
        setGuidedAnswer(result.guidedAnswer);
      } else {
        alert(result.message || 'Erreur lors de la génération de la réponse guidée');
      }
    } catch (error) {
      console.error('Guided answer generation failed:', error);
    } finally {
      setLoading(false);
    }
  }, [question, useAI]);

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(successMessage);
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyFeedback('Copie impossible automatiquement. Sélectionnez le texte puis copiez-le manuellement.');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const handleCopyAnswer = () => {
    if (!guidedAnswer) return;
    const answerText = guidedAnswer.sections.map(s => s.content).join('\n\n');
    copyToClipboard(answerText, 'Réponse copiée. Vous pouvez la coller dans votre document.');
  };

  const handleCopySources = () => {
    if (!analysis || !analysis.usefulPassages) return;
    const sourcesText = analysis.usefulPassages.map((p, i) => 
      `Source ${i + 1}:\nDocument: ${p.documentName}\nPage: ${p.page || 'Non détectée'}\nExtrait: "${p.extract}"`
    ).join('\n\n');
    copyToClipboard(sourcesText, 'Sources copiées.');
  };

  const handleCopyAnswerAndSources = () => {
    if (!guidedAnswer || !analysis) return;
    const answerText = guidedAnswer.sections.map(s => s.content).join('\n\n');
    const sourcesText = analysis.usefulPassages?.map((p, i) => 
      `Source ${i + 1}:\nDocument: ${p.documentName}\nPage: ${p.page || 'Non détectée'}\nExtrait: "${p.extract}"`
    ).join('\n\n') || 'Aucune source';
    
    const fullText = `Question:\n${question}\n\nRéponse:\n${answerText}\n\nSources:\n${sourcesText}\n\nNote: Réponse générée comme aide à la rédaction, à vérifier avec le cours.`;
    copyToClipboard(fullText, 'Réponse + sources copiées.');
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">Étape 3/4</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Analyse de la question</h1>
          <p className="text-text-secondary">
            Analysez une question pour comprendre ce qu'elle demande et trouver les sources pertinentes
          </p>
        </div>

        {/* Document Warning */}
        {!hasDocument && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 font-medium mb-1">Document principal manquant</p>
              <p className="text-text-secondary text-sm">Importez d'abord le document de lois fiscales pour obtenir des résultats pertinents.</p>
            </div>
          </div>
        )}

        <div className="mb-8 bg-surface-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
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
            {useAI && (
              <span className="flex items-center gap-2 text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3" />
Amélioré par IA
              </span>
            )}
          </div>
          
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Collez votre question ici..."
            rows={6}
            className="w-full px-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all"
          />
          
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analyse en cours...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                Analyser la question
              </>
            )}
          </button>

          {analysis && (
            <button
              onClick={handleGenerateGuidedAnswer}
              disabled={loading}
              className="mt-3 ml-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Génération en cours...
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  Générer une réponse guidée
                </>
              )}
            </button>
          )}
        </div>

        {analysis && (
          <div className="space-y-6">
            {/* Question originale */}
            <div className="bg-surface-card border border-border rounded-2xl p-6 border-l-4 border-l-purple-500">
              <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-400" />
                </div>
                Question originale
              </h2>
              <div className="bg-surface-input rounded-lg p-4">
                <p className="text-text-primary whitespace-pre-wrap leading-relaxed" dir="auto">{question}</p>
              </div>
            </div>

            {/* Compréhension en français */}
            <div className="bg-surface-card border border-border rounded-2xl p-6 border-l-4 border-l-blue-500">
              <h2 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-blue-400" />
                </div>
                Ce que la question demande
              </h2>
              <p className="text-text-secondary leading-relaxed">{analysis.whatQuestionAsks}</p>
            </div>

            {/* Ce qu'il faut chercher */}
            <div className="bg-surface-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-cyan-400" />
                </div>
                Ce qu'il faut chercher dans le document
              </h2>
              <ul className="space-y-3">
                {analysis.factsToIdentify.map((fact, index) => (
                  <li key={index} className="flex items-start gap-3 text-text-secondary">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-cyan-400" />
                    </div>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mots-clés hébreu/français */}
            <div className="bg-surface-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-gold-400" />
                </div>
                Mots-clés à rechercher (hébreu et français)
              </h2>
              <div className="flex flex-wrap gap-2">
                {analysis.keywordsToSearch.map((keyword, index) => (
                  <span key={index} className="px-4 py-2 bg-surface-input border border-border rounded-full text-sm text-text-secondary hover:border-blue-500/50 transition-colors">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Sources trouvées */}
            {analysis.usefulPassages && analysis.usefulPassages.length > 0 && (
              <div className="bg-surface-card border border-border rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                  </div>
                  Sources trouvées dans le document
                </h2>
                <div className="space-y-4">
                  {analysis.usefulPassages.slice(0, 5).map((passage, index) => (
                    <div key={index} className="bg-surface-input border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                          Extrait {index + 1}
                        </span>
                        {passage.page && (
                          <span className="text-xs text-text-secondary">Page {passage.page}</span>
                        )}
                      </div>
                      <p className="text-text-secondary text-sm mb-2 leading-relaxed" dir="auto">
                        {passage.extract.substring(0, 200)}{passage.extract.length > 200 ? '...' : ''}
                      </p>
                      <div className="text-xs text-text-secondary">
                        <span className="text-blue-400">Pertinence:</span> {passage.relevanceScore ? `${Math.round(passage.relevanceScore * 100)}%` : 'Élevée'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Méthode de réponse */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ListChecks className="h-4 w-4 text-blue-400" />
                </div>
                Méthode de réponse recommandée
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-text-secondary">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-blue-400">
                    1
                  </div>
                  <span><strong>Faits:</strong> Identifiez le contribuable, l'événement fiscal, les montants et les dates</span>
                </div>
                <div className="flex items-start gap-3 text-text-secondary">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-blue-400">
                    2
                  </div>
                  <span><strong>Règle:</strong> Citez l'article de loi applicable et le taux d'imposition</span>
                </div>
                <div className="flex items-start gap-3 text-text-secondary">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-blue-400">
                    3
                  </div>
                  <span><strong>Application:</strong> Appliquez la règle aux faits spécifiques du cas</span>
                </div>
                <div className="flex items-start gap-3 text-text-secondary">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-blue-400">
                    4
                  </div>
                  <span><strong>Calcul:</strong> Effectuez le calcul si nécessaire (pourcentage, multiplication)</span>
                </div>
                <div className="flex items-start gap-3 text-text-secondary">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-blue-400">
                    5
                  </div>
                  <span><strong>Conclusion:</strong> Concluez avec l'événement fiscal, le contribuable, le montant, le taux et le moment</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-card border border-border rounded-2xl p-6 border-l-4 border-l-red-500">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                Erreurs à éviter
              </h2>
              <ul className="space-y-3">
                {analysis.errorsToAvoid.map((error, index) => (
                  <li key={index} className="flex items-start gap-3 text-text-secondary">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                Liste de vérification avant rédaction
              </h2>
              <ul className="space-y-3">
                {analysis.checklist.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-text-secondary">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {guidedAnswer && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                  </div>
                  {guidedAnswer.title}
                </h2>
                <div className="space-y-4">
                  {guidedAnswer.sections.map((section, idx) => (
                    <div key={idx} className="bg-surface-card border border-border rounded-xl p-4">
                      <h3 className="font-semibold text-text-primary mb-2">{section.title}</h3>
                      <p className="text-text-secondary whitespace-pre-line text-sm">{section.content}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-500/20">
                  <div className="flex gap-4 text-xs text-text-secondary mb-4">
                    <span>Sujet: {guidedAnswer.metadata.subject}</span>
                    <span>Sources: {guidedAnswer.metadata.sourceCount}</span>
                    <span>Concepts: {guidedAnswer.metadata.detectedConcepts.join(', ')}</span>
                  </div>
                  
                  {/* Copy buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleCopyAnswer}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Copier la réponse
                    </button>
                    <button
                      onClick={handleCopySources}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Copier les sources
                    </button>
                    <button
                      onClick={handleCopyAnswerAndSources}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      Copier réponse + sources
                    </button>
                  </div>
                  
                  {copyFeedback && (
                    <div className="mt-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
                      {copyFeedback}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
