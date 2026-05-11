import { useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, Lightbulb, BookOpen } from 'lucide-react';

interface AnalysisResult {
  keyRequirements: string[];
  importantPoints: string[];
  deadlines: string[];
  warnings: string[];
  tips: string[];
}

export default function ProfessorInstructions() {
  const [instructions, setInstructions] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeInstructions = async () => {
    if (!instructions.trim()) return;
    
    setAnalyzing(true);
    try {
      // Note: This would call the backend AI service for actual analysis
      // For now, we show a placeholder message
      const result = {
        keyRequirements: [
          'Analysez les exigences spécifiques mentionnées dans les instructions',
          'Identifiez les formats requis',
          'Notez les limites de longueur si mentionnées',
        ],
        importantPoints: [
          'Vérifiez les points clés à retenir',
          'Identifiez les critères de notation',
          'Notez les références documentaires requises',
        ],
        deadlines: [
          'Identifiez les dates de remise',
          'Notez les formats de soumission acceptés',
        ],
        warnings: [
          'Identifiez les points d\'attention',
          'Notez les erreurs à éviter',
        ],
        tips: [
          'Organisez votre temps selon les priorités',
          'Préparez les documents nécessaires',
        ],
      };
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Instructions du Professeur</h1>
          <p className="text-slate-600">Analysez les instructions du devoir pour identifier les exigences clés</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Collez les instructions du professeur ici
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent resize-none"
            rows={8}
            placeholder="Collez ici les instructions du devoir, les exigences de format, les dates limites, etc."
          />
          <button
            onClick={analyzeInstructions}
            disabled={!instructions.trim() || analyzing}
            className="mt-4 px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? 'Analyse en cours...' : 'Analyser les instructions'}
          </button>
        </div>

        {analysis && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} />
                Exigences Clés
              </h3>
              <ul className="space-y-2">
                {analysis.keyRequirements.map((req: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700">
                    <span className="text-navy-600 mt-1">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                <BookOpen className="text-blue-600" size={20} />
                Points Importants
              </h3>
              <ul className="space-y-2">
                {analysis.importantPoints.map((point: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700">
                    <span className="text-blue-600 mt-1">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-amber-600" size={20} />
                Points d'Attention
              </h3>
              <ul className="space-y-2">
                {analysis.warnings.map((warning: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700">
                    <span className="text-amber-600 mt-1">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                <Lightbulb className="text-yellow-600" size={20} />
                Conseils
              </h3>
              <ul className="space-y-2">
                {analysis.tips.map((tip: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700">
                    <span className="text-yellow-600 mt-1">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <FileText size={20} />
                Échéances
              </h3>
              <ul className="space-y-1 text-slate-700">
                {analysis.deadlines.map((deadline: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    {deadline}
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
