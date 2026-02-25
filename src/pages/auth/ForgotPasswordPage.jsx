import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { sileo } from 'sileo';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      setLoading(true);
      await authService.resetPasswordForEmail(email);
      sileo.success({ title: 'Enlace enviado', description: 'Revisa tu bandeja de entrada para restablecer tu contraseña.' });
      setSent(true);
    } catch (err) {
      sileo.error({ title: 'Error al enviar enlace', description: err.message || 'No se pudo enviar el correo de recuperación.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-gradient-to-r from-primary-500 to-primary-700 shadow-primary-md">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">
            Recuperar contraseña
          </h1>
          <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <div className="rounded-card bg-white dark:bg-gray-800 p-6 shadow-card">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <p className="font-outfit text-base font-bold text-gray-900 dark:text-white">
                  ¡Correo enviado!
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-jakarta">
                  Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
                </p>
              </div>
              <Link to="/login" className="w-full">
                <Button
                  variant="outline"
                  className="min-h-[44px] w-full rounded-input"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium font-jakarta">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="rounded-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </Button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 font-jakarta"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al inicio de sesión
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
