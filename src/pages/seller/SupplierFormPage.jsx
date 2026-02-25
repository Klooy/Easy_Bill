import { useEffect } from 'react';
import { ArrowLeft, Loader2, Save, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useSupplier } from '@/hooks/useSuppliers';
import { suppliersService } from '@/services/suppliers.service';
import { supplierSchema } from '@/lib/schemas/supplier.schema';
import { selectClass } from '@/lib/constants';
import { SectionHeader, FieldHint } from '@/components/common/SectionHeader';

const DOC_TYPES = ['NIT', 'CC', 'CE', 'PAS'];

const SupplierFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { supplier, loading: loadingSupplier } = useSupplier(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      document_type: '',
      document_number: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name || '',
        document_type: supplier.document_type || '',
        document_number: supplier.document_number || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
      });
    }
  }, [supplier, reset]);

  const onSubmit = async (values) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
      );
      if (isEditing) {
        await suppliersService.update(id, cleaned);
        sileo.success({ title: 'Proveedor actualizado', description: `"${values.name || ''}" se actualizó correctamente.` });
      } else {
        await suppliersService.create(cleaned);
        sileo.success({ title: 'Proveedor creado', description: `"${values.name || ''}" fue registrado exitosamente.` });
      }
      navigate('/suppliers');
    } catch (error) {
      sileo.error({ title: 'Error al guardar proveedor', description: error.message || 'Ocurrió un error inesperado.' });
    }
  };

  if (isEditing && loadingSupplier) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/suppliers">
          <Button variant="outline" size="icon" className="shrink-0 rounded-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-outfit text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            {isEditing ? 'Modifica los datos del proveedor' : 'Registra un nuevo proveedor'}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">Los campos marcados con <span className="text-red-400">*</span> son obligatorios</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Información del proveedor */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <SectionHeader icon={Building2} title="Información del proveedor" description="Nombre y datos de identificación" color="primary" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre <span className="text-red-400">*</span></Label>
              <Input className="rounded-input" placeholder="Nombre o razon social" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              <FieldHint>Nombre completo o razon social del proveedor</FieldHint>
            </div>

            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <select className={selectClass} {...register('document_type')}>
                <option value="">Seleccionar...</option>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Número de documento</Label>
              <Input className="rounded-input font-mono" placeholder="Número de documento" {...register('document_number')} />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <SectionHeader icon={Phone} title="Contacto" description="Información de contacto y dirección" color="emerald" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                Email
              </Label>
              <Input className="rounded-input" type="email" placeholder="correo@ejemplo.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                Telefono
              </Label>
              <Input className="rounded-input" placeholder="300 123 4567" {...register('phone')} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                Direccion
              </Label>
              <Input className="rounded-input" placeholder="Direccion del proveedor" {...register('address')} />
            </div>
          </div>
        </div>

        {/* Spacer for sticky bar on mobile */}
        <div className="h-20 sm:hidden" aria-hidden="true" />

        {/* Actions — sticky on mobile */}
        <div className="sticky bottom-16 z-10 -mx-4 border-t border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none md:bottom-0">
          <div className="flex gap-3">
            <Link to="/suppliers" className="flex-1 sm:flex-none">
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
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear proveedor')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SupplierFormPage;
