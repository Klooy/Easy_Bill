import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Search, RefreshCw, CheckCircle, Clock, X, ArrowUpDown, DollarSign, Hash, User, Calendar } from 'lucide-react';
import { sileo } from 'sileo';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { SkeletonStatCard } from '@/components/common/Skeleton';
import { factusService } from '@/services/factus.service';

const statusMap = {
  1: { label: 'Validada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  0: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
};

const BillStatusBadge = ({ status }) => {
  const config = statusMap[status] || statusMap[0];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

/* ── Stats Bar ─────────────────────────────────────── */
const StatsBar = ({ bills, pagination, loading }) => {
  const stats = useMemo(() => {
    if (!bills.length) return { total: pagination?.total || 0, validated: 0, pending: 0, sum: 0 };
    const validated = bills.filter((b) => b.status === 1).length;
    const pending = bills.filter((b) => b.status === 0).length;
    const sum = bills.reduce((acc, b) => acc + Number(b.total || 0), 0);
    return { total: pagination?.total || bills.length, validated, pending, sum };
  }, [bills, pagination]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)}
      </div>
    );
  }

  const items = [
    { label: 'Total facturas', value: stats.total, color: 'text-primary-600 dark:text-primary-400' },
    { label: 'Validadas', value: stats.validated, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pendientes', value: stats.pending, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Monto pagina', value: `$${stats.sum.toLocaleString('es-CO')}`, color: 'text-blue-600 dark:text-blue-400', small: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item, i) => (
        <div key={item.label} className={`animate-fade-in-up stagger-${i + 1} rounded-card bg-white dark:bg-gray-800 p-3 shadow-card sm:p-4`}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 font-jakarta">{item.label}</p>
          <p className={`mt-1 font-outfit font-bold ${item.small ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};

/* ── Bill Card (Mobile) ────────────────────────────── */
const BillCard = ({ bill, index }) => (
  <div className={`rounded-card bg-white dark:bg-gray-800 shadow-card overflow-hidden animate-fade-in-up stagger-${Math.min(index + 1, 12)}`}>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{bill.number}</p>
          <p className="mt-0.5 truncate font-jakarta text-sm font-medium text-gray-900 dark:text-white">
            {bill.graphic_representation_name || bill.names || '—'}
          </p>
          {bill.identification && (
            <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">{bill.identification}</p>
          )}
        </div>
        <BillStatusBadge status={bill.status} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center rounded-input bg-gray-50/80 dark:bg-gray-700/30 p-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-jakarta">Total</p>
          <p className="font-outfit text-sm font-bold text-gray-900 dark:text-white">
            ${Number(bill.total).toLocaleString('es-CO')}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-jakarta">Pago</p>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {bill.payment_form?.name || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-jakarta">Fecha</p>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{bill.created_at || '—'}</p>
        </div>
      </div>

      {bill.reference_code && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Ref: <span className="font-mono">{bill.reference_code}</span>
        </p>
      )}

      {bill.errors && bill.errors.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400">
            {bill.errors.length} advertencia{bill.errors.length !== 1 ? 's' : ''}
          </summary>
          <ul className="mt-1 space-y-0.5">
            {bill.errors.map((err, i) => (
              <li key={i} className="text-xs text-orange-400">{err}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  </div>
);

/* ── Main Page ─────────────────────────────────────── */
const AdminInvoicesPage = () => {
  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await factusService.getBills(page, 10, search);
      setBills(result.data?.data || []);
      setPagination(result.data?.pagination || null);
    } catch (err) {
      setError(err.message);
      sileo.error({ title: 'Error al cargar facturas FACTUS', description: err.message });
      setBills([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Facturas FACTUS</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            {pagination
              ? `Pagina ${pagination.current_page} de ${pagination.last_page}`
              : 'Historial de facturas emitidas via API FACTUS'}
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-[44px] rounded-input"
          onClick={fetchBills}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <StatsBar bills={bills} pagination={pagination} loading={loading} />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            aria-label="Buscar"
            placeholder="Buscar por número, nombre o identificación..."
            className="rounded-input pl-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" className="min-h-[44px] shrink-0 rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white">
          Buscar
        </Button>
        {search && (
          <Button type="button" variant="outline" className="min-h-[44px] shrink-0 rounded-input" onClick={handleClearSearch}>
            Limpiar
          </Button>
        )}
      </form>

      {/* Content */}
      {loading ? (
        <LoadingSpinner text="Consultando FACTUS..." />
      ) : error ? (
        <div className="rounded-card bg-red-50 dark:bg-red-900/10 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-jakarta">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchBills}>
            Reintentar
          </Button>
        </div>
      ) : bills.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? 'Sin resultados' : 'No hay facturas'}
          description={
            search
              ? 'No se encontraron facturas con ese criterio de búsqueda.'
              : 'Aún no se han emitido facturas en la API FACTUS.'
          }
          action={search && (
            <Button variant="outline" className="rounded-input" onClick={handleClearSearch}>
              <X className="mr-2 h-4 w-4" />
              Limpiar búsqueda
            </Button>
          )}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="block md:hidden space-y-3">
            {bills.map((bill, i) => (
              <BillCard key={bill.id} bill={bill} index={i} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto rounded-card bg-white dark:bg-gray-800 shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20">
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Número</th>
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Cliente</th>
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Identificación</th>
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Total</th>
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pago</th>
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {bills.map((bill) => (
                  <tr key={bill.id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-bold text-primary-600 dark:text-primary-400">
                      {bill.number}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-jakarta text-sm text-gray-900 dark:text-white">
                      {bill.graphic_representation_name || bill.names || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                      {bill.identification || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-outfit text-sm font-bold text-gray-900 dark:text-white">
                      ${Number(bill.total).toLocaleString('es-CO')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {bill.payment_form?.name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <BillStatusBadge status={bill.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {bill.created_at || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <Pagination
              current={pagination.current_page}
              total={pagination.last_page}
              from={pagination.from}
              to={pagination.to}
              count={pagination.total}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AdminInvoicesPage;
