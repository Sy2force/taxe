import { useState } from 'react';
import { FileCheck, Copy, CheckCircle } from 'lucide-react';

export default function Declaration() {
  const [copied, setCopied] = useState(false);

  const declarationText = `J'ai utilisé l'outil "Correcteur Fiscalité Pro" uniquement pour m'aider à rechercher des passages pertinents dans les documents, structurer mon raisonnement et corriger la langue.

L'IA a été utilisée pour :
- La recherche de mots-clés dans les documents PDF de lois fiscales
- L'aide à la compréhension des questions du devoir
- La correction linguistique et stylistique de mes réponses
- La vérification de la structure et de la complétude de mes réponses
- La génération de checklists pour m'assurer de ne rien oublier

Les réponses finales, le raisonnement fiscal, le choix des sources et l'interprétation des lois ont été rédigés et vérifiés par moi-même.

Je déclare que ce travail est personnel et que l'outil a servi uniquement d'assistant d'apprentissage et de correction, et non de génération de contenu.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(declarationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Déclaration d'utilisation de l'IA</h1>
        <p className="text-text-secondary">
          Générez une déclaration d'utilisation de l'IA pour votre devoir
        </p>
      </div>

      <div className="bg-surface-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary flex items-center">
            <FileCheck className="h-6 w-6 mr-2 text-blue-400" />
            Déclaration générée
          </h2>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 bg-gradient-to-r from-gold-500 to-amber-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-gold-600 hover:to-amber-600 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Copié!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copier</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-surface-input rounded-lg p-6 border border-border">
          <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
            {declarationText}
          </p>
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-2xl p-6 border-l-4 border-l-gold-500">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Instructions</h3>
        <ul className="list-disc list-inside space-y-2 text-text-secondary">
          <li>Copiez cette déclaration et incluez-la dans votre devoir si demandé par votre professeur</li>
          <li>Vous pouvez adapter cette déclaration selon les exigences spécifiques de votre établissement</li>
          <li>Soyez honnête sur votre utilisation de l'IA - cette déclaration est conçue pour être transparente</li>
          <li>Conservez une trace de vos recherches et de votre processus de travail</li>
        </ul>
      </div>

      <div className="mt-6 bg-emerald-500/10 rounded-xl p-6 border border-emerald-500/20">
        <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-emerald-400" />
          Bonnes pratiques
        </h3>
        <ul className="list-disc list-inside space-y-2 text-text-secondary">
          <li>Utilisez l'IA comme un outil d'apprentissage, pas de substitution</li>
          <li>Vérifiez toujours les sources et les articles de loi cités</li>
          <li>Rédigez vos propres réponses avec vos mots</li>
          <li>Comprenez le raisonnement fiscal derrière chaque réponse</li>
          <li>Ne copiez pas de réponses générées par l'IA sans les vérifier</li>
        </ul>
      </div>
    </div>
  );
}
