import { useEffect } from 'react';
import { ArrowLeft, Loader2, Save, IdCard, User, Mail, Phone, MapPin, Building2, Scale } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { MunicipalitySearch } from '@/components/common/MunicipalitySearch';
import { useClient } from '@/hooks/useClients';
import { clientsService } from '@/services/clients.service';
import {
  clientSchema,
  IDENTIFICATION_TYPES,
  LEGAL_ORGANIZATIONS,
  TRIBUTES,
} from '@/lib/schemas/client.schema';
import { selectClass } from '@/lib/constants';
import { SectionHeader, FieldHint } from '@/components/common/SectionHeader';

const ClientFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { client, loading: loadingClient } = useClient(id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      identification_document_id: '',
      identification: '',
      dv: '',
      company: '',
      trade_name: '',
      names: '',
      email: '',
      phone: '',
      address: '',
      municipality_id: '',
      legal_organization_id: '',
      tribute_id: '',
    },
  });

  const docType = watch('identification_document_id');
  const showDv = Number(docType) === 6; // NIT requires DV

  useEffect(() => {
    if (client) {
      reset({
        identification_document_id: client.identification_document_id || '',
        identification: client.identification || '',
        dv: client.dv || '',
        company: client.company || '',
        trade_name: client.trade_name || '',
        names: client.names || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        municipality_id: client.municipality_id || '',
        legal_organization_id: client.legal_organization_id || '',
        tribute_id: client.tribute_id || '',
      });
    }
  }, [client, reset]);

  const onSubmit = async (values) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
      );
      if (isEditing) {
        await clientsService.update(id, cleaned);
        sileo.success({ title: 'Cliente actualizado', description: `"${values.names || values.company || ''}" se actualizó correctamente.` });
      } else {
        await clientsService.create(cleaned);
        sileo.success({ title: 'Cliente creado', description: `"${values.names || values.company || ''}" fue registrado exitosamente.` });
      }
      navigate('/clients');
    } catch (error) {
      sileo.error({ title: 'Error al guardar cliente', description: error.message || 'Ocurrió un error inesperado.' });
    }
  };

  if (isEditing && loadingClient) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/clients">
          <Button variant="outline" size="icon" className="shrink-0 rounded-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-outfit text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            {isEditing ? 'Modifica los datos del cliente' : 'Completa los datos para registrar un nuevo cliente'}
          </p>
        </div>
      </div>

      {/* Required fields note */}
      <p className="text-xs text-gray-400 dark:text-gray-500">Los campos marcados con <span className="text-red-400">*</span> son obligatorios</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Identificación */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <SectionHeader icon={IdCard} title="Identificación" description="Tipo de documento y datos fiscales del cliente" color="primary" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de documento <span className="text-red-400">*</span></Label>
              <select className={selectClass} {...register('identification_document_id')}>
                <option value="">Seleccionar...</option>
                {IDENTIFICATION_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              {errors.identification_document_id && (
                <p className="text-xs text-red-500">{errors.identification_document_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Número de documento <span className="text-red-400">*</span></Label>
              <div className="flex gap-2">
                <Input
                  className="rounded-input flex-1"
                  placeholder="Ej: 900123456"
                  {...register('identification')}
                />
                {showDv && (
                  <Input
                    className="w-16 rounded-input text-center"
                    placeholder="DV"
                    maxLength={1}
                    {...register('dv')}
                  />
                )}
              </div>
              {errors.identification && (
                <p className="text-xs text-red-500">{errors.identification.message}</p>
              )}
              {showDv && <FieldHint>El dígito de verificación (DV) es obligatorio para NIT</FieldHint>}
            </div>

            <div className="space-y-2">
              <Label>Organizacion legal <span className="text-red-400">*</span></Label>
              <select className={selectClass} {...register('legal_organization_id')}>
                <option value="">Seleccionar...</option>
                {LEGAL_ORGANIZATIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              {errors.legal_organization_id && (
                <p className="text-xs text-red-500">{errors.legal_organization_id.message}</p>
              )}
              <FieldHint>Persona natural o juridica segun registro DIAN</FieldHint>
            </div>

            <div className="space-y-2">
              <Label>Tributo <span className="text-red-400">*</span></Label>
              <select className={selectClass} {...register('tribute_id')}>
                <option value="">Seleccionar...</option>
                {TRIBUTES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              {errors.tribute_id && (
                <p className="text-xs text-red-500">{errors.tribute_id.message}</p>
              )}
              <FieldHint>Regimen tributario aplicable (IVA, No responsable, etc.)</FieldHint>
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <SectionHeader icon={User} title="Datos del cliente" description="Nombre y razon social" color="blue" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre / Razon social <span className="text-red-400">*</span></Label>
              <Input className="rounded-input" placeholder="Nombre completo o razon social" {...register('names')} />
              {errors.names && <p className="text-xs text-red-500">{errors.names.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input className="rounded-input" placeholder="Nombre de la empresa" {...register('company')} />
              <FieldHint>Nombre legal de la empresa (si aplica)</FieldHint>
            </div>

            <div className="space-y-2">
              <Label>Nombre comercial</Label>
              <Input className="rounded-input" placeholder="Nombre comercial" {...register('trade_name')} />
              <FieldHint>Nombre con el que se conoce comercialmente</FieldHint>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <SectionHeader icon={Phone} title="Contacto y ubicacion" description="Información de contacto y dirección" color="emerald" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                Email
              </Label>
              <Input className="rounded-input" type="email" placeholder="correo@ejemplo.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              <FieldHint>Se usara para enviar facturas por correo</FieldHint>
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
              <Input className="rounded-input" placeholder="Calle, carrera, número..." {...register('address')} />
            </div>

            <div className="space-y-2">
              <Label>Municipio</Label>
              <MunicipalitySearch
                value={watch('municipality_id')}
                onChange={(val) => setValue('municipality_id', val, { shouldValidate: true })}
                error={errors.municipality_id}
              />
              <FieldHint>Pais, departamento y ciudad se completan automáticamente</FieldHint>
            </div>
          </div>
        </div>

        {/* Spacer for sticky bar on mobile */}
        <div className="h-20 sm:hidden" aria-hidden="true" />

        {/* Actions — sticky on mobile */}
        <div className="sticky bottom-16 z-10 -mx-4 border-t border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none md:bottom-0">
          <div className="flex gap-3">
            <Link to="/clients" className="flex-1 sm:flex-none">
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
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear cliente')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClientFormPage;
