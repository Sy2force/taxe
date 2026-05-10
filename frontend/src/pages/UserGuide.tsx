import { Link } from 'react-router-dom';
import { BookOpen, Upload, Search, CheckCircle, FileText, Settings, ArrowRight } from 'lucide-react';

export default function UserGuide() {
  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-500 p-3 rounded-xl">
              <BookOpen size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-4">Mode d'Emploi</h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Guide complet pour utiliser Correcteur Fiscalité Pro et réussir votre devoir de fiscalité des sociétés
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="bg-surface-card border border-border rounded-2xl p-6 hover:border-blue-500/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-text-primary mb-3 flex items-center gap-2">
                    {step.icon}
                    {step.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed">{step.description}</p>
                  {step.tips && (
                    <div className="mt-4 bg-surface-input rounded-lg p-4">
                      <h4 className="font-medium text-text-primary mb-2 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-400" />
                        Conseils
                      </h4>
                      <ul className="space-y-1 text-sm text-text-secondary">
                        {step.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="bg-blue-500 text-white rounded-2xl p-8 mt-12">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Settings size={28} />
              Règles Importantes
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle size={20} className="text-gold flex-shrink-0 mt-1" />
                <span>L'outil aide à comprendre, structurer et corriger mais ne rédige jamais le devoir à votre place</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={20} className="text-gold flex-shrink-0 mt-1" />
                <span>Toujours écrire votre brouillon avec vos propres mots avant de demander de l'aide</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={20} className="text-gold flex-shrink-0 mt-1" />
                <span>Vérifiez toujours les sources et les calculs avec les données exactes du cas</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={20} className="text-gold flex-shrink-0 mt-1" />
                <span>Respectez la limite de 15 lignes par réponse</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={20} className="text-gold flex-shrink-0 mt-1" />
                <span>Citez toujours vos sources (sections, pages du PDF)</span>
              </li>
            </ul>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors font-medium shadow-lg"
            >
              Commencer
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    icon: <Upload size={24} className="text-blue-500" />,
    title: 'Importer le PDF de 243 pages',
    description: 'Téléchargez le document PDF contenant les lois fiscales et les articles de loi. Ce document sera utilisé pour toutes les recherches et analyses.',
    tips: [
      'Assurez-vous que le PDF est complet et lisible',
      'Le PDF sera stocké temporairement en mémoire',
      'Vous pouvez importer plusieurs documents si nécessaire'
    ]
  },
  {
    icon: <Search size={24} className="text-cyan-500" />,
    title: 'Scanner les documents',
    description: 'Le système analyse automatiquement le contenu du PDF pour extraire les textes et indexer les mots-clés en hébreu et français.',
    tips: [
      'L\'indexation est automatique',
      'Les mots-clés hébreux sont pré-configurés',
      'Le système peut chercher des variantes proches'
    ]
  },
  {
    icon: <FileText size={24} className="text-emerald-500" />,
    title: 'Importer ou coller les questions du devoir',
    description: 'Ajoutez les 8 questions du devoir dans la section "Devoir". Vous pouvez les coller une par une ou toutes ensemble.',
    tips: [
      'Utilisez la section "Devoir" pour gérer les 8 questions',
      'Chaque question a son propre statut de progression',
      'Vous pouvez ajouter des notes personnelles à chaque question'
    ]
  },
  {
    icon: <BookOpen size={24} className="text-purple-500" />,
    title: 'Analyser chaque question',
    description: 'Pour chaque question, cliquez sur "Analyser" pour obtenir une décomposition détaillée : sujets, personnes concernées, dates, montants, opérations fiscales, et sources pertinentes.',
    tips: [
      'L\'analyse identifie les mots-clés à chercher',
      'Les sources trouvées sont affichées avec les extraits',
      'Une structure de réponse est suggérée'
    ]
  },
  {
    icon: <Search size={24} className="text-blue-500" />,
    title: 'Lire les sources trouvées',
    description: 'Consultez les extraits du PDF pertinents pour votre question. Notez les sections, pages et passages qui vous aideront à répondre.',
    tips: [
      'Les sources sont classées par pertinence',
      'Vous pouvez ajouter des sources à vos notes',
      'Vérifiez toujours les sources dans le PDF original'
    ]
  },
  {
    icon: <FileText size={24} className="text-cyan-500" />,
    title: 'Écrire votre réponse personnelle',
    description: 'Rédigez votre brouillon avec vos propres mots dans la section prévue. Utilisez la structure suggérée : Faits → Règle → Application → Conclusion.',
    tips: [
      'Écrivez d\'abord votre brouillon sans aide IA',
      'Utilisez la structure conseillée',
      'Respectez la limite de 15 lignes'
    ]
  },
  {
    icon: <CheckCircle size={24} className="text-emerald-500" />,
    title: 'Coller la réponse dans le correcteur',
    description: 'Une fois votre brouillon écrit, collez-le dans le correcteur pour obtenir une analyse détaillée de votre réponse.',
    tips: [
      'Le correcteur vérifie le contenu et le raisonnement',
      'Un score indicatif est fourni',
      'Des conseils d\'amélioration sont donnés'
    ]
  },
  {
    icon: <CheckCircle size={24} className="text-purple-500" />,
    title: 'Corriger avec la checklist',
    description: 'Utilisez la checklist finale pour vérifier que tous les éléments sont présents : contribuable, événement fiscal, montant, source, taux, moment, sources, conclusion.',
    tips: [
      'Cochez chaque élément de la checklist',
      'Les éléments manquants sont signalés',
      'Améliorez votre réponse si nécessaire'
    ]
  },
  {
    icon: <Settings size={24} className="text-gold-400" />,
    title: 'Vérifier les sources et les calculs',
    description: 'Utilisez les outils de vérification des calculs pour confirmer vos pourcentages et multiplications. Vérifiez toujours avec les données exactes du cas.',
    tips: [
      'L\'outil de calcul vérifie les opérations de base',
      'Toujours vérifier avec les données du cas',
      'Le système affiche un avertissement à cet effet'
    ]
  },
  {
    icon: <FileText size={24} className="text-blue-500" />,
    title: 'Exporter les notes si besoin',
    description: 'Vous pouvez exporter vos notes, sources et brouillons pour les utiliser dans votre document Word final.',
    tips: [
      'Les notes sont sauvegardées localement',
      'Vous pouvez les copier dans votre document',
      'N\'oubliez pas la déclaration IA si nécessaire'
    ]
  }
];
