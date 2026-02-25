import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useInvoiceStore } from '@/store/invoice.store';
import { useNumberingRanges } from '@/hooks/useNumberingRanges';
import { PAYMENT_FORMS, getMethodsForForm } from '@/lib/schemas/invoice.schema';

const StepGeneral = () => {
  const { ranges, loading } = useNumberingRanges('invoice');
  const store = useInvoiceStore();

  const availableMethods = getMethodsForForm(store.paymentFormCode);

  const handleFormChange = (newFormCode) => {
    const updates = { paymentFormCode: newFormCode };

    // Al cambiar de Crédito a Contado, limpiar fecha de vencimiento
    if (newFormCode === '1') {
      updates.paymentDueDate = '';
    }

    // Si el método actual no es válido para la nueva forma, resetear al primero disponible
    const newMethods = getMethodsForForm(newFormCode);
    const currentMethodValid = newMethods.some((m) => m.code === store.paymentMethodCode);
    if (!currentMethodValid) {
      updates.paymentMethodCode = newMethods[0]?.code || '10';
    }

    store.setGeneral(updates);
  };

  if (loading) return <LoadingSpinner text="Cargando rangos..." />;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Rango de numeración *</Label>
        <select
          className="flex h-10 w-full max-w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm truncate focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
          value={store.numberingRangeId}
          onChange={(e) => store.setGeneral({ numberingRangeId: e.target.value })}
        >
          <option value="">Seleccionar rango...</option>
          {ranges.map((r) => (
            <option key={r.id} value={r.id}>
              {r.prefix} · {r.document} · {r.from_number}-{r.to_number}
            </option>
          ))}
        </select>
        {ranges.length === 0 && (
          <p className="text-xs text-amber-600">No hay rangos disponibles. Sincroniza desde FACTUS.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Forma de pago</Label>
          <select
            className="flex h-10 w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
            value={store.paymentFormCode}
            onChange={(e) => handleFormChange(e.target.value)}
          >
            {PAYMENT_FORMS.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Método de pago</Label>
          <select
            className="flex h-10 w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
            value={store.paymentMethodCode}
            onChange={(e) => store.setGeneral({ paymentMethodCode: e.target.value })}
          >
            {availableMethods.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {store.paymentFormCode === '2' && (
        <div className="space-y-2">
          <Label>Fecha de vencimiento</Label>
          <Input
            type="date"
            className="rounded-input"
            value={store.paymentDueDate}
            onChange={(e) => store.setGeneral({ paymentDueDate: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Observaciones</Label>
        <textarea
          className="flex min-h-[80px] w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
          placeholder="Notas adicionales para la factura"
          value={store.observation}
          onChange={(e) => store.setGeneral({ observation: e.target.value })}
        />
      </div>
    </div>
  );
};

export { StepGeneral };
