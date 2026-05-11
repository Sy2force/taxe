import { useLocation, useNavigate } from 'react-router-dom';
import { FileQuestion, BookOpen, MessageSquare, FileText, ShieldCheck, FileCheck } from 'lucide-react';

const navItems = [
  { path: '/exercise',      icon: FileQuestion, label: 'Exercice',        step: '1', color: 'from-violet-500 to-indigo-500' },
  { path: '/laws',          icon: BookOpen,     label: 'Lois fiscales',   step: '2', color: 'from-blue-500 to-cyan-500' },
  { path: '/answers',       icon: MessageSquare,label: 'Suggestions',     step: '3', color: 'from-emerald-500 to-teal-500' },
  { path: '/final-document',icon: FileText,     label: 'Document final', step: '4', color: 'from-purple-500 to-violet-500' },
  { path: '/verification',  icon: ShieldCheck,  label: 'Correction',     step: '5', color: 'from-amber-500 to-orange-500' },
  { path: '/final',         icon: FileCheck,    label: 'Final',          step: '6', color: 'from-rose-500 to-pink-500' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Preserve query params when navigating
  const handleNavigate = (path: string) => {
    const searchParams = new URLSearchParams(location.search);
    navigate(`${path}?${searchParams.toString()}`);
  };
  return (
    <>
      {/* ── Desktop sidebar (≥1024px) ── */}
      <aside className="hidden lg:flex w-60 h-full flex-col flex-shrink-0" style={{
        background: 'rgba(9,9,11,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
      }}>
        {/* Logo */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
              <span className="text-white text-sm font-bold tracking-tight">CF</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary tracking-tight leading-tight">Correcteur Fiscalité</p>
              <p className="text-[11px] text-text-muted mt-0.5 tracking-wide uppercase">Pro · v2</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 mb-3">Étapes</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 select-none w-full text-left ${
                  isActive ? 'text-white' : 'text-text-tertiary hover:text-text-secondary'
                }`}
                style={isActive
                  ? { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }
                  : { border: '1px solid transparent' }
                }
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: 'linear-gradient(to bottom,#6366f1,#8b5cf6)' }} />
                )}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isActive ? `bg-gradient-to-br ${item.color} shadow-md` : 'bg-zinc-800/60 group-hover:bg-zinc-700/60'
                }`}>
                  <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`} />
                </div>
                <span className="text-[13px] font-medium tracking-tight">{item.label}</span>
                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                  isActive ? 'bg-indigo-500/30 text-indigo-300' : 'bg-zinc-800/80 text-zinc-500'
                }`}>{item.step}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
            <p className="text-[11px] text-indigo-400/80 leading-relaxed text-center">
              Réponses basées uniquement sur le document de lois importé
            </p>
          </div>
        </div>
      </aside>

      {/* ── Tablet sidebar (768–1023px): icônes seulement ── */}
      <aside className="hidden md:flex lg:hidden w-14 h-full flex-col flex-shrink-0 items-center py-4 gap-1" style={{
        background: 'rgba(9,9,11,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo mini */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
          <span className="text-white text-xs font-bold">CF</span>
        </div>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              title={item.label}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              style={isActive
                ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }
                : { border: '1px solid transparent' }
              }
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: 'linear-gradient(to bottom,#6366f1,#8b5cf6)' }} />
              )}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isActive ? `bg-gradient-to-br ${item.color}` : 'bg-zinc-800/60'
              }`}>
                <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              </div>
            </button>
          );
        })}
      </aside>
    </>
  );
}
