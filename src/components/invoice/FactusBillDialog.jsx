import { useState } from 'react';
import { Eye, Loader2, RefreshCw } from 'lucide-react';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { factusService } from '@/services/factus.service';
import { formatCurrency } from '@/lib/format';

const FieldRow = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className="font-medium text-gray-900 dark:text-white text-right max-w-[60%] break-all">{value || '—'}</span>
  </div>
);

const FactusBillDialog = ({ invoiceNumber }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const isCreditNote = invoiceNumber?.toUpperCase().startsWith('NC');

  const loadBill = async () => {
    setLoading(true);
    try {
      const result = await factusService.getBillFromFactus(invoiceNumber);
      // FACTUS wraps the response in `data` — inside:
      //   bills:        data.bill   + data.customer + data.items
      //   credit notes: data.credit_note + data.customer + data.items
      const raw = result.data || result;
      setData(raw);
    } catch (err) {
      sileo.error({ title: 'Error al consultar FACTUS', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (isOpen && !data) {
      loadBill();
    }
  };

  // Extract document info from the right key
  const doc = data ? (isCreditNote ? data.credit_note : data.bill) : null;
  const customer = data?.customer;
  const items = data?.items || [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-[44px] rounded-input">
          <Eye className="mr-2 h-4 w-4" />
          Ver en FACTUS
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95%] max-w-2xl max-h-[92vh] overflow-y-auto rounded-card">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg">
            Datos en FACTUS — {invoiceNumber}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Información del documento consultada directamente desde FACTUS
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            <span className="ml-2 text-sm text-gray-500">Consultando FACTUS...</span>
          </div>
        ) : doc ? (
          <div className="space-y-4">
            {/* General info */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Información general</h3>
              <div className="rounded-badge border p-3 space-y-0.5">
                <FieldRow label="Número" value={doc.number} />
                <FieldRow label={isCreditNote ? 'CUDE' : 'CUFE'} value={
                  <span className="font-mono text-[11px]">{doc.cude || doc.cufe}</span>
                } />
                <FieldRow label="Estado DIAN" value={doc.status} />
                <FieldRow label="Fecha emisión" value={doc.created_at || doc.issue_date} />
                {!isCreditNote && (
                  <FieldRow label="Fecha vencimiento" value={doc.payment_due_date} />
                )}
                <FieldRow label="Total" value={formatCurrency(doc.total)} />
                {isCreditNote && doc.number_bill && (
                  <FieldRow label="Factura origen" value={doc.number_bill} />
                )}
                {isCreditNote && doc.correction_concept && (
                  <FieldRow label="Concepto corrección" value={doc.correction_concept.name || doc.correction_concept.code} />
                )}
              </div>
            </div>

            {/* Customer */}
            {customer && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cliente</h3>
                <div className="rounded-badge border p-3 space-y-0.5">
                  <FieldRow label="Nombre" value={customer.names || customer.company} />
                  <FieldRow label="Documento" value={customer.identification} />
                  <FieldRow label="Email" value={customer.email} />
                </div>
              </div>
            )}

            {/* Items */}
            {items.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Ítems ({items.length})
                </h3>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-badge border p-3">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{item.name}</p>
                      <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-gray-500">
                        <span>Cant: {item.quantity}</span>
                        <span>Precio: {formatCurrency(item.price)}</span>
                        <span>Total: {formatCurrency(item.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh button */}
            <Button
              variant="outline"
              className="w-full min-h-[44px] rounded-input"
              onClick={loadBill}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar datos
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-8">No se pudieron cargar los datos</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { FactusBillDialog };
