import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff, RefreshCw, UserPlus, KeyRound, Building2, CreditCard, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSellerSchema } from '@/lib/schemas/seller.schema';
import { sellersService } from '@/services/sellers.service';
import { CredentialsSummary } from '@/components/common/CredentialsSummary';
import { SectionHeader, FieldHint } from '@/components/common/SectionHeader';

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const specials = '!@#$%&*';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  pass += specials.charAt(Math.floor(Math.random() * specials.length));
  return pass;
};

const SellerCreatePage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdSeller, setCreatedSeller] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createSellerSchema),
    defaultValues: {
      email: '',
      password: generatePassword(),
      company_name: '',
      nit: '',
      phone: '',
      address: '',
      invoice_quota: 0,
    },
  });

  const quotaValue = watch('invoice_quota');

  const handleGenerate = () => {
    const newPass = generatePassword();
    setValue('password', newPass);
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      const result = await sellersService.create(data);
      setCreatedSeller(result);
      sileo.success({ title: 'Vendedor creado exitosamente', description: `"${data.company_name || ''}" fue registrado en el sistema.` });
    } catch (err) {
      sileo.error({ title: 'Error al crear vendedor', description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (createdSeller) {
    return (
      <CredentialsSummary
        seller={createdSeller}
        onDone={() => navigate('/admin/sellers')}
      />
    );
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/sellers">
          <Button variant="outline" size="icon" className="shrink-0 rounded-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-outfit text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Nuevo Vendedor</h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-jakarta sm:text-sm">Crear una nueva cuenta de acceso para un vendedor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-5">
        {/* Datos de acceso */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6 animate-fade-in-up stagger-1">
          <SectionHeader icon={KeyRound} title="Datos de acceso" description="Email y contraseña temporal para el primer inicio de sesión" color="primary" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-jakarta text-sm">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="vendedor@empresa.com"
                className="rounded-input"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
              <FieldHint showIcon>Este será el email de inicio de sesión del vendedor</FieldHint>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-jakarta text-sm">
                Contraseña temporal <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="rounded-input pr-10 font-mono"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-input min-h-[44px] min-w-[44px]"
                  onClick={handleGenerate}
                  title="Generar nueva contraseña"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
              <FieldHint showIcon>Se genera automáticamente. El vendedor la cambiará en su primer inicio</FieldHint>
            </div>
          </div>
        </div>

        {/* Datos de empresa */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6 animate-fade-in-up stagger-2">
          <SectionHeader icon={Building2} title="Datos de empresa" description="Información comercial y de contacto" color="blue" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name" className="font-jakarta text-sm">
                Nombre / Razon social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company_name"
                placeholder="Empresa S.A.S."
                className="rounded-input"
                {...register('company_name')}
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">{errors.company_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nit" className="font-jakarta text-sm">NIT</Label>
              <Input
                id="nit"
                placeholder="900123456-7"
                className="rounded-input font-mono"
                {...register('nit')}
              />
              <FieldHint showIcon>Número de Identificación Tributaria con dígito de verificación</FieldHint>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="font-jakarta text-sm">Telefono</Label>
              <Input
                id="phone"
                placeholder="3001234567"
                className="rounded-input"
                {...register('phone')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="font-jakarta text-sm">Direccion</Label>
              <Input
                id="address"
                placeholder="Calle 123 # 45-67"
                className="rounded-input"
                {...register('address')}
              />
            </div>
          </div>
        </div>

        {/* Créditos iniciales */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6 animate-fade-in-up stagger-3">
          <SectionHeader icon={CreditCard} title="Paquete inicial" description="Créditos de facturas para empezar a operar" color="emerald" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice_quota" className="font-jakarta text-sm">Créditos de facturas</Label>
              <Input
                id="invoice_quota"
                type="number"
                min="0"
                className="rounded-input text-lg font-outfit font-bold"
                {...register('invoice_quota', { valueAsNumber: true })}
              />
              {errors.invoice_quota && (
                <p className="text-sm text-red-500">{errors.invoice_quota.message}</p>
              )}
              <FieldHint showIcon>Puedes asignar 0 ahora y agregar créditos despues desde el detalle del vendedor</FieldHint>
            </div>
            <div className="flex items-center">
              <div className="rounded-input border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 w-full">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-jakarta font-medium">Resumen del paquete</p>
                <p className="mt-1 font-outfit text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {quotaValue || 0} <span className="text-sm font-normal text-emerald-500">créditos</span>
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-500 dark:text-emerald-400/70 font-jakarta">
                  = {quotaValue || 0} factura{quotaValue !== 1 ? 's' : ''} electrónica{quotaValue !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop submit */}
        <div className="hidden md:flex justify-end gap-3">
          <Link to="/admin/sellers">
            <Button type="button" variant="outline" className="min-h-[44px] rounded-input">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
          >
            {submitting ? (
              <>Creando...</>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Crear vendedor
              </>
            )}
          </Button>
        </div>

        {/* Mobile sticky bar */}
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-3 md:hidden">
          <div className="flex gap-2">
            <Link to="/admin/sellers" className="flex-1">
              <Button type="button" variant="outline" className="w-full min-h-[44px] rounded-input">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md"
            >
              {submitting ? 'Creando...' : 'Crear vendedor'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SellerCreatePage;
