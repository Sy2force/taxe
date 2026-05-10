import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, User, Settings } from 'lucide-react';

export default function Header() {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const location = useLocation();

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/health`);
        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('disconnected');
        }
      } catch {
        setBackendStatus('disconnected');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    const titles: Record<string, string> = {
      '/': 'Accueil',
      '/dashboard': 'Tableau de bord',
      '/upload': 'Documents',
      '/search': 'Recherche',
      '/question': 'Analyse de Questions',
      '/corrector': 'Correcteur',
      '/homework': 'Gestion du Devoir',
      '/instructions': 'Instructions du Professeur',
      '/glossary': 'Glossaire Fiscal',
      '/verification': 'Vérification Finale',
      '/declaration': 'Déclaration IA',
      '/guide': 'Mode d\'Emploi',
      '/settings': 'Paramètres',
    };
    return titles[path] || 'Tableau de bord';
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return [];
    if (path === '/dashboard') return [{ label: 'Tableau de bord', path: '/dashboard' }];
    
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = segments.map((_, index) => {
      const pathTo = '/' + segments.slice(0, index + 1).join('/');
      return { label: getPageTitle(), path: pathTo };
    });
    
    return [{ label: 'Tableau de bord', path: '/dashboard' }, ...breadcrumbs];
  };

  return (
    <header className="sticky top-0 z-50 bg-background-secondary/80 backdrop-blur-lg border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Left Section: Breadcrumbs and Title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-text-tertiary">
              {getBreadcrumbs().map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-2">
                  <span className={index === getBreadcrumbs().length - 1 ? 'text-text-primary font-medium' : ''}>
                    {crumb.label}
                  </span>
                  {index < getBreadcrumbs().length - 1 && <span className="text-text-muted">/</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Center Section: Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 bg-surface-input border border-border rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>

          {/* Right Section: Status and Actions */}
          <div className="flex items-center gap-4">
            {/* Backend Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-border rounded-lg">
              {backendStatus === 'connected' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">Connecté</span>
                </>
              ) : backendStatus === 'disconnected' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs font-medium text-red-400">Déconnecté</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-xs font-medium text-yellow-400">Vérification...</span>
                </>
              )}
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
            </button>

            {/* User Menu */}
            <button className="flex items-center gap-2 p-2 hover:bg-surface-card rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* Settings */}
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
