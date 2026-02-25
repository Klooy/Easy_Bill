import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Pencil, Trash2, Tag, DollarSign, ArrowUpDown, Power, X, TrendingUp, Ban, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonGrid, SkeletonStatCard } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { useProducts } from '@/hooks/useProducts';
import { productsService } from '@/services/products.service';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/lib/format';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'name_asc', label: 'Nombre A-Z' },
  { value: 'name_desc', label: 'Nombre Z-A' },
  { value: 'price_high', label: 'Mayor precio' },
  { value: 'price_low', label: 'Menor precio' },
];

const TAX_COLORS = {
  '0.00': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  '5.00': 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  '8.00': 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  '19.00': 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
};

/* ── Stats Bar ─────────────────────────────────────── */
const StatsBar = ({ products, loading }) => {
  const stats = useMemo(() => {
    const active = products.filter((p) => p.active !== false).length;
    const inactive = products.length - active;
    const avgPrice = products.length > 0
      ? products.reduce((sum, p) => sum + (Number(p.price) || 0), 0) / products.length
      : 0;
    return { total: products.length, active, inactive, avgPrice };
  }, [products]);

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
    { label: 'Inactivos', value: stats.inactive, color: 'text-gray-500 dark:text-gray-400' },
    { label: 'Precio prom.', value: formatCurrency(stats.avgPrice), color: 'text-blue-600 dark:text-blue-400', isText: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item, i) => (
        <div key={item.label} className={`animate-fade-in-up stagger-${i + 1} rounded-card bg-white dark:bg-gray-800 p-3 shadow-card sm:p-4`}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 font-jakarta">{item.label}</p>
          <p className={`mt-1 font-outfit font-bold ${item.color} ${item.isText ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
};

/* ── Toggle Switch ─────────────────────────────────── */
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
    }`}
  >
    <span className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
      checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
    }`} />
  </button>
);

/* ── Product Card ──────────────────────────────────── */
const ProductCard = ({ product, onDelete, onToggleActive }) => {
  const isActive = product.active !== false;
  const taxColor = TAX_COLORS[product.tax_rate] || TAX_COLORS['19.00'];

  return (
    <div className={`card-interactive overflow-hidden rounded-card bg-white dark:bg-gray-800 shadow-card ${!isActive ? 'opacity-70' : ''}`}>
      {/* Price banner */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${
        isActive
          ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-900/10'
          : 'bg-gray-50 dark:bg-gray-800/50'
      }`}>
        <p className={`font-outfit text-lg font-bold ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'}`}>
          {formatCurrency(product.price)}
        </p>
        <span className={`inline-flex items-center rounded-badge px-2 py-0.5 text-[10px] font-bold ${taxColor}`}>
          {product.is_excluded ? 'EXCL' : `IVA ${product.tax_rate}%`}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-outfit font-bold text-gray-900 dark:text-white">{product.name}</h3>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400 font-mono">{product.code_reference}</p>
          </div>
        </div>
        {product.description && (
          <p className="mt-2 line-clamp-2 break-words text-sm text-gray-500 dark:text-gray-400">{product.description}</p>
        )}
      </div>

      {/* Footer: toggle + actions */}
      <div className="flex items-center justify-between border-t border-gray-50 px-4 py-2.5 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={isActive}
            onChange={() => onToggleActive(product)}
          />
          <span className={`text-xs font-medium ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div className="flex gap-1">
          <Link to={`/products/${product.id}/edit`}>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-badge">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-badge text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            onClick={() => onDelete(product)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ── Filter Chips ──────────────────────────────────── */
const FilterChips = ({ activeFilter, onFilter, products }) => {
  const counts = useMemo(() => {
    const active = products.filter((p) => p.active !== false).length;
    const inactive = products.length - active;
    return { all: products.length, active, inactive };
  }, [products]);

  const filters = [
    { value: 'all', label: 'Todos', count: counts.all, icon: Package },
    { value: 'active', label: 'Activos', count: counts.active, icon: CheckCircle2 },
    { value: 'inactive', label: 'Inactivos', count: counts.inactive, icon: Ban },
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
          <f.icon className="h-3 w-3" />
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
const ProductsPage = () => {
  const { products: allProducts, loading, refetch, searchProducts } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [filter, setFilter] = useState('all');
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    searchProducts(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  // Filter + Sort
  const products = useMemo(() => {
    let filtered = [...allProducts];

    if (filter === 'active') filtered = filtered.filter((p) => p.active !== false);
    if (filter === 'inactive') filtered = filtered.filter((p) => p.active === false);

    switch (sortBy) {
      case 'name_asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price_high':
        filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'price_low':
        filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return filtered;
  }, [allProducts, filter, sortBy]);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const from = (page - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = products.slice(from, from + ITEMS_PER_PAGE);

  const handleSearch = (e) => setSearchQuery(e.target.value);

  const handleFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const handleToggleActive = async (product) => {
    const newActive = product.active === false ? true : false;
    try {
      await productsService.toggleActive(product.id, newActive);
      sileo.success({ title: newActive ? 'Producto activado' : 'Producto desactivado', description: `"${product.name || ''}" fue ${newActive ? 'activado' : 'desactivado'}.` });
      refetch();
    } catch (err) {
      sileo.error({ title: 'Error al cambiar estado', description: err.message || 'Ocurrió un error inesperado.' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await productsService.delete(deleteTarget.id);
      sileo.success({ title: 'Producto eliminado', description: `"${deleteTarget.name || ''}" fue eliminado.` });
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      sileo.error({ title: 'Error al eliminar producto', description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Productos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            Gestiona tu catalogo de productos y servicios
          </p>
        </div>
        <Link to="/products/new" className="w-full sm:w-auto">
          <Button className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <StatsBar products={allProducts} loading={loading} />

      {/* Search + Sort + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              aria-label="Buscar"
              placeholder="Buscar por nombre o codigo..."
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
        {!loading && allProducts.length > 0 && (
          <FilterChips activeFilter={filter} onFilter={handleFilter} products={allProducts} />
        )}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid count={6} type="card" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={filter !== 'all' || searchQuery ? 'Sin resultados' : 'Sin productos'}
          description={
            filter !== 'all' ? 'No hay productos con este filtro' :
            searchQuery ? 'No se encontraron resultados' : 'Agrega tu primer producto o servicio'
          }
          action={
            filter !== 'all' || searchQuery ? (
              <Button variant="outline" className="rounded-input" onClick={() => { setFilter('all'); setSearchQuery(''); }}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : (
              <Link to="/products/new">
                <Button className="rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo producto
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedProducts.map((product, i) => (
              <div key={product.id} className={`min-w-0 animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}>
                <ProductCard
                  product={product}
                  onDelete={setDeleteTarget}
                  onToggleActive={handleToggleActive}
                />
              </div>
            ))}
          </div>
          <Pagination
            current={page}
            total={totalPages}
            from={from + 1}
            to={Math.min(from + ITEMS_PER_PAGE, products.length)}
            count={products.length}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Eliminar producto"
        description={`¿Estás seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ProductsPage;
