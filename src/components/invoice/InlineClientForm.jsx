import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sileo } from 'sileo';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MunicipalitySearch } from '@/components/common/MunicipalitySearch';
import { selectClass } from '@/lib/constants';
import { clientsService } from '@/services/clients.service';
import {
  clientSchema,
  IDENTIFICATION_TYPES,
  LEGAL_ORGANIZATIONS,
  TRIBUTES,
} from '@/lib/schemas/client.schema';

const InlineClientForm = ({ onClientSelected }) => {
  const [saveToDb, setSaveToDb] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
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
  const showDv = Number(docType) === 6;

  const handleSelectClient = async (values) => {
    setSaving(true);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])
      );

      if (saveToDb) {
        const newClient = await clientsService.create(cleaned);
        onClientSelected(newClient.id, newClient);
        sileo.success({ title: 'Cliente registrado', description: `"${cleaned.names || cleaned.company || ''}" fue guardado y seleccionado.` });
      } else {
        onClientSelected('temp', { ...cleaned, _isTemporary: true });
        sileo.info({ title: 'Cliente temporal seleccionado', description: 'Solo se usará para esta factura. No queda guardado.' });
      }
    } catch (error) {
      sileo.error({ title: 'Error al procesar cliente', description: error.message || 'Ocurrió un error inesperado.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSelectClient)} className="space-y-4">
      {/* Identificación */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo de documento <span className="text-red-400">*</span></Label>
          <select className={selectClass} {...register('identification_document_id')}>
            <option value="">Seleccionar...</option>
            {IDENTIFICATION_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          {errors.identification_document_id && (
            <p className="text-[11px] text-red-500">{errors.identification_document_id.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">N° de documento <span className="text-red-400">*</span></Label>
          <div className="flex gap-2">
            <Input className="rounded-input flex-1" placeholder="900123456" {...register('identification')} />
            {showDv && (
              <Input className="w-16 rounded-input text-center" placeholder="DV" maxLength={1} {...register('dv')} />
            )}
          </div>
          {errors.identification && (
            <p className="text-[11px] text-red-500">{errors.identification.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Organización legal <span className="text-red-400">*</span></Label>
          <select className={selectClass} {...register('legal_organization_id')}>
            <option value="">Seleccionar...</option>
            {LEGAL_ORGANIZATIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {errors.legal_organization_id && (
            <p className="text-[11px] text-red-500">{errors.legal_organization_id.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tributo <span className="text-red-400">*</span></Label>
          <select className={selectClass} {...register('tribute_id')}>
            <option value="">Seleccionar...</option>
            {TRIBUTES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          {errors.tribute_id && (
            <p className="text-[11px] text-red-500">{errors.tribute_id.message}</p>
          )}
        </div>
      </div>

      {/* Nombre */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Nombre / Razón social <span className="text-red-400">*</span></Label>
          <Input className="rounded-input" placeholder="Nombre completo o razón social" {...register('names')} />
          {errors.names && <p className="text-[11px] text-red-500">{errors.names.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Empresa</Label>
          <Input className="rounded-input" placeholder="Nombre de la empresa" {...register('company')} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Nombre comercial</Label>
          <Input className="rounded-input" placeholder="Nombre comercial" {...register('trade_name')} />
        </div>
      </div>

      {/* Contacto */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input className="rounded-input" type="email" placeholder="correo@ejemplo.com" {...register('email')} />
          {errors.email && <p className="text-[11px] text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Teléfono</Label>
          <Input className="rounded-input" placeholder="300 123 4567" {...register('phone')} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Dirección</Label>
          <Input className="rounded-input" placeholder="Calle, carrera, número..." {...register('address')} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Municipio</Label>
          <MunicipalitySearch
            value={watch('municipality_id')}
            onChange={(val) => setValue('municipality_id', val, { shouldValidate: true })}
            error={errors.municipality_id}
          />
        </div>
      </div>

      {/* Save toggle + Submit */}
      <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={saveToDb}
            onChange={() => setSaveToDb(!saveToDb)}
            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Guardar cliente para futuras facturas</span>
        </label>
        {!saveToDb && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            Los datos del cliente se usarán solo para esta factura (venta ocasional)
          </p>
        )}

        <Button
          type="submit"
          disabled={saving}
          className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
        >
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
          ) : (
            <><UserPlus className="mr-2 h-4 w-4" />{saveToDb ? 'Registrar y seleccionar' : 'Usar sin guardar'}</>
          )}
        </Button>
      </div>
    </form>
  );
};

export { InlineClientForm };
