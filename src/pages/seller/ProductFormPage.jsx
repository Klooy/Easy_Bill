import { useEffect, useMemo } from 'react';
import { ArrowLeft, Loader2, Save, Package, DollarSign, Info, ShieldCheck } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useProduct } from '@/hooks/useProducts';
import { productsService } from '@/services/products.service';
import { productSchema } from '@/lib/schemas/product.schema';
import { formatCurrency } from '@/lib/format';
import { selectClass, TAX_RATES } from '@/lib/constants';
import { SectionHeader, FieldHint } from '@/components/common/SectionHeader';

const ProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { product, loading: loadingProduct } = useProduct(id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code_reference: '',
      name: '',
      price: '',
      tax_rate: '19.00',
      unit_measure_id: 70,
      standard_code_id: 1,
      is_excluded: 0,
      tribute_id: 1,
      description: '',
    },
  });

  const isExcluded = watch('is_excluded');
  const price = watch('price');
  const taxRate = watch('tax_rate');

  // El precio ingresado es el PRECIO BASE (sin IVA). Cada producto resuelve su propio IVA.
  const pricePreview = useMemo(() => {
    const p = Number(price) || 0;
    const rate = isExcluded === 1 ? 0 : Number(taxRate) || 0;
    const tax = p * (rate / 100);
    return { subtotal: p, tax, total: p + tax };
  }, [price, taxRate, isExcluded]);

  useEffect(() => {
    if (product) {
      reset({
        code_reference: product.code_reference || '',
        name: product.name || '',
        price: product.price || '',
        tax_rate: product.tax_rate || '19.00',
        unit_measure_id: product.unit_measure_id || 70,
        standard_code_id: product.standard_code_id || 1,
        is_excluded: product.is_excluded || 0,
        tribute_id: product.tribute_id || 1,
        description: product.description || '',
      });
    }
  }, [product, reset]);

  const handleExcludedChange = (e) => {
    const val = Number(e.target.checked);
    setValue('is_excluded', val);
    if (val) {
      setValue('tax_rate', '0.00');
    }
  };

  const onSubmit = async (values) => {
    try {
      if (isEditing) {
        await productsService.update(id, values);
        sileo.success({ title: 'Producto actualizado', description: `"${values.name || ''}" se actualizó correctamente.` });
      } else {
        await productsService.create(values);
        sileo.success({ title: 'Producto creado', description: `"${values.name || ''}" fue registrado exitosamente.` });
      }
      navigate('/products');
    } catch (error) {
      sileo.error({ title: 'Error al guardar producto', description: error.message || 'Ocurrió un error inesperado.' });
    }
  };

  if (isEditing && loadingProduct) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/products">
          <Button variant="outline" size="icon" className="shrink-0 rounded-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-outfit text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            {isEditing ? 'Modifica los datos del producto' : 'Registra un nuevo producto o servicio'}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">Los campos marcados con <span className="text-red-400">*</span> son obligatorios</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Información básica */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5">
          <SectionHeader icon={Package} title="Información básica" description="Datos generales del producto o servicio" color="primary" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Código de referencia <span className="text-red-400">*</span></Label>
              <Input className="rounded-input font-mono" placeholder="Ej: PROD-001" {...register('code_reference')} />
              {errors.code_reference && <p className="text-xs text-red-500">{errors.code_reference.message}</p>}
              <FieldHint>Código interno para identificar el producto</FieldHint>
            </div>

            <div className="space-y-2">
              <Label>Nombre <span className="text-red-400">*</span></Label>
              <Input className="rounded-input" placeholder="Nombre del producto o servicio" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Descripción</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500"
                placeholder="Descripción opcional del producto o servicio"
                {...register('description')}
              />
              <FieldHint>Aparecerá en la factura junto al nombre del producto</FieldHint>
            </div>
          </div>
        </div>

        {/* Precio e impuestos */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5">
          <SectionHeader icon={DollarSign} title="Precio e impuestos" description="Configura el precio y la tarifa IVA" color="amber" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Precio base sin IVA (COP) <span className="text-red-400">*</span></Label>
              <Input
                className="rounded-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tarifa IVA</Label>
              <select
                className={`${selectClass} ${isExcluded === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isExcluded === 1}
                {...register('tax_rate')}
              >
                {TAX_RATES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {isExcluded === 1 && <FieldHint>Deshabilitado porque el producto está excluido de IVA</FieldHint>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="is_excluded" className="flex cursor-pointer items-center gap-3 rounded-input border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                <input
                  type="checkbox"
                  id="is_excluded"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={isExcluded === 1}
                  onChange={handleExcludedChange}
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Producto excluido de IVA</span>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Selecciona si este producto no está gravado con IVA</p>
                </div>
              </label>
            </div>

            {/* Live price preview */}
            {Number(price) > 0 && (
              <div className="sm:col-span-2 rounded-input border border-dashed border-primary-200 bg-primary-50/50 p-3 dark:border-primary-800/50 dark:bg-primary-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-3.5 w-3.5 text-primary-500" />
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">Vista previa del precio</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Subtotal</p>
                    <p className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{formatCurrency(pricePreview.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">IVA ({isExcluded === 1 ? 'Excl.' : `${taxRate}%`})</p>
                    <p className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">{formatCurrency(pricePreview.tax)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-primary-500">Total</p>
                    <p className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{formatCurrency(pricePreview.total)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spacer for sticky bar on mobile */}
        <div className="h-20 sm:hidden" aria-hidden="true" />

        {/* Actions — sticky on mobile */}
        <div className="sticky bottom-16 z-10 -mx-4 border-t border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none md:bottom-0">
          <div className="flex gap-3">
            <Link to="/products" className="flex-1 sm:flex-none">
              <Button type="button" variant="outline" className="min-h-[44px] w-full rounded-input sm:w-auto">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] flex-1 rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg sm:flex-none"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear producto')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
