import { useState } from 'react';
import { sileo } from 'sileo';
import {
  Plus, Trash2, Search, Package, ShoppingCart,
  Pencil, Tag, Info, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useInvoiceStore } from '@/store/invoice.store';
import { useProducts } from '@/hooks/useProducts';

/* ── IVA badge sub-component ── */
const IvaBadge = ({ isExcluded, taxRate }) => {
  if (isExcluded) {
    return (
      <span className="inline-flex items-center rounded-badge px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        EXCL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-badge px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      IVA {taxRate}%
    </span>
  );
};

const StepItems = () => {
  const store = useInvoiceStore();
  const { products, loading: loadingProducts } = useProducts();
  const [catalogSearch, setCatalogSearch] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(true);

  const activeProducts = products.filter((p) => p.active);
  const filteredProducts = catalogSearch.trim()
    ? activeProducts.filter((p) =>
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.code_reference?.toLowerCase().includes(catalogSearch.toLowerCase())
      )
    : activeProducts;

  const validItems = store.items.filter((i) => i.name);
  const subtotal = store.getSubtotal();
  const taxTotal = store.getTaxTotal();
  const total = store.getTotal();

  const handleAddFromCatalog = (product) => {
    store.addProductToItems(product);
    sileo.success({ title: `"${product.name}" agregado`, description: 'Puedes ajustar cantidad y precio en la tabla.' });
    // Auto-collapse on mobile after adding
    if (window.innerWidth < 768) setShowAddPanel(false);
  };

  const handleAddManual = () => {
    store.addItem();
    // Auto-expand the new item for editing
    setExpandedItem(store.items.length);
    // Auto-collapse add panel on mobile
    if (window.innerWidth < 768) setShowAddPanel(false);
  };

  return (
    <div className="space-y-5">
      {/* ── Add products panel ── */}
      <div className="rounded-card border-2 border-dashed border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-950/20 overflow-hidden">
        {/* Collapsible header — toggleable on mobile only */}
        <button
          type="button"
          onClick={() => setShowAddPanel((v) => !v)}
          className="flex w-full items-center justify-between p-4 md:pointer-events-none"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
              <Plus className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white font-outfit">Agregar productos</h3>
            {!showAddPanel && validItems.length > 0 && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">
                ({validItems.length} agregado{validItems.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform md:hidden',
            showAddPanel && 'rotate-180'
          )} />
        </button>

        {/* Panel content — always visible on md+, collapsible on mobile */}
        <div className={cn(
          'px-4 pb-4 md:block',
          showAddPanel ? 'block' : 'hidden'
        )}>

        {/* Search in catalog */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="rounded-input pl-9 text-sm"
            aria-label="Buscar"
            placeholder="Buscar en tu catálogo por nombre o código..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
          />
        </div>

        {/* Catalog results */}
        {loadingProducts ? (
          <div className="mt-3 flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
            <span className="ml-2 text-sm text-gray-500">Cargando catálogo...</span>
          </div>
        ) : (
          <>
            <div className="mt-3 max-h-[220px] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
              {filteredProducts.length === 0 ? (
                <div className="py-4 text-center">
                  {catalogSearch ? (
                    <p className="text-sm text-gray-400">
                      No se encontraron productos para &quot;{catalogSearch}&quot;
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <Package className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-400">Tu catálogo está vacío</p>
                      <p className="text-xs text-gray-400">Puedes agregar ítems manualmente abajo</p>
                    </div>
                  )}
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const alreadyAdded = store.items.some((item) => item.product_id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddFromCatalog(p)}
                      className={cn(
                        'flex w-full items-center gap-2 sm:gap-3 rounded-input p-2 sm:p-2.5 text-left transition-all group',
                        alreadyAdded
                          ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800'
                          : 'hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                      )}
                    >
                      <div className="hidden sm:flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-input bg-gray-100 dark:bg-gray-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                        <Package className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{p.name}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{p.code_reference}</p>
                          <IvaBadge isExcluded={p.is_excluded} taxRate={p.tax_rate} />
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 font-mono">
                          {formatCurrency(p.price)}
                        </p>
                        {alreadyAdded && (
                          <p className="text-[10px] text-primary-500">+ agregar otro</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {activeProducts.length > 0 && (
              <p className="mt-2 text-center text-[11px] text-gray-400">
                {activeProducts.length} producto{activeProducts.length !== 1 ? 's' : ''} en catálogo
                {catalogSearch && filteredProducts.length !== activeProducts.length && (
                  <> · {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}</>)}
              </p>
            )}
          </>
        )}

        {/* Divider + manual add */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">o</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>
        <button
          type="button"
          onClick={handleAddManual}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-input border border-dashed border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition-all hover:border-primary-400 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-gray-800"
        >
          <Pencil className="h-3.5 w-3.5" />
          Agregar ítem manual
          <span className="text-[10px] text-gray-400 dark:text-gray-500">(sin catálogo)</span>
        </button>
        </div>
      </div>

      {/* ── Items list ── */}
      {store.items.length === 0 && (
        <div className="rounded-card border bg-white dark:bg-gray-800 p-6 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-gray-200 dark:text-gray-600" />
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">Sin productos aún</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Busca en tu catálogo arriba o agrega un ítem manualmente
          </p>
        </div>
      )}

      <div className="space-y-3">
        {store.items.map((item, index) => {
          // Only show empty rows (manual) if they are truly new empty placeholders
          const isEmpty = !item.name && !item.code_reference;
          const isFromCatalog = !!item.product_id;
          const isExpanded = expandedItem === index || isEmpty;
          const lineGross = item.quantity * item.unit_price; // base gross
          const lineDiscount = lineGross * (item.discount_rate / 100);
          const lineBase = lineGross - lineDiscount; // base after discount
          const rate = parseFloat(item.tax_rate) || 0;
          // Cada producto calcula su propio IVA
          const lineIva = (item.is_excluded || rate === 0) ? 0 : lineBase * (rate / 100);
          const lineTotal = lineBase + lineIva; // base + IVA individual

          return (
            <div
              key={index}
              className={cn(
                'rounded-card border bg-white dark:bg-gray-800 transition-all',
                isEmpty && 'ring-2 ring-primary-200 dark:ring-primary-800 border-primary-200 dark:border-primary-800'
              )}
            >
              {/* Item header — always visible */}
              <div
                className="flex cursor-pointer items-center gap-2 sm:gap-3 p-3 sm:p-4"
                onClick={() => !isEmpty && setExpandedItem(isExpanded ? null : index)}
              >
                {/* Index badge */}
                <div className={cn(
                  'flex h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] sm:text-xs font-bold',
                  isFromCatalog
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}>
                  {index + 1}
                </div>

                {/* Item summary */}
                <div className="min-w-0 flex-1">
                  {isEmpty ? (
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Nuevo ítem manual</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{item.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <IvaBadge isExcluded={item.is_excluded} taxRate={item.tax_rate} />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </span>
                        {item.discount_rate > 0 && (
                          <span className="text-xs text-amber-500">(-{item.discount_rate}%)</span>
                        )}
                        {isFromCatalog && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 text-xs text-primary-400">
                            <Tag className="h-2.5 w-2.5" /> Catálogo
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Line total + actions */}
                <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                  {!isEmpty && (
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white font-mono">
                      {formatCurrency(lineTotal)}
                    </span>
                  )}
                  {!isEmpty && (
                    isExpanded
                      ? <ChevronUp className="h-4 w-4 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                  {store.items.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => { e.stopPropagation(); store.removeItem(index); }}
                    >
                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Item detail — expandable */}
              {isExpanded && (
                <div className="border-t px-3 pb-4 pt-3 sm:px-4">
                  {isEmpty && (
                    <div className="mb-3 flex items-start gap-2 rounded-input bg-blue-50 dark:bg-blue-900/20 p-2.5">
                      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Completa los datos del producto. Un ítem manual te permite facturar algo que no está en tu catálogo.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Código</Label>
                      <Input
                        className="rounded-input text-sm font-mono"
                        placeholder="REF-001"
                        value={item.code_reference}
                        onChange={(e) => store.updateItem(index, 'code_reference', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-1 lg:col-span-3">
                      <Label className="text-xs">Nombre *</Label>
                      <Input
                        className="rounded-input text-sm"
                        placeholder="Nombre del producto o servicio"
                        value={item.name}
                        autoFocus={isEmpty}
                        onChange={(e) => store.updateItem(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        className="rounded-input text-sm"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => store.updateItem(index, 'quantity', e.target.value === '' ? '' : (parseInt(e.target.value) || ''))}
                        onBlur={(e) => store.updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Precio base (sin IVA)</Label>
                      <Input
                        className="rounded-input text-sm"
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => store.updateItem(index, 'unit_price', e.target.value === '' ? '' : (parseFloat(e.target.value) ?? ''))}
                        onBlur={(e) => store.updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descuento %</Label>
                      <Input
                        className="rounded-input text-sm"
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount_rate}
                        onChange={(e) => store.updateItem(index, 'discount_rate', e.target.value === '' ? '' : (parseFloat(e.target.value) ?? ''))}
                        onBlur={(e) => store.updateItem(index, 'discount_rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">IVA</Label>
                      <select
                        className="flex h-10 w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                        value={item.is_excluded ? 'excluded' : item.tax_rate}
                        onChange={(e) => {
                          if (e.target.value === 'excluded') {
                            store.updateItem(index, 'is_excluded', 1);
                            store.updateItem(index, 'tax_rate', '0.00');
                          } else {
                            store.updateItem(index, 'is_excluded', 0);
                            store.updateItem(index, 'tax_rate', e.target.value);
                          }
                        }}
                      >
                        <option value="0.00">0%</option>
                        <option value="5.00">5%</option>
                        <option value="8.00">8%</option>
                        <option value="19.00">19%</option>
                        <option value="excluded">Excluido de IVA</option>
                      </select>
                    </div>
                  </div>

                  {/* Line totals breakdown */}
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs">
                    <span className="text-gray-400 dark:text-gray-500">
                      Base: <span className="font-mono text-gray-600 dark:text-gray-300">{formatCurrency(lineBase)}</span>
                    </span>
                    {!item.is_excluded && parseFloat(item.tax_rate) > 0 && (
                      <span className="text-gray-400 dark:text-gray-500">
                        IVA ({item.tax_rate}%): <span className="font-mono text-gray-600 dark:text-gray-300">{formatCurrency(lineIva)}</span>
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                      Total: {formatCurrency(lineTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Running totals bar ── */}
      {validItems.length > 0 && (
        <div className="rounded-card border bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Resumen ({validItems.length} ítem{validItems.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-center sm:text-left">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Base</p>
              <p className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(subtotal)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">IVA</p>
              <p className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(taxTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-primary-500">Total</p>
              <p className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { StepItems };
