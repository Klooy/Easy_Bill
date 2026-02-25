import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Plus, Trash2, Power, PowerOff, Calendar,
  ArrowLeft, Eye, Search,
} from 'lucide-react';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonGrid } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { useRecurring } from '@/hooks/useRecurring';
import { recurringService } from '@/services/recurring.service';
import { formatCurrency, formatDate } from '@/lib/format';
import { FREQ_LABELS } from '@/lib/constants';
import { useDebounce } from '@/hooks/useDebounce';

const calcItemsTotal = (items) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    const discount = lineTotal * ((item.discount_rate || 0) / 100);
    const taxable = lineTotal - discount;
    const tax = item.is_excluded ? 0 : taxable * (parseFloat(item.tax_rate || '0') / 100);
    return sum + taxable + tax;
  }, 0);
};

const RecurringCard = ({ recurring, onToggle, onDelete }) => {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const clientName = recurring.clients?.names || recurring.clients?.company || '—';
  const total = calcItemsTotal(recurring.items);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle(recurring.id, !recurring.active);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(recurring.id);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="card-interactive rounded-card bg-white dark:bg-gray-800 p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 shrink-0 ${recurring.active ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
            <p className="truncate font-outfit font-bold text-gray-900 dark:text-white">{recurring.name}</p>
          </div>
          <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">{clientName}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${recurring.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 dark:text-gray-400'}`}>
            {recurring.active ? 'Activa' : 'Pausada'}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Frecuencia</p>
          <p className="font-medium text-gray-900 dark:text-white">{FREQ_LABELS[recurring.frequency]}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Próxima emisión</p>
          <p className="flex items-center gap-1 font-medium text-gray-900 dark:text-white">
            <Calendar className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            {formatDate(recurring.next_run_date)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total estimado</p>
          <p className="font-outfit font-bold text-primary-600">{formatCurrency(total)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Generadas</p>
          <p className="font-medium text-gray-900 dark:text-white">{recurring.total_generated}</p>
        </div>
        {recurring.end_date && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Finaliza</p>
            <p className="font-medium text-gray-900 dark:text-white">{formatDate(recurring.end_date)}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
        <Link to={`/recurring/${recurring.id}`}>
          <Button variant="outline" size="sm" className="rounded-input min-h-[36px]">
            <Eye className="mr-1 h-3.5 w-3.5" /> Ver
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="rounded-input min-h-[36px]"
          onClick={handleToggle}
          disabled={toggling}
        >
          {recurring.active ? (
            <><PowerOff className="mr-1 h-3.5 w-3.5" /> Pausar</>
          ) : (
            <><Power className="mr-1 h-3.5 w-3.5" /> Activar</>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-input min-h-[36px] text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar recurrente"
        description="¿Eliminar esta factura recurrente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
};

const RecurringInvoicesPage = () => {
  const { recurring, loading, error, refetch } = useRecurring();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const filtered = useMemo(() => {
    if (!debouncedSearch) return recurring;
    const term = debouncedSearch.toLowerCase();
    return recurring.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const client = (r.clients?.names || r.clients?.company || '').toLowerCase();
      return name.includes(term) || client.includes(term);
    });
  }, [recurring, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const from = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(from, from + ITEMS_PER_PAGE);

  const handleToggle = async (id, active) => {
    try {
      await recurringService.toggleActive(id, active);
      sileo.success({ title: active ? 'Factura recurrente activada' : 'Factura recurrente pausada', description: active ? 'Se emitirá automáticamente en la próxima fecha programada.' : 'No se emitirán más facturas hasta que la reactives.' });
      refetch();
    } catch (err) {
      sileo.error({ title: 'Error al cambiar estado', description: err.message || 'Ocurrió un error inesperado.' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await recurringService.delete(id);
      sileo.success({ title: 'Factura recurrente eliminada', description: 'La programación fue eliminada permanentemente.' });
      refetch();
    } catch (err) {
      sileo.error({ title: 'Error al eliminar', description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/invoices">
            <Button variant="outline" size="icon" className="rounded-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Facturas Recurrentes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Automatiza la emisión periódica de facturas</p>
          </div>
        </div>
        <Link to="/recurring/new">
          <Button className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva recurrente
          </Button>
        </Link>
      </div>

      {/* Search */}
      {recurring.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            aria-label="Buscar"
            placeholder="Buscar por nombre o cliente..."
            className="rounded-input pl-10"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
      )}

      {loading ? (
        <SkeletonGrid count={3} type="row" />
      ) : error ? (
        <div className="rounded-card bg-white dark:bg-gray-800 p-8 text-center shadow-card">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : recurring.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Sin facturas recurrentes"
          description="Crea una factura recurrente para automatizar emisiones periódicas."
          action={
            <Link to="/recurring/new">
              <Button className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md">
                <Plus className="mr-2 h-4 w-4" /> Crear primera recurrente
              </Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="No se encontraron recurrentes con esa búsqueda."
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((r, i) => (
              <div key={r.id} className={`min-w-0 animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}>
                <RecurringCard
                  recurring={r}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
          <Pagination
            current={page}
            total={totalPages}
            from={from + 1}
            to={Math.min(from + ITEMS_PER_PAGE, filtered.length)}
            count={filtered.length}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </div>
  );
};

export default RecurringInvoicesPage;
