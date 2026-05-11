import { useLocation, useNavigate } from 'react-router-dom';
import { FileQuestion, BookOpen, MessageSquare, FileText, ShieldCheck, FileCheck } from 'lucide-react';

const navItems = [
  { path: '/exercise',      icon: FileQuestion, label: 'Exercice', color: 'var(--gradient-primary)' },
  { path: '/laws',          icon: BookOpen,     label: 'Lois',     color: 'var(--gradient-secondary)' },
  { path: '/answers',       icon: MessageSquare,label: 'Suggestions', color: 'var(--gradient-success)' },
  { path: '/final-document',icon: FileText,     label: 'Doc.',     color: 'var(--gradient-purple)' },
  { path: '/verification',  icon: ShieldCheck,  label: 'Corr.',    color: 'var(--gradient-warning)' },
  { path: '/final',         icon: FileCheck,    label: 'Final',    color: 'var(--gradient-rose)' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Preserve query params when navigating
  const handleNavigate = (path: string) => {
    const searchParams = new URLSearchParams(location.search);
    navigate(`${path}?${searchParams.toString()}`);
  };
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'rgba(9,9,11,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 select-none transition-all duration-200"
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive ? 'text-white' : 'bg-transparent'
              }`}
              style={isActive 
                ? { background: item.color, boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }
                : {}
              }
            >
              <item.icon
                className={`w-4 h-4 transition-all ${isActive ? 'text-white' : 'text-zinc-600'}`}
              />
            </div>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wider transition-all ${
                isActive ? 'text-white' : 'text-zinc-600'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
