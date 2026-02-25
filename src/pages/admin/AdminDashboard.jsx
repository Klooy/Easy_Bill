import { useMemo } from 'react';
import { Users, FileText, TrendingUp, AlertCircle, ArrowRight, Plus, CreditCard, UserPlus, Activity, BarChart3, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { SkeletonStatCard } from '@/components/common/Skeleton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAdminStats, useSellers } from '@/hooks/useSellers';
import { useAuthStore } from '@/store/auth.store';

const StatCard = ({ icon: Icon, label, value, description, color, index = 0 }) => {
  const colors = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const valueColors = {
    primary: 'text-primary-600 dark:text-primary-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className={`animate-fade-in-up stagger-${index + 1} rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5`}>
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[9px] ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <p className={`font-outfit text-2xl font-bold sm:text-3xl ${valueColors[color]}`}>{value}</p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 font-jakarta">{label}</p>
        {description && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>}
      </div>
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, to, color }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40',
  };
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-card p-3 transition-all hover:-translate-y-0.5 sm:p-4 ${colors[color]}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-white/60 dark:bg-gray-800/60">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <span className="text-sm font-semibold font-jakarta">{label}</span>
    </Link>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const AdminDashboard = () => {
  const { stats, loading: statsLoading } = useAdminStats();
  const { sellers, loading: sellersLoading } = useSellers();
  const { user } = useAuthStore();

  const recentSellers = sellers.slice(0, 5);

  // Derived stats
  const sellerInsights = useMemo(() => {
    if (!sellers.length) return { lowCredit: 0, highUsage: 0, totalAvailable: 0 };
    const lowCredit = sellers.filter((s) => s.status === 'active' && s.invoice_quota <= 5).length;
    const highUsage = sellers.filter((s) => {
      const total = s.invoice_quota + s.invoice_used;
      return total > 0 && (s.invoice_used / total) >= 0.8;
    }).length;
    const totalAvailable = sellers.reduce((sum, s) => sum + (s.invoice_quota || 0), 0);
    return { lowCredit, highUsage, totalAvailable };
  }, [sellers]);

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="skeleton-shimmer h-7 w-56 rounded" />
          <div className="skeleton-shimmer mt-2 h-4 w-40 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="animate-fade-in-up">
        <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}, Admin
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
          Aquí tienes el resumen de tu plataforma Easy Bill
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Vendedores activos" value={stats?.activeSellers ?? 0} color="primary" index={0} />
        <StatCard icon={FileText} label="Facturas emitidas" value={stats?.totalInvoices ?? 0} color="blue" index={1} />
        <StatCard icon={CreditCard} label="Créditos distribuidos" value={stats?.totalCredits ?? 0} color="emerald" index={2} />
        <StatCard icon={AlertCircle} label="Cuentas suspendidas" value={stats?.suspendedSellers ?? 0} color={stats?.suspendedSellers > 0 ? 'red' : 'amber'} index={3} />
      </div>

      {/* Alerts — Low credit sellers */}
      {sellerInsights.lowCredit > 0 && (
        <div className="animate-fade-in-up rounded-card border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 font-jakarta">
                {sellerInsights.lowCredit} vendedor{sellerInsights.lowCredit > 1 ? 'es' : ''} con créditos bajos
              </p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                Tienen 5 o menos créditos disponibles. Considera asignar mas para evitar interrupciones.
              </p>
            </div>
            <Link to="/admin/sellers">
              <Button variant="ghost" size="sm" className="shrink-0 text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400">
                Ver
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions + Summary Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5">
          <h2 className="mb-3 font-outfit text-base font-bold text-gray-900 dark:text-white">Acciones rápidas</h2>
          <div className="space-y-2">
            <QuickAction icon={UserPlus} label="Crear vendedor" to="/admin/sellers/new" color="primary" />
            <QuickAction icon={BarChart3} label="Ver facturas FACTUS" to="/admin/invoices" color="blue" />
            <QuickAction icon={Users} label="Gestionar vendedores" to="/admin/sellers" color="emerald" />
          </div>
        </div>

        {/* Platform summary */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5 lg:col-span-2">
          <h2 className="mb-3 font-outfit text-base font-bold text-gray-900 dark:text-white">Resumen de la plataforma</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-input border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-700/30">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">Total vendedores</p>
              <p className="mt-1 font-outfit text-lg font-bold text-gray-900 dark:text-white">{sellers.length}</p>
            </div>
            <div className="rounded-input border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-700/30">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">Créditos disponibles</p>
              <p className="mt-1 font-outfit text-lg font-bold text-emerald-600 dark:text-emerald-400">{sellerInsights.totalAvailable}</p>
            </div>
            <div className="rounded-input border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-700/30">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">Uso alto (+80%)</p>
              <p className="mt-1 font-outfit text-lg font-bold text-amber-600 dark:text-amber-400">{sellerInsights.highUsage}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent sellers */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-outfit text-base font-bold text-gray-900 dark:text-white">Vendedores recientes</h2>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Últimos vendedores registrados</p>
          </div>
          <Link to="/admin/sellers">
            <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
              Ver todos
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {sellersLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-input border px-4 py-3">
                <div className="skeleton-shimmer h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-shimmer h-4 w-32 rounded" />
                  <div className="skeleton-shimmer h-3 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recentSellers.length === 0 ? (
          <div className="rounded-input border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <Users className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 font-jakarta">
              No hay vendedores registrados aun
            </p>
            <Link to="/admin/sellers/new">
              <Button size="sm" className="mt-3 rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white">
                <UserPlus className="mr-2 h-3.5 w-3.5" />
                Crear vendedor
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSellers.map((seller) => {
              const total = seller.invoice_quota + seller.invoice_used;
              const usedPercent = total > 0 ? Math.round((seller.invoice_used / total) * 100) : 0;
              const isLow = seller.status === 'active' && seller.invoice_quota <= 5;

              return (
                <Link
                  key={seller.id}
                  to={`/admin/sellers/${seller.id}`}
                  className="flex items-center justify-between rounded-input border border-gray-100 px-4 py-3 transition-all hover:bg-gray-50 hover:shadow-sm dark:border-gray-700/50 dark:hover:bg-gray-700/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-outfit font-bold text-sm">
                      {seller.company_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white font-jakarta truncate">
                        {seller.company_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {seller.nit && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{seller.nit}</p>
                        )}
                        <StatusBadge status={seller.status} className="text-[10px] px-1.5 py-0 gap-1 whitespace-nowrap shrink-0" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-3 shrink-0">
                    {/* Credit indicator */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-jakarta">Créditos</p>
                        <p className={`text-sm font-bold font-outfit ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-primary-600 dark:text-primary-400'}`}>
                          {seller.invoice_quota}
                        </p>
                      </div>
                      <div className="h-8 w-8">
                        <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-700" />
                          <circle
                            cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                            strokeDasharray={`${usedPercent * 0.942} 94.2`}
                            strokeLinecap="round"
                            className={isLow ? 'text-amber-500' : 'text-primary-500'}
                            stroke="currentColor"
                          />
                        </svg>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
