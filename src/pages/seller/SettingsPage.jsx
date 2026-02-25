import { useState } from 'react';
import { Settings, User, Lock, Moon, Sun, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { authService } from '@/services/auth.service';
import { sileo } from 'sileo';
import { SectionHeader } from '@/components/common/SectionHeader';

const SettingsPage = () => {
  const { user, role } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.password.length < 8) {
      sileo.error({ title: 'Contraseña muy corta', description: 'La contraseña debe tener mínimo 8 caracteres.' });
      return;
    }
    if (passwords.password !== passwords.confirmPassword) {
      sileo.error({ title: 'Contraseñas no coinciden', description: 'La contraseña y la confirmación deben ser iguales.' });
      return;
    }
    try {
      setSaving(true);
      await authService.updatePassword(passwords.password);
      sileo.success({ title: 'Contraseña actualizada', description: 'Tu nueva contraseña fue guardada correctamente.' });
      setPasswords({ password: '', confirmPassword: '' });
    } catch (err) {
      sileo.error({ title: 'Error al cambiar contraseña', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
          Gestiona tu perfil y preferencias
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile info */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card space-y-4">
          <SectionHeader icon={User} title="Perfil" description="Información de tu cuenta" />
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Email</Label>
              <p className="font-jakarta text-sm text-gray-900 dark:text-white">{user?.email || '—'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Rol</Label>
              <p className="font-jakarta text-sm capitalize text-gray-900 dark:text-white">{role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card space-y-4">
          <SectionHeader icon={Settings} title="Apariencia" description="Personaliza la interfaz" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-jakarta text-sm font-medium text-gray-900 dark:text-white">Tema oscuro</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cambia entre modo claro y oscuro</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-input border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card space-y-4 lg:col-span-2">
          <SectionHeader icon={Lock} title="Cambiar contraseña" description="Actualiza tu contraseña de acceso" />
          <form onSubmit={handleChangePassword} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="rounded-input"
                value={passwords.password}
                onChange={(e) => setPasswords((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repite tu contraseña"
                className="rounded-input"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={saving || !passwords.password}
                className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
