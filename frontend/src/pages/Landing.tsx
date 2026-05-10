import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Search, FileCheck, Zap, BarChart3 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-3xl opacity-20 rounded-full" />
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-6 rounded-2xl shadow-glow">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-text-primary mb-6 tracking-tight">
            AI-Powered Academic<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Tax Assistant
            </span>
          </h1>
          
          <p className="text-xl text-text-secondary mb-10 max-w-3xl mx-auto leading-relaxed">
            Plateforme professionnelle d'analyse fiscale, de correction et de soutien académique pour les études de fiscalité des sociétés.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-glow"
            >
              <span>Lancer l'analyse</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-surface-card border border-border text-text-primary px-8 py-4 rounded-xl font-semibold hover:bg-surface-cardHover transition-all"
            >
              <span>Voir le tableau de bord</span>
            </Link>
          </div>
        </div>

        {/* Ethical Warning */}
        <div className="mb-20 bg-surface-card border border-border rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Intégrité académique d'abord</h3>
              <p className="text-text-secondary leading-relaxed">
                Cet outil vous aide à comprendre, structurer et corriger votre travail. Il ne remplace pas votre effort personnel.
                Les réponses finales, le raisonnement fiscal et la sélection des sources doivent être rédigés et vérifiés par vous.
                Considérez-le comme un tuteur intelligent et un assistant de recherche.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="bg-surface-card border border-border rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Search className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Recherche intelligente</h3>
            <p className="text-text-secondary">
              Recherchez des mots-clés dans vos documents fiscaux PDF avec extraction contextuelle et support hébreu.
            </p>
          </div>

          <div className="bg-surface-card border border-border rounded-2xl p-6 hover:border-cyan-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileCheck className="h-6 w-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Analyse structurée</h3>
            <p className="text-text-secondary">
              Analysez les questions et corrigez les réponses avec des critères d'évaluation complets et scoring.
            </p>
          </div>

          <div className="bg-surface-card border border-border rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Mode local prioritaire</h3>
            <p className="text-text-secondary">
              Fonctionne entièrement en mode local sans nécessiter d'API externes. Amélioration IA optionnelle disponible.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          <div className="bg-surface-card border border-border rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">33+</div>
            <div className="text-sm text-text-secondary">Mots-clés hébreu</div>
          </div>

          <div className="bg-surface-card border border-border rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">10+</div>
            <div className="text-sm text-text-secondary">Critères d'évaluation</div>
          </div>

          <div className="bg-surface-card border border-border rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <FileCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">8</div>
            <div className="text-sm text-text-secondary">Suivi des questions</div>
          </div>

          <div className="bg-surface-card border border-border rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-6 w-6 text-gold-400" />
            </div>
            <div className="text-3xl font-bold text-text-primary mb-1">100%</div>
            <div className="text-sm text-text-secondary">Conformité éthique</div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-4">Prêt à exceller dans vos études fiscales ?</h2>
          <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers d'étudiants utilisant des outils alimentés par l'IA pour comprendre des concepts fiscaux complexes tout en maintenant l'intégrité académique.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-glow"
          >
            <span>Commencer maintenant</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
