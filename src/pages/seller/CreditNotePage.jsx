import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sileo } from 'sileo';
import { ArrowLeft, FileText, Loader2, Check, Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmissionOverlay } from '@/components/common/EmissionOverlay';
import { invoicesService } from '@/services/invoices.service';
import { factusService } from '@/services/factus.service';
import { useNumberingRanges } from '@/hooks/useNumberingRanges';
import { creditNoteSchema, CORRECTION_CONCEPTS } from '@/lib/schemas/credit-note.schema';
import { formatCurrency } from '@/lib/format';
import { selectClass } from '@/lib/constants';
import { DEFAULT_ITEM } from '@/lib/constants';

const CreditNotePage = () => {
  const { id: invoiceId } = useParams();
  const navigate = useNavigate();
  const { ranges, loading: loadingRanges } = useNumberingRanges('credit_note');

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit: rhfSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: {
      invoice_id: invoiceId,
      numbering_range_id: '',
      correction_concept_code: '',
      observation: '',
      items: [{ ...DEFAULT_ITEM }],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  // Load original invoice
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const data = await invoicesService.getById(invoiceId);
        setInvoice(data);

        const invoiceItems = (data.invoice_items || []).map((item) => ({
          code_reference: item.code_reference || '',
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_rate: item.discount_rate || 0,
          tax_rate: item.tax_rate || '19.00',
          unit_measure_id: item.unit_measure_id || 70,
          standard_code_id: item.standard_code_id || 1,
          is_excluded: item.is_excluded || 0,
          tribute_id: item.tribute_id || 1,
        }));
        reset({
          invoice_id: invoiceId,
          numbering_range_id: '',
          correction_concept_code: '',
          observation: '',
          items: invoiceItems.length > 0 ? invoiceItems : [{ ...DEFAULT_ITEM }],
        });
      } catch (err) {
        sileo.error({ title: 'Error al cargar factura', description: err.message });
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId, reset]);

  // unit_price es PRECIO BASE (sin IVA). Cada producto resuelve su propio IVA.
  const subtotal = useMemo(() => (watchedItems || []).reduce((sum, item) => {
    const gross = (item.quantity || 0) * (item.unit_price || 0);
    const discount = gross * ((item.discount_rate || 0) / 100);
    return sum + (gross - discount);
  }, 0), [watchedItems]);

  const taxTotal = useMemo(() => (watchedItems || []).reduce((sum, item) => {
    if (item.is_excluded) return sum;
    const rate = parseFloat(item.tax_rate) || 0;
    if (rate === 0) return sum;
    const gross = (item.quantity || 0) * (item.unit_price || 0);
    const discount = gross * ((item.discount_rate || 0) / 100);
    const taxable = gross - discount;
    return sum + (taxable * rate / 100);
  }, 0), [watchedItems]);

  const discountTotal = useMemo(() => (watchedItems || []).reduce((sum, item) => {
    const gross = (item.quantity || 0) * (item.unit_price || 0);
    return sum + (gross * ((item.discount_rate || 0) / 100));
  }, 0), [watchedItems]);

  const total = subtotal + taxTotal;

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        invoice_id: invoiceId,
        numbering_range_id: data.numbering_range_id,
        correction_concept_code: data.correction_concept_code,
        observation: data.observation,
        items: data.items.filter((i) => i.name),
      };

      const result = await factusService.createCreditNote(payload);
      const creditNoteId = result.data?.credit_note_id;
      sileo.success({
        title: 'Nota crédito emitida',
        description: `N.° ${result.data?.number || '—'} validada exitosamente por la DIAN.`,
        button: creditNoteId ? { title: 'Ver nota crédito', onClick: () => navigate(`/invoices/${creditNoteId}`) } : undefined,
        duration: 12000,
      });
      navigate(creditNoteId ? `/invoices/${creditNoteId}` : '/invoices');
    } catch (error) {
      sileo.error({ title: 'Error al emitir nota crédito', description: error.message || 'Ocurrió un error inesperado.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingRanges) return <LoadingSpinner text="Cargando..." />;

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Link to="/invoices">
          <Button variant="outline" size="sm" className="rounded-input">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
        <div className="rounded-card bg-white dark:bg-gray-800 p-8 text-center shadow-card">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-red-500">Factura no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmissionOverlay visible={submitting} onCancel={() => setSubmitting(false)} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/invoices/${invoiceId}`}>
          <Button variant="outline" size="icon" className="rounded-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Nota Crédito</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            Referencia: Factura {invoice.number || invoice.reference_code}
          </p>
        </div>
      </div>

      {/* Original invoice summary */}
      <div className="rounded-card border-l-4 border-l-primary-500 bg-white dark:bg-gray-800 p-4 shadow-card">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">FACTURA ORIGINAL</p>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">{invoice.number}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.clients?.names || invoice.clients?.company}</p>
          </div>
          <p className="font-outfit text-lg font-bold text-primary-600">{formatCurrency(invoice.total)}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
        {/* Numbering range */}
        <div className="space-y-2">
          <Label>Rango de numeración para notas crédito *</Label>
          <select className={selectClass} {...register('numbering_range_id')}>
            <option value="">Seleccionar rango...</option>
            {ranges.map((r) => (
              <option key={r.id} value={r.id}>
                {r.prefix} · {r.document} · {r.from_number}-{r.to_number}
              </option>
            ))}
          </select>
          {errors.numbering_range_id && <p className="text-xs text-red-500">{errors.numbering_range_id.message}</p>}
        </div>

        {/* Correction concept */}
        <div className="space-y-2">
          <Label>Concepto de corrección DIAN *</Label>
          <select className={selectClass} {...register('correction_concept_code')}>
            <option value="">Seleccionar concepto...</option>
            {CORRECTION_CONCEPTS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}. {c.label}
              </option>
            ))}
          </select>
          {errors.correction_concept_code && <p className="text-xs text-red-500">{errors.correction_concept_code.message}</p>}
        </div>

        {/* Observation */}
        <div className="space-y-2">
          <Label>Observaciones</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
            placeholder="Motivo de la nota crédito"
            {...register('observation')}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-4 rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-outfit text-base font-semibold text-gray-900 dark:text-white">
            Ítems a acreditar
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-input"
            onClick={() => append({ ...DEFAULT_ITEM })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">
          Los Ítems de la factura original se han cargado automáticamente. Puedes modificar cantidades o eliminar los que no apliquen.
        </p>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const w = watchedItems?.[index] || {};
            return (
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
                    <Label className="text-xs">Código</Label>
                    <Input className="rounded-input text-sm font-mono" {...register(`items.${index}.code_reference`)} />
                  </div>
                  <div className="space-y-1 sm:col-span-1 lg:col-span-3">
                    <Label className="text-xs">Nombre</Label>
                    <Input className="rounded-input text-sm" {...register(`items.${index}.name`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input className="rounded-input text-sm" type="number" min="1" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Precio base</Label>
                    <Input className="rounded-input text-sm" type="number" step="0.01" min="0" {...register(`items.${index}.unit_price`, { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Desc. %</Label>
                    <Input className="rounded-input text-sm" type="number" min="0" max="100" {...register(`items.${index}.discount_rate`, { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IVA</Label>
                    <select className={selectClass}
                      value={w.is_excluded ? 'excluded' : (w.tax_rate || '19.00')}
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
                      <option value="0.00">0%</option>
                      <option value="5.00">5%</option>
                      <option value="8.00">8%</option>
                      <option value="19.00">19%</option>
                      <option value="excluded">Excluido de IVA</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2 text-right text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal: </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency((w.quantity || 0) * (w.unit_price || 0) * (1 - (w.discount_rate || 0) / 100))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Base gravable</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">IVA</span>
            <span>{formatCurrency(taxTotal)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span className="font-outfit text-gray-900 dark:text-white">Total nota crédito</span>
            <span className="font-outfit text-red-600">-{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link to={`/invoices/${invoiceId}`}>
          <Button variant="outline" className="min-h-[44px] rounded-input">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
          </Button>
        </Link>
        <Button
          disabled={!isValid || submitting}
          className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
          onClick={rhfSubmit(onSubmit)}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Emitiendo...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" /> Emitir nota crédito
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreditNotePage;
