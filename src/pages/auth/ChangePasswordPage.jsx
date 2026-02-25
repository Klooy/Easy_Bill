import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sileo } from 'sileo';
import { changePasswordSchema } from '@/lib/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values) => {
    try {
      setServerError('');
      await authService.updatePassword(values.password);
      // Limpiar flag must_change_password en DB y user_metadata
      await authService.clearMustChangePassword();
      sileo.success({ title: 'Contraseña actualizada', description: 'Tu nueva contraseña ha sido guardada correctamente.' });
      navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (error) {
      sileo.error({ title: 'Error al cambiar contraseña', description: error.message });
      setServerError(error.message || 'Error al cambiar la contraseña');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-gradient-to-r from-primary-500 to-primary-700 shadow-primary-md">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">Cambiar contraseña</h1>
          <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
            Por seguridad, debes cambiar tu contraseña temporal
          </p>
        </div>

        {/* Form */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-6 shadow-card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="rounded-input"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                className="rounded-input"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-badge bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
