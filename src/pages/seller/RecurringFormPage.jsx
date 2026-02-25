import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft, Plus, Trash2, Search, Package, Save, RefreshCw, Loader2,
} from 'lucide-react';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useClients } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { useNumberingRanges } from '@/hooks/useNumberingRanges';
import { useDebounce } from '@/hooks/useDebounce';
import { recurringService } from '@/services/recurring.service';
import { PAYMENT_FORMS, PAYMENT_METHODS, getMethodsForForm } from '@/lib/schemas/invoice.schema';
import { recurringSchema, FREQUENCIES } from '@/lib/schemas/recurring.schema';
import { formatCurrency } from '@/lib/format';
import { selectClass, DEFAULT_ITEM, TAX_RATES } from '@/lib/constants';

const RecurringFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { ranges, loading: loadingRanges } = useNumberingRanges('invoice');
  const { clients, loading: loadingClients, searchClients } = useClients();
  const { products, loading: loadingProducts } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const {
    register,
    control,
    handleSubmit: rhfSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      name: '',
      client_id: '',
      numbering_range_id: '',
      payment_form_code: '1',
      payment_method_code: '10',
      observation: '',
      frequency: 'monthly',
      next_run_date: '',
      end_date: '',
      items: [{ ...DEFAULT_ITEM }],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const watchedNextRun = watch('next_run_date');
  const watchedForm = watch('payment_form_code');

  // Cuando cambia la forma de pago, validar que el método actual sea compatible
  useEffect(() => {
    const validMethods = getMethodsForForm(watchedForm);
    const currentMethod = watch('payment_method_code');
    if (!validMethods.some((m) => m.code === currentMethod)) {
      setValue('payment_method_code', validMethods[0]?.code || '10');
    }
  }, [watchedForm]);

  useEffect(() => {
    searchClients(debouncedSearch);
  }, [debouncedSearch]);

  // Load existing data if editing
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const data = await recurringService.getById(id);
        reset({
          name: data.name || '',
          client_id: data.client_id || '',
          numbering_range_id: data.numbering_range_id || '',
          payment_form_code: data.payment_form_code || '1',
          payment_method_code: data.payment_method_code || '10',
          observation: data.observation || '',
          frequency: data.frequency || 'monthly',
          next_run_date: data.next_run_date || '',
          end_date: data.end_date || '',
          items: data.items?.length > 0 ? data.items : [{ ...DEFAULT_ITEM }],
        });
        setSelectedClient(data.clients || null);
      } catch (err) {
        sileo.error({ title: 'Error al cargar', description: err.message });
        navigate('/recurring');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [id, isEdit, reset]);

  const addProductToItems = (product) => {
    const emptyIndices = [];
    (watchedItems || []).forEach((item, i) => { if (!item.name) emptyIndices.push(i); });
    if (emptyIndices.length > 0) remove(emptyIndices);
    append({
      product_id: product.id,
      code_reference: product.code_reference,
      name: product.name,
      quantity: 1,
      unit_price: product.price,
      discount_rate: 0,
      tax_rate: product.tax_rate,
      unit_measure_id: product.unit_measure_id,
      standard_code_id: product.standard_code_id,
      is_excluded: product.is_excluded,
      tribute_id: product.tribute_id,
    });
    setShowCatalog(false);
  };

  const handleSelectClient = (client) => {
    setValue('client_id', client.id, { shouldValidate: true });
    setSelectedClient(client);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        end_date: data.end_date || null,
        items: data.items.filter((i) => i.name),
      };
      if (isEdit) {
        await recurringService.update(id, payload);
        sileo.success({ title: 'Factura recurrente actualizada', description: 'Los cambios fueron guardados exitosamente.' });
      } else {
        await recurringService.create(payload);
        sileo.success({ title: 'Factura recurrente creada', description: 'Se emitirá automáticamente según la frecuencia configurada.' });
      }
      navigate('/recurring');
    } catch (err) {
      sileo.error({ title: 'Error al guardar factura recurrente', description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/recurring">
          <Button variant="outline" size="icon" className="rounded-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Editar Recurrente' : 'Nueva Factura Recurrente'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configura la emisión automática periódica</p>
        </div>
      </div>

      {/* Name & Frequency */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card space-y-4">
        <h2 className="font-outfit text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary-500" /> Configuración
        </h2>

        <div className="space-y-2">
          <Label>Nombre de la recurrencia *</Label>
          <Input
            placeholder="Ej: Hosting mensual - Acme Corp"
            className="rounded-input"
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Frecuencia *</Label>
            <select className={selectClass} {...register('frequency')}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Próxima emisión *</Label>
            <Input
              type="date"
              className="rounded-input"
              {...register('next_run_date')}
            />
            {errors.next_run_date && <p className="text-xs text-red-500">{errors.next_run_date.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fecha de finalización <span className="text-xs text-gray-400">(opcional)</span></Label>
          <Input
            type="date"
            className="rounded-input"
            {...register('end_date')}
            min={watchedNextRun || undefined}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Si se establece, la recurrente se desactivará automáticamente después de esta fecha.
          </p>
        </div>
      </div>

      {/* Numbering Range & Payment */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card space-y-4">
        <h2 className="font-outfit text-base font-semibold text-gray-900 dark:text-white">Datos de Factura</h2>

        <div className="space-y-2">
          <Label>Rango de numeración *</Label>
          {loadingRanges ? (
            <LoadingSpinner text="Cargando rangos..." />
          ) : (
            <select className={selectClass} {...register('numbering_range_id')}>
              <option value="">Seleccionar rango...</option>
              {ranges.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.prefix} · {r.document} · {r.from_number}-{r.to_number}
                </option>
              ))}
            </select>
          )}
          {errors.numbering_range_id && <p className="text-xs text-red-500">{errors.numbering_range_id.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Forma de pago</Label>
            <select className={selectClass} {...register('payment_form_code')}>
              {PAYMENT_FORMS.map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <select className={selectClass} {...register('payment_method_code')}>
              {getMethodsForForm(watchedForm).map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Observaciones</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
            placeholder="Notas adicionales para cada factura generada"
            {...register('observation')}
          />
        </div>
      </div>

      {/* Client */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card space-y-4">
        <h2 className="font-outfit text-base font-semibold text-gray-900 dark:text-white">Cliente *</h2>

        {selectedClient && (
          <div className="rounded-badge border border-primary-200 bg-primary-50 dark:bg-primary-900/20 p-3">
            <p className="font-medium text-gray-900 dark:text-white">{selectedClient.names || selectedClient.company}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{selectedClient.identification}</p>
            <button
              type="button"
              className="mt-1 text-xs text-primary-600 hover:underline"
              onClick={() => { setValue('client_id', '', { shouldValidate: true }); setSelectedClient(null); }}
            >
              Cambiar cliente
            </button>
          </div>
        )}

        {!selectedClient && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                aria-label="Buscar"
                placeholder="Buscar cliente por nombre o documento..."
                className="rounded-input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {loadingClients ? (
              <LoadingSpinner />
            ) : (
              <div className="max-h-[250px] space-y-2 overflow-y-auto">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c)}
                    className="w-full rounded-card border border-gray-200 dark:border-gray-700 p-3 text-left transition-colors hover:bg-gray-50 dark:bg-gray-900"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{c.names || c.company || '—'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.identification}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Items */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-outfit text-base font-semibold text-gray-900 dark:text-white">Productos *</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 rounded-input sm:flex-none"
              onClick={() => setShowCatalog(!showCatalog)}
            >
              <Package className="mr-1 h-3.5 w-3.5" />
              {showCatalog ? 'Ocultar' : 'Catálogo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 rounded-input sm:flex-none"
              onClick={() => append({ ...DEFAULT_ITEM })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Manual
            </Button>
          </div>
        </div>

        {showCatalog && (
          <div className="rounded-card border border-primary-200 bg-primary-50/50 p-4">
            <p className="mb-2 text-xs font-semibold text-primary-700">Seleccionar del catálogo</p>
            {loadingProducts ? (
              <LoadingSpinner className="py-4" />
            ) : (
              <div className="max-h-[200px] space-y-1 overflow-y-auto">
                {products.filter((p) => p.active).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProductToItems(p)}
                    className="flex w-full items-center justify-between rounded-badge p-2 text-left transition-colors hover:bg-primary-100 dark:bg-primary-900/30"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{p.code_reference}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary-600">{formatCurrency(p.price)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-card border bg-gray-50 dark:bg-gray-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Ítem {index + 1}</span>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre *</Label>
                  <Input
                    className="rounded-input"
                    placeholder="Nombre del producto"
                    {...register(`items.${index}.name`)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Código</Label>
                  <Input
                    className="rounded-input"
                    placeholder="REF-001"
                    {...register(`items.${index}.code_reference`)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cantidad *</Label>
                  <Input
                    type="number"
                    className="rounded-input"
                    min="1"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Precio base *</Label>
                  <Input
                    type="number"
                    className="rounded-input"
                    min="0"
                    {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descuento %</Label>
                  <Input
                    type="number"
                    className="rounded-input"
                    min="0"
                    max="100"
                    step="0.01"
                    {...register(`items.${index}.discount_rate`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">IVA</Label>
                  <select
                    className={selectClass}
                    value={watchedItems?.[index]?.is_excluded ? 'excluded' : (watchedItems?.[index]?.tax_rate || '19.00')}
                    onChange={(e) => {
                      if (e.target.value === 'excluded') {
                        setValue(`items.${index}.is_excluded`, 1);
                        setValue(`items.${index}.tax_rate`, '0.00');
                      } else {
                        setValue(`items.${index}.is_excluded`, 0);
                        setValue(`items.${index}.tax_rate`, e.target.value);
                      }
                    }}
                  >
                    {TAX_RATES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                    <option value="excluded">Excluido de IVA</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] rounded-input"
          onClick={() => navigate('/recurring')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!isValid || saving}
          className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
          onClick={rhfSubmit(onSubmit)}
        >
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> {isEdit ? 'Actualizar' : 'Crear recurrente'}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default RecurringFormPage;
