import { useState } from 'react';
import { searchApi, type SearchResult } from '../lib/api';
import { FileText, Plus, Search as SearchIcon, Sparkles, Filter, Bookmark } from 'lucide-react';

const hebrewKeywords = [
  'דיבידנד', 'רווח הון', 'מס חברות', 'מניות', 'בעל מניות',
  'חברה', 'תושב ישראל', 'הכנסה חייבת', 'שיעור המס', 'מקור ההכנסה',
  'חברה נשלטת זרה', 'חברת משלח יד זרה'
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await searchApi.search(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    setQuery(keyword);
    handleSearch();
  };

  const handleSaveAll = () => {
    alert('Fonctionnalité Enregistrer tout : Tous les résultats peuvent être sauvegardés.');
  };

  const handleAddToSources = (result: SearchResult) => {
    alert(`Fonctionnalité Ajouter aux sources : "${result.extract.substring(0, 50)}..." ajouté aux sources.`);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Rechercher dans les Sources</h1>
          <p className="text-text-secondary">
            Recherchez des mots-clés dans vos documents de droit fiscal PDF avec support hébreu
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Rechercher des mots-clés..."
              className="w-full pl-12 pr-32 py-4 bg-surface-input border border-border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Recherche en cours...' : 'Rechercher'}
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-400" />
              Mots-clés suggérés
            </h2>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {hebrewKeywords.map((keyword) => (
              <button
                key={keyword}
                onClick={() => handleKeywordClick(keyword)}
                className="px-4 py-2 bg-surface-card border border-border rounded-full text-sm text-text-secondary hover:text-text-primary hover:border-blue-500/50 hover:bg-surface-cardHover transition-all"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-surface-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-primary">
                Résultats ({results.length})
              </h2>
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Enregistrer tout
              </button>
            </div>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="p-5 bg-surface-input border border-border rounded-xl hover:border-blue-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-text-primary">
                          {result.documentName}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                            Pertinence : {Math.round(result.relevanceScore * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {result.beforeContext && (
                    <p className="text-sm text-text-secondary mb-2 italic">
                      {result.beforeContext}
                    </p>
                  )}
                  <p className="text-text-primary font-medium my-3 bg-blue-500/10 px-4 py-2 rounded-lg border-l-4 border-blue-500">
                    {result.extract}
                  </p>
                  {result.afterContext && (
                    <p className="text-sm text-text-secondary mb-2 italic">
                      {result.afterContext}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-text-secondary font-medium">{result.documentName}</span>
                    <span className="text-xs text-text-tertiary">Page {result.page || 'N/A'}</span>
                  </div>
                  <button
                    onClick={() => handleAddToSources(result)}
                    className="mt-4 text-sm text-blue-400 hover:text-blue-300 cursor-pointer font-medium flex items-center gap-2 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter aux sources
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {query && results.length === 0 && !loading && (
          <div className="bg-surface-card border border-border rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-surface-input border border-border flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-text-tertiary" />
            </div>
            <span className="text-xs text-text-tertiary">Aucun résultat trouvé</span> pour "{query}"
            <p className="text-sm text-text-secondary">
              Essayez d'autres mots-clés ou importez plus de documents
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
