import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  LogOut,
  Receipt,
  RefreshCw,
  Moon,
  Sun,
  Hash,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { authService } from '@/services/auth.service';
import { sileo } from 'sileo';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/sellers', label: 'Vendedores', icon: Users },
  { to: '/admin/invoices', label: 'Facturas', icon: FileText },
  { to: '/admin/ranges', label: 'Rangos', icon: Hash },
];

const sellerLinks = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/invoices', label: 'Facturas', icon: FileText },
  { to: '/recurring', label: 'Recurrentes', icon: RefreshCw },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/suppliers', label: 'Proveedores', icon: Receipt },
];

const Sidebar = ({ className, collapsed = false, onToggle }) => {
  const { role, user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const links = role === 'admin' ? adminLinks : sellerLinks;

  const handleLogout = async () => {
    try {
      await authService.signOut();
      sileo.success({ title: 'Sesión cerrada', description: 'Hasta pronto.' });
    } catch (err) {
      sileo.error({ title: 'Error al cerrar sesión', description: err.message });
    }
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 transition-[width] duration-300',
        collapsed ? 'w-[68px]' : 'w-[248px]',
        className
      )}
    >
      {/* Logo — fixed top */}
      <div className={cn(
        'shrink-0 border-b border-gray-100 dark:border-gray-800 px-3 transition-all duration-300',
        collapsed ? 'flex flex-col items-center gap-1.5 py-2.5' : 'flex h-16 items-center gap-2'
      )}>
        <img src="/easybill.png" alt="Easy Bill" className="h-8 w-8 shrink-0 rounded-input" />
        {!collapsed && (
          <span className="font-outfit text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
            Easy Bill
          </span>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-input text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors ml-auto"
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Nav links — scrollable */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout — fixed bottom */}
      <div className="shrink-0 border-t border-gray-100 p-3 dark:border-gray-800">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {user?.email || 'Usuario'}
              </p>
              <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{role}</p>
            </div>
          </div>
        )}
        <div className={cn('flex gap-2', collapsed && 'flex-col')}>
          <button
            onClick={toggleTheme}
            className="flex flex-1 items-center justify-center gap-2 rounded-input px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-input px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export { Sidebar };
