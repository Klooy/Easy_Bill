import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sileo } from 'sileo';
import { loginSchema } from '@/lib/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Eye, EyeOff, Zap, Shield, BarChart3 } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Rápida y sencilla', desc: 'Emite facturas electrónicas en segundos con nuestro wizard inteligente.' },
  { icon: Shield, title: 'Validada por la DIAN', desc: 'Integración directa con FACTUS para cumplir con la normativa colombiana.' },
  { icon: BarChart3, title: 'Control total', desc: 'Dashboard con métricas, reportes y seguimiento de tus documentos.' },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      setServerError('');
      const { session, user } = await authService.signIn(values.email, values.password);
      const role = authService.getRoleFromUser(user);
      setSession(session, user, role);

      // Para vendedores, verificar flag must_change_password en DB
      if (role === 'seller') {
        const seller = await authService.getSellerProfile(user.id);
        if (seller?.must_change_password || user?.user_metadata?.must_change_password) {
          sileo.info({ title: 'Cambio de contraseña requerido', description: 'Debes actualizar tu contraseña temporal por seguridad.' });
          navigate('/change-password', { replace: true });
          return;
        }
      }

      sileo.success({ title: `¡Bienvenido, ${user.email?.split('@')[0]}!`, description: 'Sesión iniciada correctamente.' });
      navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (error) {
      sileo.error({ title: 'Error al iniciar sesión', description: error.message || 'Credenciales inválidas' });
      setServerError(error.message || 'Credenciales inválidas');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Left branding panel (hidden on mobile) ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-500 p-10 lg:flex lg:w-[480px] xl:w-[540px]">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-10 bottom-40 h-40 w-40 rounded-full bg-white/[0.03]" />

        {/* Top — logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-input bg-white/15 backdrop-blur-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-outfit text-xl font-bold text-white">Easy Bill</span>
          </div>
        </div>

        {/* Center — headline + features */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-outfit text-3xl font-bold leading-tight text-white xl:text-4xl">
              Facturación electrónica
              <br />
              <span className="text-primary-200">sin complicaciones</span>
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-primary-200/80 font-jakarta">
              La plataforma que simplifica la emisión de facturas electrónicas para tu negocio en Colombia.
            </p>
          </div>

          <div className="space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-badge bg-white/10 backdrop-blur-sm">
                  <Icon className="h-4 w-4 text-primary-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white font-jakarta">{title}</p>
                  <p className="text-xs leading-relaxed text-primary-200/70 font-jakarta">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — footer */}
        <p className="relative z-10 text-xs text-primary-300/50 font-jakarta">
          &copy; {new Date().getFullYear()} Easy Bill — Todos los derechos reservados
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col lg:items-center lg:justify-center">
        {/* Mobile hero header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-6 pb-12 pt-14 lg:hidden">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
              <img src="/easybill.png" alt="Easy Bill" className="h-9 w-9" />
            </div>
            <h1 className="font-outfit text-2xl font-bold text-white">Easy Bill</h1>
            <p className="mt-1 text-sm text-primary-200/80 font-jakarta">Facturacion electrónica sin complicaciones</p>
          </div>
        </div>

        {/* Form container — overlaps hero on mobile */}
        <div className="mx-auto w-full max-w-sm px-5 lg:px-0 -mt-6 lg:mt-0">
          <div className="animate-fade-in-up">
            {/* Desktop heading */}
            <div className="mb-8 hidden lg:block">
              <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">Bienvenido de nuevo</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">Ingresa tus credenciales para continuar</p>
            </div>

            {/* Form card */}
            <div className="rounded-card bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-6 shadow-card dark:shadow-none dark:ring-1 dark:ring-gray-700/50">
              <h2 className="mb-1 font-outfit text-lg font-bold text-gray-900 dark:text-white">
                Iniciar sesión
              </h2>
              <p className="mb-5 text-xs text-gray-500 dark:text-gray-400 font-jakarta">Ingresa tus credenciales para acceder</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium font-jakarta">Correo electronico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    className="min-h-[46px] rounded-input"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium font-jakarta">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      className="min-h-[46px] rounded-input pr-10"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="flex items-center gap-2 rounded-input bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                    <Shield className="h-4 w-4 shrink-0" />
                    {serverError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[48px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                </Button>

                <Link
                  to="/forgot-password"
                  className="block text-center text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 font-jakarta"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </form>
            </div>

            {/* Mobile features */}
            <div className="mt-5 space-y-3 lg:hidden">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 rounded-input bg-white dark:bg-gray-800/50 p-3 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-input bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white font-jakarta">{title}</p>
                    <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 font-jakarta">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-[11px] text-gray-400 dark:text-gray-600 font-jakarta">
              &copy; {new Date().getFullYear()} Easy Bill — Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
