import { Link } from 'react-router-dom';
import { useState } from 'react';
import { BookOpen, Search, Filter, Sparkles, Tag, ArrowRight, ExternalLink, Hash } from 'lucide-react';

const glossaryTerms = [
  { term: 'Dividende (דיבידנד)', definition: 'Distribution of company profits to shareholders. Taxable under section 125b.', category: 'Distribution' },
  { term: 'Plus-value (רווח הון)', definition: 'Gain realized on asset sale. Taxable under section 88 for shares.', category: 'Sale' },
  { term: 'Impôt sociétés (מס חברות)', definition: 'Tax on company profits. Standard rate of 23%.', category: 'Tax' },
  { term: 'Actionnaire (בעל מניות)', definition: 'Owner of company shares. May be taxable on dividends received.', category: 'Distribution' },
  { term: 'Société (חברה)', definition: 'Legal entity separate from shareholders. Independent taxpayer.', category: 'Structure' },
  { term: 'Résident israélien (תושב ישראל)', definition: 'Person residing in Israel according to tax criteria.', category: 'Residence' },
  { term: 'Revenu imposable (הכנסה חייבת)', definition: 'Income subject to tax under tax law.', category: 'Tax' },
  { term: 'Taux d\'imposition (שיעור המס)', definition: 'Percentage applied to taxable base to calculate tax.', category: 'Tax' },
  { term: 'Source de revenu (מקור ההכנסה)', definition: 'Origin of income (salary, dividend, interest, etc.).', category: 'Income' },
  { term: 'Société étrangère contrôlée (חברה נשלטת זרה)', definition: 'Foreign company controlled by Israeli resident.', category: 'International' },
  { term: 'Prêt sans intérêt (הלוואה ללא ריבית)', definition: 'Loan granted without interest. Taxed under section 3(9).', category: 'Loan' },
  { term: 'Section 125b', definition: 'Dividend taxation rule. Rate of 25% or 30% based on holding.', category: 'Article' },
  { term: 'Section 88', definition: 'Share capital gains taxation rule. Exemption after 5 years.', category: 'Article' },
  { term: 'Section 126', definition: 'Company income definition and tax rates.', category: 'Article' },
  { term: 'Section 3(9)', definition: 'Interest imputation on interest-free or low-rate loans.', category: 'Article' },
  { term: 'Retrait de société (משיכה מחברה)', definition: 'Shareholder withdrawal. May be considered as dividend.', category: 'Withdrawal' },
  { term: 'Actionnaire significatif (בעל מניות מהותי)', definition: 'Shareholder holding more than 10% capital. 30% rate on dividends.', category: 'Distribution' },
  { term: 'Moment d\'imposition (מועד החיוב)', definition: 'Date when income becomes taxable.', category: 'Tax' },
  { term: 'Événement fiscal (אירוע מס)', definition: 'Event triggering tax obligation.', category: 'General' },
  { term: 'Contribuable (חייב מס)', definition: 'Person or entity liable for tax.', category: 'General' },
];

export default function FiscalGlossary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<typeof glossaryTerms[0] | null>(null);

  const categories = ['all', ...Array.from(new Set(glossaryTerms.map(t => t.category)))];

  const filteredTerms = glossaryTerms.filter(term => {
    const matchesSearch = term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        term.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Distribution': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'Sale': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      'Tax': 'bg-gold-500/10 text-gold-400 border-gold-500/30',
      'Structure': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'Residence': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'Income': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      'International': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      'Loan': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      'Article': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      'Withdrawal': 'bg-red-500/10 text-red-400 border-red-500/30',
      'General': 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    };
    return colors[category] || 'bg-surface-input text-text-secondary border-border';
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Glossaire Fiscal</h1>
              <p className="text-text-secondary">Termes et concepts clés en fiscalité des sociétés</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={20} />
            <input
              type="text"
              placeholder="Rechercher des termes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-3 bg-surface-input border border-border rounded-xl px-4">
            <Filter size={18} className="text-text-tertiary" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none text-text-primary focus:outline-none py-3 pr-2"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Toutes les catégories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-surface-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  Termes
                </h3>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                  {filteredTerms.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredTerms.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTerm(term)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedTerm?.term === term.term
                        ? 'bg-blue-500/10 border-2 border-blue-500/30 shadow-card'
                        : 'bg-surface-input border-2 border-transparent hover:border-border'
                    }`}
                  >
                    <div className="font-medium text-text-primary text-sm mb-1">{term.term}</div>
                    <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(term.category)}`}>
                      <Tag size={10} />
                      {term.category}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedTerm ? (
              <div className="bg-surface-card border border-border rounded-2xl p-8">
                <div className="mb-6">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getCategoryColor(selectedTerm.category)}`}>
                    <Hash size={14} />
                    {selectedTerm.category}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-6">{selectedTerm.term}</h2>
                <p className="text-text-secondary leading-relaxed text-lg mb-8">{selectedTerm.definition}</p>
                
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
                  <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-blue-400" />
                    Rechercher dans les documents PDF
                  </h4>
                  <p className="text-sm text-text-secondary mb-4">
                    Rechercher ce terme dans vos documents PDF pour trouver les articles de loi applicables et des exemples.
                  </p>
                  <Link
                    to="/search"
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Aller à la recherche
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-surface-card border border-border rounded-2xl p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-surface-input border border-border flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="h-10 w-10 text-text-tertiary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">Sélectionner un terme</h3>
                <p className="text-text-secondary">Cliquez sur un terme dans la liste pour voir sa définition</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
