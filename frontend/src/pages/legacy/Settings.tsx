import { useState } from 'react';
import { Key, Save, CheckCircle, AlertCircle, Sparkles, Cpu, Info, Shield, Zap } from 'lucide-react';

export default function Settings() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    try {
      localStorage.setItem('openai_api_key', apiKey);
      setSaved(true);
      setError('');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erreur lors de l\'enregistrement de la clé API');
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem('openai_api_key');
      setApiKey('');
      setSaved(true);
      setError('');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erreur lors de l\'effacement de la clé API');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Paramètres</h1>
          <p className="text-text-secondary">Configurer les options de l'application</p>
        </div>

        <div className="bg-surface-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-blue-400" />
            </div>
            Configuration IA
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                <Key className="h-4 w-4 text-text-secondary" />
                Clé API OpenAI (optionnelle)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
              <p className="text-sm text-text-secondary mt-2">
                Sans clé API, l'application fonctionne en mode local avec recherche par mots-clés.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg"
              >
                <Save className="h-4 w-4" />
                <span>Enregistrer</span>
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 bg-surface-input border border-border text-text-primary px-6 py-3 rounded-xl font-semibold hover:bg-surface-cardHover transition-all"
              >
                <span>Effacer</span>
              </button>
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="h-5 w-5" />
                <span>Configuration enregistrée avec succès</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Cpu className="h-4 w-4 text-purple-400" />
            </div>
            Mode de fonctionnement
          </h2>
          
          <div className="space-y-4">
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                Mode sans API (par défaut)
              </h3>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Recherche par mots-clés dans les documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Extraction de passages pertinents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Analyse de structure de base</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Liste de vérification automatique</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Fonctionne entièrement en local</span>
                </li>
              </ul>
            </div>

            <div className="p-5 bg-gold-500/10 border border-gold-500/20 rounded-xl">
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-gold-400" />
                Mode API OpenAI
              </h3>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Explications détaillées</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Correction linguistique avancée</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Conseils d'optimisation personnalisés</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Analyse approfondie des questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Nécessite une clé API valide</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
              <Info className="h-4 w-4 text-slate-400" />
            </div>
            Informations sur l'application
          </h2>
          <div className="space-y-2 text-slate-300 text-sm">
            <p><strong className="text-white">Version:</strong> 1.0.0</p>
            <p><strong className="text-white">Backend:</strong> Node.js + Express + TypeScript</p>
            <p><strong className="text-white">Frontend:</strong> React + Vite + TypeScript + Tailwind CSS</p>
            <p><strong className="text-white">Local Mode:</strong> pdf-parse + mammoth for document reading</p>
            <p><strong className="text-white">AI Mode:</strong> OpenAI GPT-4 (optional)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
