import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard,
  FileText,
  Users,
  Plus,
  MoreHorizontal,
  Hash,
} from 'lucide-react';

const sellerItems = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/invoices', label: 'Facturas', icon: FileText },
  { to: '/invoices/new', label: 'Nueva', icon: Plus, isFab: true },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/more', label: 'Más', icon: MoreHorizontal },
];

const adminItems = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/admin/sellers', label: 'Vendedores', icon: Users },
  { to: '/admin/sellers/new', label: 'Nuevo', icon: Plus, isFab: true },
  { to: '/admin/invoices', label: 'Facturas', icon: FileText },
  { to: '/admin/ranges', label: 'Rangos', icon: Hash },
];

/* ── Arc text animation for FAB ── */
const ARC_TEXT = 'FACTURAR';
const ARC_TOTAL = ARC_TEXT.length;
const ARC_RADIUS = 30;
const ARC_SPAN = 140;
const ARC_START = -ARC_SPAN / 2;
const ARC_STEP = ARC_SPAN / (ARC_TOTAL - 1);

const arcLetters = ARC_TEXT.split('').map((char, i) => {
  const angle = ARC_START + ARC_STEP * i;
  const rad = (angle * Math.PI) / 180;
  return { char, angle, x: ARC_RADIUS * Math.sin(rad), y: -ARC_RADIUS * Math.cos(rad) };
});

const FabArcText = () => {
  const [count, setCount] = useState(0);
  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const ids = [];
    const t = (fn, ms) => { const id = setTimeout(fn, ms); ids.push(id); };

    const run = () => {
      setShow(true);
      setFade(false);
      for (let i = 1; i <= ARC_TOTAL; i++) t(() => setCount(i), i * 90);
      t(() => setFade(true), ARC_TOTAL * 90 + 2000);
      t(() => { setShow(false); setFade(false); setCount(0); t(run, 5000); }, ARC_TOTAL * 90 + 2500);
    };

    t(run, 3000);
    return () => ids.forEach(clearTimeout);
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {arcLetters.map(({ char, angle, x, y }, i) => {
        const visible = i < count && !fade;
        return (
          <span
            key={i}
            className="absolute font-outfit text-[13px] font-black tracking-wider text-primary-600 dark:text-primary-400"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) rotate(${angle}deg)${visible ? '' : ' scale(0.4)'}`,
              opacity: visible ? 1 : 0,
              transition: fade
                ? 'opacity 400ms, transform 400ms'
                : 'opacity 150ms ease-out, transform 200ms ease-out',
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

const BottomNav = ({ className }) => {
  const { role } = useAuthStore();
  const navItems = role === 'admin' ? adminItems : sellerItems;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-900',
        className
      )}
    >
      {navItems.map(({ to, label, icon: Icon, isFab, end }) => {
        if (isFab) {
          return (
            <NavLink
              key={to}
              to={to}
              className="group flex flex-col items-center"
            >
              <div className="relative flex h-14 w-14 -translate-y-4 items-center justify-center">
                {/* Tooltip */}
                <span className="pointer-events-none absolute -top-8 rounded-full bg-gray-900/85 px-3 py-1 text-[11px] font-medium text-white opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-y-1 dark:bg-gray-700/90 whitespace-nowrap shadow-lg">
                  Facturar
                </span>
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-primary-md transition-all hover:-translate-y-1 hover:shadow-primary-lg active:scale-95">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                {role === 'seller' && <FabArcText />}
              </div>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-w-[56px] flex-col items-center gap-0.5 py-1 text-xs transition-colors',
                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export { BottomNav };
