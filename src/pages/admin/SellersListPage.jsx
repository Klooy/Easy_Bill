import { useState, useMemo } from 'react';
import { Users, Plus, Search, Ban, PlayCircle, ArrowUpDown, X, CreditCard, AlertCircle, Mail, Phone, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonGrid, SkeletonStatCard } from '@/components/common/Skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { useSellers } from '@/hooks/useSellers';
import { sellersService } from '@/services/sellers.service';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'name_asc', label: 'Nombre A-Z' },
  { value: 'name_desc', label: 'Nombre Z-A' },
  { value: 'credits_low', label: 'Menos créditos' },
  { value: 'credits_high', label: 'Mas créditos' },
  { value: 'usage_high', label: 'Mayor uso' },
];

const AVATAR_COLORS = [
  'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
];
const getAvatarColor = (id) => AVATAR_COLORS[id?.charCodeAt?.(0) % AVATAR_COLORS.length || 0];

/* ── Stats Bar ─────────────────────────────────────── */
const StatsBar = ({ sellers, loading }) => {
  const stats = useMemo(() => {
    const active = sellers.filter((s) => s.status === 'active').length;
    const suspended = sellers.filter((s) => s.status === 'suspended').length;
    const totalCredits = sellers.reduce((sum, s) => sum + (s.invoice_quota || 0), 0);
    const lowCredit = sellers.filter((s) => s.status === 'active' && s.invoice_quota <= 5).length;
    return { total: sellers.length, active, suspended, totalCredits, lowCredit };
  }, [sellers]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)}
      </div>
    );
  }

  const items = [
    { label: 'Total', value: stats.total, color: 'text-primary-600 dark:text-primary-400' },
    { label: 'Activos', value: stats.active, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Suspendidos', value: stats.suspended, color: 'text-red-600 dark:text-red-400' },
    { label: 'Créditos totales', value: stats.totalCredits, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item, i) => (
        <div key={item.label} className={`animate-fade-in-up stagger-${i + 1} rounded-card bg-white dark:bg-gray-800 p-3 shadow-card sm:p-4`}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 font-jakarta">{item.label}</p>
          <p className={`mt-1 font-outfit text-xl font-bold sm:text-2xl ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};

/* ── Filter Chips ──────────────────────────────────── */
const FilterChips = ({ activeFilter, onFilter, sellers }) => {
  const counts = useMemo(() => {
    const active = sellers.filter((s) => s.status === 'active').length;
    const suspended = sellers.filter((s) => s.status === 'suspended').length;
    const lowCredit = sellers.filter((s) => s.status === 'active' && s.invoice_quota <= 5).length;
    return { all: sellers.length, active, suspended, lowCredit };
  }, [sellers]);

  const filters = [
    { value: 'all', label: 'Todos', count: counts.all },
    { value: 'active', label: 'Activos', count: counts.active },
    { value: 'suspended', label: 'Suspendidos', count: counts.suspended },
    ...(counts.lowCredit > 0 ? [{ value: 'low_credit', label: 'Créditos bajos', count: counts.lowCredit }] : []),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onFilter(f.value)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            activeFilter === f.value
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {f.label}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            activeFilter === f.value
              ? 'bg-white/20 text-white'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {f.count}
          </span>
        </button>
      ))}
    </div>
  );
};

/* ── Seller Card ───────────────────────────────────── */
const SellerCard = ({ seller, onSuspend, onReactivate, onClick }) => {
  const total = seller.invoice_quota + seller.invoice_used;
  const usedPercent = total > 0 ? Math.round((seller.invoice_used / total) * 100) : 0;
  const isLow = seller.status === 'active' && seller.invoice_quota <= 5;

  return (
    <div className="card-interactive rounded-card bg-white dark:bg-gray-800 shadow-card overflow-hidden cursor-pointer" onClick={onClick}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getAvatarColor(seller.id)}`}>
          {seller.company_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-outfit font-bold text-gray-900 dark:text-white truncate">{seller.company_name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {seller.nit && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{seller.nit}</span>
            )}
            <StatusBadge status={seller.status} className="text-[10px] px-1.5 py-0 gap-1 whitespace-nowrap shrink-0" />
          </div>
        </div>
      </div>

      {/* Contact info */}
      {(seller.email || seller.phone) && (
        <div className="px-4 pb-2 space-y-0.5">
          {seller.email && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 min-w-0">
              <Mail className="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500" />
              <span className="truncate">{seller.email}</span>
            </p>
          )}
          {seller.phone && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 min-w-0">
              <Phone className="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500" />
              <span className="truncate">{seller.phone}</span>
            </p>
          )}
        </div>
      )}

      {/* Credits section */}
      <div className="mx-4 mb-3 mt-2 rounded-input border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-700/30">
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-jakarta">Disponible</p>
            <p className={`font-outfit text-sm font-bold ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-primary-600 dark:text-primary-400'}`}>
              {seller.invoice_quota}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-jakarta">Usados</p>
            <p className="font-outfit text-sm font-bold text-gray-700 dark:text-gray-300">{seller.invoice_used}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-jakarta">Uso</p>
            <p className="font-outfit text-sm font-bold text-gray-700 dark:text-gray-300">{usedPercent}%</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isLow ? 'bg-amber-500' : 'bg-gradient-to-r from-primary-500 to-primary-700'}`}
            style={{ width: `${Math.min(usedPercent, 100)}%` }}
          />
        </div>
        {isLow && (
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            <AlertCircle className="h-3 w-3" />
            Créditos bajos — asignar más
          </p>
        )}
      </div>

      {/* Actions footer */}
      <div className="flex border-t border-gray-50 dark:border-gray-700/50" onClick={(e) => e.stopPropagation()}>
        <Link
          to={`/admin/sellers/${seller.id}`}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
          onClick={(e) => e.stopPropagation()}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Créditos
        </Link>
        <div className="w-px bg-gray-50 dark:bg-gray-700/50" />
        {seller.status === 'active' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSuspend(seller); }}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <Ban className="h-3.5 w-3.5" />
            Suspender
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onReactivate(seller); }}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-gray-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Reactivar
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Main Page ─────────────────────────────────────── */
const SellersListPage = () => {
  const { sellers: allSellers, loading, error, refetch } = useSellers();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Filter + Sort
  const sellers = useMemo(() => {
    let filtered = [...allSellers];

    // Text search
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter((s) =>
        s.company_name?.toLowerCase().includes(term) ||
        s.nit?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filter === 'active') filtered = filtered.filter((s) => s.status === 'active');
    if (filter === 'suspended') filtered = filtered.filter((s) => s.status === 'suspended');
    if (filter === 'low_credit') filtered = filtered.filter((s) => s.status === 'active' && s.invoice_quota <= 5);

    // Sort
    switch (sortBy) {
      case 'name_asc':
        filtered.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
        break;
      case 'name_desc':
        filtered.sort((a, b) => (b.company_name || '').localeCompare(a.company_name || ''));
        break;
      case 'credits_low':
        filtered.sort((a, b) => (a.invoice_quota || 0) - (b.invoice_quota || 0));
        break;
      case 'credits_high':
        filtered.sort((a, b) => (b.invoice_quota || 0) - (a.invoice_quota || 0));
        break;
      case 'usage_high': {
        const getUsage = (s) => {
          const total = s.invoice_quota + s.invoice_used;
          return total > 0 ? s.invoice_used / total : 0;
        };
        filtered.sort((a, b) => getUsage(b) - getUsage(a));
        break;
      }
      default:
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return filtered;
  }, [allSellers, search, filter, sortBy]);

  const totalPages = Math.ceil(sellers.length / ITEMS_PER_PAGE);
  const from = (page - 1) * ITEMS_PER_PAGE;
  const paginatedSellers = sellers.slice(from, from + ITEMS_PER_PAGE);

  const handleFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const handleSuspend = (seller) => {
    setConfirmAction({
      type: 'suspend',
      seller,
      title: 'Suspender vendedor',
      description: `¿Estás seguro de suspender a "${seller.company_name}"? No podrá emitir facturas mientras esté suspendido.`,
    });
  };

  const handleReactivate = (seller) => {
    setConfirmAction({
      type: 'reactivate',
      seller,
      title: 'Reactivar vendedor',
      description: `¿Reactivar a "${seller.company_name}"? Podrá volver a emitir facturas.`,
    });
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      setActionLoading(true);
      if (confirmAction.type === 'suspend') {
        await sellersService.suspend(confirmAction.seller.id);
        sileo.success({ title: 'Vendedor suspendido', description: `"${confirmAction.seller.company_name}" fue suspendido exitosamente.` });
      } else {
        await sellersService.reactivate(confirmAction.seller.id);
        sileo.success({ title: 'Vendedor reactivado', description: `"${confirmAction.seller.company_name}" puede volver a emitir facturas.` });
      }
      refetch();
    } catch (err) {
      sileo.error({ title: 'Error al procesar la acción', description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Vendedores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            Gestiona vendedores, créditos y accesos
          </p>
        </div>
        <Link to="/admin/sellers/new" className="w-full sm:w-auto">
          <Button className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo vendedor
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <StatsBar sellers={allSellers} loading={loading} />

      {/* Search + Sort + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              aria-label="Buscar"
              placeholder="Buscar por nombre, NIT o email..."
              className="rounded-input pl-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="h-10 min-h-[44px] appearance-none rounded-input border border-input bg-white pl-3 pr-8 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        {!loading && allSellers.length > 0 && (
          <FilterChips activeFilter={filter} onFilter={handleFilter} sellers={allSellers} />
        )}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid count={6} type="card" />
      ) : error ? (
        <div className="rounded-card bg-red-50 dark:bg-red-900/10 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-jakarta">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
            Reintentar
          </Button>
        </div>
      ) : sellers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filter !== 'all' || search ? 'Sin resultados' : 'No hay vendedores'}
          description={
            filter !== 'all' ? 'No hay vendedores con este filtro' :
            search ? 'Intenta con otro término de búsqueda' : 'Crea el primer vendedor para empezar'
          }
          action={
            filter !== 'all' || search ? (
              <Button variant="outline" className="rounded-input" onClick={() => { setFilter('all'); setSearch(''); }}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : (
              <Link to="/admin/sellers/new">
                <Button className="rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear vendedor
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedSellers.map((seller, i) => (
              <div key={seller.id} className={`min-w-0 animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}>
                <SellerCard
                  seller={seller}
                  onSuspend={handleSuspend}
                  onReactivate={handleReactivate}
                  onClick={() => navigate(`/admin/sellers/${seller.id}`)}
                />
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination
              current={page}
              total={totalPages}
              from={from + 1}
              to={Math.min(from + ITEMS_PER_PAGE, sellers.length)}
              count={sellers.length}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel={confirmAction?.type === 'suspend' ? 'Suspender' : 'Reactivar'}
        variant={confirmAction?.type === 'suspend' ? 'destructive' : 'default'}
        loading={actionLoading}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default SellersListPage;
