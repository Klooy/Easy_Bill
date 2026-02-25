import { useState, useEffect, useMemo } from 'react';
import { Truck, Plus, Search, Pencil, Trash2, Mail, Phone, ArrowUpDown, X, MapPin, Building2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonGrid, SkeletonStatCard } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { useSuppliers } from '@/hooks/useSuppliers';
import { suppliersService } from '@/services/suppliers.service';
import { useDebounce } from '@/hooks/useDebounce';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'name_asc', label: 'Nombre A-Z' },
  { value: 'name_desc', label: 'Nombre Z-A' },
  { value: 'oldest', label: 'Más antiguos' },
];

const getInitials = (name) => {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
];
const getAvatarColor = (id) => AVATAR_COLORS[id?.charCodeAt?.(0) % AVATAR_COLORS.length || 0];

/* ── Stats Bar ─────────────────────────────────────── */
const StatsBar = ({ suppliers, loading }) => {
  const stats = useMemo(() => {
    const withEmail = suppliers.filter((s) => s.email).length;
    const withPhone = suppliers.filter((s) => s.phone).length;
    const withDoc = suppliers.filter((s) => s.document_number).length;
    return { total: suppliers.length, withEmail, withPhone, withDoc };
  }, [suppliers]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)}
      </div>
    );
  }

  const items = [
    { label: 'Total', value: stats.total, color: 'text-primary-600 dark:text-primary-400' },
    { label: 'Con email', value: stats.withEmail, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Con teléfono', value: stats.withPhone, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Con documento', value: stats.withDoc, color: 'text-amber-600 dark:text-amber-400' },
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

/* ── Supplier Card ─────────────────────────────────── */
const SupplierCard = ({ supplier, onDelete }) => {
  const hasContact = supplier.email || supplier.phone;

  return (
    <div className="card-interactive rounded-card bg-white dark:bg-gray-800 shadow-card overflow-hidden">
      {/* Header with avatar */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getAvatarColor(supplier.id)}`}>
          {getInitials(supplier.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-outfit font-bold text-gray-900 dark:text-white">
            {supplier.name}
          </h3>
          {supplier.document_number ? (
            <div className="mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center rounded-badge bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {supplier.document_type || 'DOC'}
              </span>
              <span className="truncate text-xs text-gray-500 dark:text-gray-400 font-mono">
                {supplier.document_number}
              </span>
            </div>
          ) : (
            <p className="mt-0.5 text-xs italic text-gray-400 dark:text-gray-500">Sin documento</p>
          )}
        </div>
      </div>

      {/* Contact info — clickable */}
      <div className="space-y-0.5 border-t border-gray-50 px-4 py-2.5 dark:border-gray-700/50">
        {supplier.email ? (
          <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 min-w-0 transition-colors">
            <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="truncate">{supplier.email}</span>
          </a>
        ) : (
          <p className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-600 min-w-0">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="italic text-xs">Sin email</span>
          </p>
        )}
        {supplier.phone ? (
          <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 min-w-0 transition-colors">
            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="truncate">{supplier.phone}</span>
          </a>
        ) : (
          <p className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-600 min-w-0">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="italic text-xs">Sin teléfono</span>
          </p>
        )}
        {supplier.address && (
          <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 min-w-0">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="truncate">{supplier.address}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-50 dark:border-gray-700/50">
        <Link to={`/suppliers/${supplier.id}/edit`} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-primary-900/20 dark:hover:text-primary-400">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
        <div className="w-px bg-gray-50 dark:bg-gray-700/50" />
        <button
          onClick={() => onDelete(supplier)}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>
    </div>
  );
};

/* ── Filter Chips ──────────────────────────────────── */
const FilterChips = ({ activeFilter, onFilter, suppliers }) => {
  const counts = useMemo(() => {
    const nit = suppliers.filter((s) => s.document_type === 'NIT').length;
    const cc = suppliers.filter((s) => s.document_type === 'CC').length;
    const other = suppliers.filter((s) => s.document_type && s.document_type !== 'NIT' && s.document_type !== 'CC').length;
    const none = suppliers.filter((s) => !s.document_type).length;
    return { all: suppliers.length, nit, cc, other, none };
  }, [suppliers]);

  const filters = [
    { value: 'all', label: 'Todos', count: counts.all },
    { value: 'nit', label: 'NIT', count: counts.nit },
    { value: 'cc', label: 'CC', count: counts.cc },
    ...(counts.other > 0 ? [{ value: 'other', label: 'Otros', count: counts.other }] : []),
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

/* ── Main Page ─────────────────────────────────────── */
const SuppliersPage = () => {
  const { suppliers: allSuppliers, loading, refetch, searchSuppliers } = useSuppliers();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [filter, setFilter] = useState('all');
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    searchSuppliers(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  // Filter + Sort
  const suppliers = useMemo(() => {
    let filtered = [...allSuppliers];

    if (filter === 'nit') filtered = filtered.filter((s) => s.document_type === 'NIT');
    if (filter === 'cc') filtered = filtered.filter((s) => s.document_type === 'CC');
    if (filter === 'other') filtered = filtered.filter((s) => s.document_type && s.document_type !== 'NIT' && s.document_type !== 'CC');

    switch (sortBy) {
      case 'name_asc':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return filtered;
  }, [allSuppliers, filter, sortBy]);

  const totalPages = Math.ceil(suppliers.length / ITEMS_PER_PAGE);
  const from = (page - 1) * ITEMS_PER_PAGE;
  const paginatedSuppliers = suppliers.slice(from, from + ITEMS_PER_PAGE);

  const handleSearch = (e) => setSearchQuery(e.target.value);

  const handleFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await suppliersService.delete(deleteTarget.id);
      sileo.success({ title: 'Proveedor eliminado', description: `"${deleteTarget.name || ''}" fue eliminado.` });
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      sileo.error({ title: 'Error al eliminar proveedor', description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Proveedores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            Gestiona tus proveedores y contactos
          </p>
        </div>
        <Link to="/suppliers/new" className="w-full sm:w-auto">
          <Button className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proveedor
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <StatsBar suppliers={allSuppliers} loading={loading} />

      {/* Search + Sort + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              aria-label="Buscar"
              placeholder="Buscar por nombre, documento o email..."
              className="rounded-input pl-10"
              value={searchQuery}
              onChange={handleSearch}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
        {!loading && allSuppliers.length > 0 && (
          <FilterChips activeFilter={filter} onFilter={handleFilter} suppliers={allSuppliers} />
        )}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid count={6} type="card" />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={filter !== 'all' || searchQuery ? 'Sin resultados' : 'Sin proveedores'}
          description={
            filter !== 'all' ? 'No hay proveedores con este filtro' :
            searchQuery ? 'No se encontraron resultados' : 'Agrega tu primer proveedor'
          }
          action={
            filter !== 'all' || searchQuery ? (
              <Button variant="outline" className="rounded-input" onClick={() => { setFilter('all'); setSearchQuery(''); }}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : (
              <Link to="/suppliers/new">
                <Button className="rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo proveedor
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedSuppliers.map((supplier, i) => (
              <div key={supplier.id} className={`min-w-0 animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}>
                <SupplierCard supplier={supplier} onDelete={setDeleteTarget} />
              </div>
            ))}
          </div>
          <Pagination
            current={page}
            total={totalPages}
            from={from + 1}
            to={Math.min(from + ITEMS_PER_PAGE, suppliers.length)}
            count={suppliers.length}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Eliminar proveedor"
        description={`¿Estás seguro de eliminar a "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default SuppliersPage;
