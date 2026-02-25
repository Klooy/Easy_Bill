import { useInvoiceStore } from '@/store/invoice.store';
import { formatCurrency } from '@/lib/format';
import { PAYMENT_FORMS, PAYMENT_METHODS } from '@/lib/schemas/invoice.schema';

const StepSummary = () => {
  const store = useInvoiceStore();
  const subtotal = store.getSubtotal();
  const discountTotal = store.getDiscountTotal();
  const taxTotal = store.getTaxTotal();
  const total = store.getTotal();

  return (
    <div className="space-y-4">
      {/* Client */}
      <div className="rounded-card border p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">CLIENTE</p>
        <p className="mt-1 font-medium text-gray-900 dark:text-white">
          {store.selectedClient?.names || store.selectedClient?.company || '—'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{store.selectedClient?.identification}</p>
        {store.clientId === 'temp' && (
          <span className="mt-1 inline-flex items-center rounded-[6px] bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            Venta ocasional
          </span>
        )}
      </div>

      {/* Items */}
      <div className="rounded-card border p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">PRODUCTOS ({store.items.length})</p>
        <div className="mt-2 space-y-2">
          {store.items.filter((i) => i.name).map((item, i) => (
            <div key={i} className="flex justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.quantity} × {formatCurrency(item.unit_price)}
                  {item.discount_rate > 0 ? ` (-${item.discount_rate}%)` : ''}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                {(() => {
                  const gross = item.quantity * item.unit_price;
                  const disc = gross * (item.discount_rate / 100);
                  const base = gross - disc;
                  const rate = item.is_excluded ? 0 : (parseFloat(item.tax_rate) || 0);
                  return formatCurrency(base + base * rate / 100);
                })()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-card border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Base gravable</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Descuentos</span>
            <span className="text-red-500">-{formatCurrency(discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">IVA</span>
          <span>{formatCurrency(taxTotal)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-lg font-bold">
          <span className="font-outfit">Total</span>
          <span className="font-outfit text-primary-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payment info */}
      <div className="rounded-card border p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">PAGO</p>
        <p className="mt-1 text-sm text-gray-700">
          {PAYMENT_FORMS.find((p) => p.code === store.paymentFormCode)?.label || '—'} / {' '}
          {PAYMENT_METHODS.find((p) => p.code === store.paymentMethodCode)?.label || '—'}
        </p>
        {store.observation && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Nota: {store.observation}</p>
        )}
      </div>
    </div>
  );
};

export { StepSummary };
