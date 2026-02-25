import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Plus, Search, Eye, Download, Calendar, Filter, X, Send, ArrowUpDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonGrid } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/common/Pagination';
import { invoicesService } from '@/services/invoices.service';
import { sileo } from 'sileo';
import { formatCurrency, formatDate } from '@/lib/format';
import { STATUS_COLORS, STATUS_LABELS, selectClass } from '@/lib/constants';
import { exportToCsv } from '@/lib/export';

const InvoiceRow = ({ invoice }) => {
  const clientName = invoice.clients?.names || invoice.clients?.company || '—';
  const isCreditNote = invoice.document_type === 'credit_note';
  const isDraft = invoice.status === 'draft';

  return (
    <Link
      to={`/invoices/${invoice.id}`}
      className={`card-interactive flex flex-col gap-2 rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between ${
        isDraft ? 'border-l-4 border-l-amber-400' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isCreditNote && (
            <span className="rounded-badge bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
              NC
            </span>
          )}
          <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
            {invoice.number || invoice.reference_code || 'Borrador'}
          </p>
          <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[invoice.status] || ''}`}>
            {STATUS_LABELS[invoice.status] || invoice.status}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300">{clientName}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Calendar className="h-3 w-3" />
          {formatDate(invoice.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className={`font-outfit text-lg font-bold ${isCreditNote ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
          {isCreditNote ? '-' : ''}{formatCurrency(invoice.total)}
        </p>
        {isDraft ? (
          <Send className="h-4 w-4 text-primary-500" />
        ) : (
          <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
    </Link>
  );
};

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const hasActiveFilters = statusFilter || documentType || dateFrom || dateTo;

  // Stats computed from current filtered invoices
  const stats = useMemo(() => {
    const drafts = invoices.filter((i) => i.status === 'draft').length;
    const issued = invoices.filter((i) => i.status === 'issued');
    const totalBilled = issued.reduce((sum, i) => sum + (i.total || 0), 0);
    return { total: invoices.length, drafts, totalBilled };
  }, [invoices]);

  // Sorted invoices
  const sortedInvoices = useMemo(() => {
    const copy = [...invoices];
    switch (sortBy) {
      case 'oldest':
        return copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'highest':
        return copy.sort((a, b) => (b.total || 0) - (a.total || 0));
      case 'lowest':
        return copy.sort((a, b) => (a.total || 0) - (b.total || 0));
      default: // newest
        return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }, [invoices, sortBy]);

  const fetchFiltered = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoicesService.getFiltered({
        search: debouncedSearch,
        status: statusFilter,
        documentType,
        dateFrom,
        dateTo,
      });
      setInvoices(data);
      setPage(1);
    } catch (err) {
      sileo.error({ title: 'Error al cargar documentos', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, documentType, dateFrom, dateTo]);

  useEffect(() => {
    fetchFiltered();
  }, [fetchFiltered]);

  const handleClearFilters = () => {
    setStatusFilter('');
    setDocumentType('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const totalPages = Math.ceil(sortedInvoices.length / ITEMS_PER_PAGE);
  const from = (page - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = sortedInvoices.slice(from, from + ITEMS_PER_PAGE);

  const handleExport = () => {
    exportToCsv(sortedInvoices, {
      filename: `facturas_${new Date().toISOString().slice(0, 10)}`,
      columns: {
        number: 'Número',
        'clients.names': 'Cliente',
        status: 'Estado',
        total: 'Total',
        created_at: 'Fecha',
        document_type: 'Tipo',
      },
      formatters: {
        status: (v) => STATUS_LABELS[v] || v,
        total: (v) => v?.toLocaleString('es-CO') || '0',
        created_at: (v) => v ? new Date(v).toLocaleDateString('es-CO') : '',
        document_type: (v) => v === 'credit_note' ? 'Nota crédito' : 'Factura',
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Facturas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            {invoices.length} {invoices.length === 1 ? 'documento' : 'documentos'}
          </p>
        </div>
        <div className="flex gap-2">
          {invoices.length > 0 && (
            <Button
              variant="outline"
              className="min-h-[44px] rounded-input"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          )}
          <Link to="/invoices/new">
            <Button className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva factura
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-card bg-white dark:bg-gray-800 p-3 shadow-card text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">Documentos</p>
            <p className="font-outfit text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="rounded-card bg-white dark:bg-gray-800 p-3 shadow-card text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">Borradores</p>
            <p className="font-outfit text-lg font-bold text-amber-600">{stats.drafts}</p>
          </div>
          <div className="rounded-card bg-white dark:bg-gray-800 p-3 shadow-card text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">Total facturado</p>
            <p className="font-outfit text-sm font-bold text-primary-600 sm:text-lg">{formatCurrency(stats.totalBilled)}</p>
          </div>
        </div>
      )}

      {/* Search + filter toggle + sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            aria-label="Buscar"
            placeholder="Buscar por número, referencia o cliente..."
            className="rounded-input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className={selectClass + ' min-h-[44px] w-full sm:w-40'}
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
        >
          <option value="newest">Más recientes</option>
          <option value="oldest">Más antiguas</option>
          <option value="highest">Mayor valor</option>
          <option value="lowest">Menor valor</option>
        </select>
        <Button
          variant="outline"
          className={`min-h-[44px] rounded-input ${hasActiveFilters ? 'border-primary-500 text-primary-600' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white">
              {[statusFilter, documentType, dateFrom, dateTo].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="rounded-card border bg-white dark:bg-gray-800 p-4 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-outfit text-sm font-semibold text-gray-900 dark:text-white">Filtros avanzados</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-xs text-gray-500 dark:text-gray-400" onClick={handleClearFilters}>
                <X className="mr-1 h-3 w-3" /> Limpiar
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <select
                className="flex h-10 w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="issued">Emitidas</option>
                <option value="draft">Borradores</option>
                <option value="rejected">Rechazadas</option>
                <option value="annulled">Anuladas</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo documento</Label>
              <select
                className="flex h-10 w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="invoice">Facturas</option>
                <option value="credit_note">Notas crédito</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                className="rounded-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                className="rounded-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonGrid count={5} type="row" />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos"
          description={searchQuery || hasActiveFilters ? 'No se encontraron resultados con los filtros aplicados' : 'Emite tu primera factura electrónica'}
          action={
            !searchQuery && !hasActiveFilters && (
              <Link to="/invoices/new">
                <Button className="rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva factura
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginatedInvoices.map((invoice, i) => (
              <div key={invoice.id} className={`min-w-0 animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}>
                <InvoiceRow invoice={invoice} />
              </div>
            ))}
          </div>
          <Pagination
            current={page}
            total={totalPages}
            from={from + 1}
            to={Math.min(from + ITEMS_PER_PAGE, sortedInvoices.length)}
            count={sortedInvoices.length}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </div>
  );
};

export default InvoicesPage;
