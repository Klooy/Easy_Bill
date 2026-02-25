import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { sileo } from 'sileo';
import {
  Package, Receipt, Settings, LogOut, ChevronRight,
  FileText, Users, LayoutDashboard, RefreshCw,
} from 'lucide-react';

const menuItems = [
  {
    label: 'Productos',
    description: 'Catálogo de productos y servicios',
    to: '/products',
    icon: Package,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    label: 'Proveedores',
    description: 'Directorio de proveedores',
    to: '/suppliers',
    icon: Receipt,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    label: 'Facturas Recurrentes',
    description: 'Emisión automática periódica',
    to: '/recurring',
    icon: RefreshCw,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    label: 'Configuración',
    description: 'Perfil, contraseña y apariencia',
    to: '/settings',
    icon: Settings,
    color: 'bg-gray-100 text-gray-600',
  },
];

const MorePage = () => {
  const { user } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authService.signOut();
      sileo.success({ title: 'Sesión cerrada', description: 'Hasta pronto.' });
    } catch (err) {
      sileo.error({ title: 'Error al cerrar sesión', description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Más opciones</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
          Accede a todas las secciones de tu cuenta
        </p>
      </div>

      {/* Menu links */}
      <div className="space-y-2">
        {menuItems.map(({ label, description, to, icon: Icon, color }, i) => (
          <Link
            key={to}
            to={to}
            className={`card-interactive flex items-center gap-4 rounded-card bg-white dark:bg-gray-800 p-4 shadow-card animate-fade-in-up stagger-${i + 1}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-input ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </Link>
        ))}
      </div>

      {/* User section */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-base font-semibold text-primary-700">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{user?.email || 'Usuario'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Vendedor</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-3 rounded-input px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default MorePage;
