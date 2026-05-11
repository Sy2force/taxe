import { NavLink } from 'react-router-dom';
import { FileQuestion, BookOpen, MessageSquare, ShieldCheck, FileCheck } from 'lucide-react';

const navItems = [
  { path: '/exercise',     icon: FileQuestion, label: 'Exercice',  color: 'from-violet-500 to-indigo-500' },
  { path: '/laws',         icon: BookOpen,     label: 'Lois',      color: 'from-blue-500 to-cyan-500' },
  { path: '/answers',      icon: MessageSquare,label: 'Réponses',  color: 'from-emerald-500 to-teal-500' },
  { path: '/verification', icon: ShieldCheck,  label: 'Vérif.',   color: 'from-amber-500 to-orange-500' },
  { path: '/final-check',  icon: FileCheck,    label: 'Final',     color: 'from-rose-500 to-pink-500' },
];

export default function BottomNav() {
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
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 select-none transition-all duration-200"
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive ? `bg-gradient-to-br ${item.color} shadow-lg` : 'bg-transparent'
                }`}
                style={isActive ? { boxShadow: '0 2px 12px rgba(99,102,241,0.3)' } : {}}
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
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
