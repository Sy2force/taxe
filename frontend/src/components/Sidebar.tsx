import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Search,
  HelpCircle,
  CheckCircle,
  Settings,
  BookOpen,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', category: 'workflow' },
  { path: '/upload', icon: FileText, label: 'Document principal', category: 'workflow' },
  { path: '/homework', icon: BookOpen, label: 'Questions du devoir', category: 'workflow' },
  { path: '/question', icon: HelpCircle, label: 'Analyser une question', category: 'workflow' },
  { path: '/corrector', icon: CheckCircle, label: 'Corriger une réponse', category: 'workflow' },
  { path: '/verification', icon: ShieldCheck, label: 'Vérification finale', category: 'workflow' },
  { path: '/search', icon: Search, label: 'Recherche (avancé)', category: 'advanced' },
  { path: '/settings', icon: Settings, label: 'Paramètres', category: 'advanced' },
];

const categoryLabels: Record<string, string> = {
  workflow: 'Workflow du devoir',
  advanced: 'Outils avancés',
};

export default function Sidebar() {
  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <aside className="w-64 min-h-screen bg-background-secondary border-r border-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Correcteur Fiscalité</h1>
            <p className="text-xs text-text-secondary">Pro Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3 px-3">
              {categoryLabels[category] || category}
            </p>
            <div className="space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
                    }`
                  }
                >
                  <item.icon className={`w-4 h-4 transition-colors ${
                    ({ isActive }: { isActive: boolean }) => isActive ? 'text-blue-400' : 'text-text-tertiary group-hover:text-text-secondary'
                  }`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary" />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary mb-1">Rappel éthique</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Cet outil aide à comprendre, structurer et corriger. Il ne remplace pas le travail personnel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
