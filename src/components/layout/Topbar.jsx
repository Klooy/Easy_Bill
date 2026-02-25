import { useState, useEffect, useRef } from 'react';
import { CreditCard, Shield, Moon, Sun, LogOut, Mail, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useSellerQuota } from '@/hooks/useSellerQuota';
import { authService } from '@/services/auth.service';
import { sileo } from 'sileo';

const Topbar = () => {
  const { user, role } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { quota } = useSellerQuota();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quotaMenuOpen, setQuotaMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const quotaMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen && !quotaMenuOpen) return;
    const handleClick = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (quotaMenuOpen && quotaMenuRef.current && !quotaMenuRef.current.contains(e.target)) {
        setQuotaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen, quotaMenuOpen]);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      sileo.success({ title: 'Sesión cerrada', description: 'Hasta pronto.' });
    } catch (err) {
      sileo.error({ title: 'Error al cerrar sesión', description: err.message });
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-900 md:hidden">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <img src="/easybill.png" alt="Easy Bill" className="h-7 w-7 rounded-input" />
        <span className="font-outfit text-base font-bold text-gray-900 dark:text-white">
          Easy Bill
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {role === 'admin' && (
          <div className="flex items-center gap-1 rounded-badge bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            <Shield className="h-3 w-3" />
            <span>Admin</span>
          </div>
        )}
        {role === 'seller' && quota !== null && (
          <div className="relative" ref={quotaMenuRef}>
            <button
              onClick={() => setQuotaMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded-badge bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 transition-colors active:scale-95 dark:bg-primary-900/30 dark:text-primary-300"
            >
              <CreditCard className="h-3 w-3" />
              <span className="font-mono">{quota}</span>
            </button>

            {quotaMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 animate-fade-in-up rounded-card border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 font-jakarta">Créditos restantes</p>
                <p className="mt-0.5 font-outfit text-2xl font-bold text-primary-600 dark:text-primary-400">{quota}</p>
                <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
                <a
                  href="https://wa.me/573106226041?text=Hola%2C%20quiero%20recargar%20cr%C3%A9ditos%20de%20facturaci%C3%B3n%20en%20Easy%20Bill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-input bg-gradient-to-r from-primary-500 to-primary-700 px-3 py-2 text-sm font-semibold text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Recargar créditos
                </a>
              </div>
            )}
          </div>
        )}

        {/* Avatar + Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 transition-all dark:bg-primary-900/40 dark:text-primary-300 active:scale-95"
            aria-label="Menu de usuario"
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 animate-fade-in-up rounded-card border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
              {/* Email */}
              <div className="flex items-center gap-2.5 rounded-input px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                <span className="truncate text-sm text-gray-700 dark:text-gray-300 font-jakarta">
                  {user?.email || 'Sin correo'}
                </span>
              </div>

              <div className="mx-2 my-1 border-t border-gray-100 dark:border-gray-700" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export { Topbar };
