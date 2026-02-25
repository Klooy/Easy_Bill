import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Calendar, Power, PowerOff, Edit, Trash2,
} from 'lucide-react';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { recurringService } from '@/services/recurring.service';
import { formatCurrency, formatDateLong as formatDate } from '@/lib/format';
import { FREQ_LABELS } from '@/lib/constants';

const RecurringDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recurring, setRecurring] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await recurringService.getById(id);
        setRecurring(data);
      } catch (err) {
        sileo.error({ title: 'Error al cargar', description: err.message });
        navigate('/recurring');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const updated = await recurringService.toggleActive(id, !recurring.active);
      setRecurring((prev) => ({ ...prev, active: updated.active }));
      sileo.success({ title: updated.active ? 'Factura recurrente activada' : 'Factura recurrente pausada', description: updated.active ? 'Se emitirá automáticamente según la frecuencia configurada.' : 'La emisión automática fue pausada.' });
    } catch (err) {
      sileo.error({ title: 'Error al cambiar estado', description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    try {
      await recurringService.delete(id);
      sileo.success({ title: 'Factura recurrente eliminada', description: 'La programación fue eliminada permanentemente.' });
      navigate('/recurring');
    } catch (err) {
      sileo.error({ title: 'Error al eliminar', description: err.message });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!recurring) return null;

  const client = recurring.clients;
  const items = recurring.items || [];
  const total = items.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    const discount = lineTotal * ((item.discount_rate || 0) / 100);
    const taxable = lineTotal - discount;
    const tax = item.is_excluded ? 0 : taxable * (parseFloat(item.tax_rate || '0') / 100);
    return sum + taxable + tax;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/recurring">
            <Button variant="outline" size="icon" className="rounded-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className={`h-5 w-5 ${recurring.active ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
              <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">{recurring.name}</h1>
              <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${recurring.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 dark:text-gray-400'}`}>
                {recurring.active ? 'Activa' : 'Pausada'}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Creada el {formatDate(recurring.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/recurring/${id}/edit`}>
            <Button variant="outline" className="min-h-[44px] rounded-input">
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          </Link>
          <Button
            variant="outline"
            className="min-h-[44px] rounded-input"
            onClick={handleToggle}
            disabled={toggling}
          >
            {recurring.active ? (
              <><PowerOff className="mr-2 h-4 w-4" /> Pausar</>
            ) : (
              <><Power className="mr-2 h-4 w-4" /> Activar</>
            )}
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px] rounded-input text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        </div>
      </div>

      {/* Schedule info */}
      <div className="rounded-card bg-primary-50 dark:bg-primary-900/20 p-4 shadow-card">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-primary-700 font-semibold">Frecuencia</p>
            <p className="mt-1 font-outfit font-bold text-primary-800">{FREQ_LABELS[recurring.frequency]}</p>
          </div>
          <div>
            <p className="text-xs text-primary-700 font-semibold">Próxima emisión</p>
            <p className="mt-1 flex items-center gap-1 font-medium text-primary-800">
              <Calendar className="h-3.5 w-3.5" /> {formatDate(recurring.next_run_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-primary-700 font-semibold">Última emisión</p>
            <p className="mt-1 font-medium text-primary-800">{formatDate(recurring.last_run_date)}</p>
          </div>
          <div>
            <p className="text-xs text-primary-700 font-semibold">Total generadas</p>
            <p className="mt-1 font-outfit font-bold text-primary-800">{recurring.total_generated}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <h2 className="mb-3 font-outfit text-base font-semibold text-gray-900 dark:text-white">Cliente</h2>
          {client ? (
            <div className="space-y-1">
              <p className="font-semibold text-gray-900 dark:text-white">{client.names || client.company}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{client.identification}</p>
              {client.email && <p className="text-sm text-gray-600 dark:text-gray-300">{client.email}</p>}
              {client.phone && <p className="text-sm text-gray-600 dark:text-gray-300">{client.phone}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos de cliente</p>
          )}
        </div>

        {/* Payment info */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <h2 className="mb-3 font-outfit text-base font-semibold text-gray-900 dark:text-white">Pago</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Forma de pago</span>
              <span className="text-gray-900 dark:text-white">{recurring.payment_form_code === '1' ? 'Contado' : 'Crédito'}</span>
            </div>
            {recurring.observation && (
              <div className="mt-2 border-t pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Observaciones</p>
                <p className="mt-1 text-sm text-gray-700">{recurring.observation}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5">
        <h2 className="mb-4 font-outfit text-base font-semibold text-gray-900 dark:text-white">Ítems ({items.length})</h2>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="pb-2">Producto</th>
                <th className="pb-2 text-right">Cant.</th>
                <th className="pb-2 text-right">Precio unit.</th>
                <th className="pb-2 text-right">Desc. %</th>
                <th className="pb-2 text-right">IVA</th>
                <th className="pb-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                const discount = lineTotal * ((item.discount_rate || 0) / 100);
                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      {item.code_reference && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.code_reference}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right">{item.quantity}</td>
                    <td className="whitespace-nowrap py-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="whitespace-nowrap py-2 text-right">{item.discount_rate ? `${item.discount_rate}%` : '—'}</td>
                    <td className="whitespace-nowrap py-2 text-right">{item.is_excluded ? 'Excl.' : `${item.tax_rate}%`}</td>
                    <td className="whitespace-nowrap py-2 text-right font-medium">{formatCurrency(lineTotal - discount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
          <span className="font-outfit text-gray-900 dark:text-white">Total estimado</span>
          <span className="font-outfit text-primary-600">{formatCurrency(total)}</span>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar recurrente"
        description="¿Eliminar esta factura recurrente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default RecurringDetailPage;
