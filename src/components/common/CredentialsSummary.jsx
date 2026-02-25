import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const CopyField = ({ label, value, mono = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-input border bg-gray-50 dark:bg-gray-900 px-4 py-3">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">{label}</p>
        <p className={`mt-0.5 text-sm font-semibold text-gray-900 dark:text-white ${mono ? 'font-mono' : 'font-jakarta'}`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="ml-3 flex h-8 w-8 items-center justify-center rounded-badge text-gray-400 dark:text-gray-500 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-300 transition-colors"
        title="Copiar"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
};

const CredentialsSummary = ({ seller, onDone }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
      {/* Success header */}
      <div className="rounded-card bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-center text-white shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 dark:bg-white/20">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-outfit text-2xl font-bold">¿Vendedor creado!</h1>
        <p className="mt-1 text-sm text-white/80 font-jakarta">
          Entrega estas credenciales al vendedor para que pueda acceder al sistema.
        </p>
      </div>

      {/* Credentials card */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-6 shadow-card">
        <h2 className="mb-4 font-outfit text-lg font-bold text-gray-900 dark:text-white">Credenciales de acceso</h2>

        <div className="space-y-3">
          <CopyField label="Email" value={seller.email} />

          <div className="flex items-center justify-between rounded-input border bg-gray-50 dark:bg-gray-900 px-4 py-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">Contraseña temporal</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white font-mono">
                {showPassword ? seller.password : '••••••••••••••••'}
              </p>
            </div>
            <div className="ml-3 flex gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex h-8 w-8 items-center justify-center rounded-badge text-gray-400 dark:text-gray-500 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-300 transition-colors"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <CopyButton value={seller.password} />
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <InfoRow label="Empresa" value={seller.company_name} />
          {seller.nit && <InfoRow label="NIT" value={seller.nit} mono />}
          {seller.invoice_quota > 0 && (
            <InfoRow label="Créditos asignados" value={seller.invoice_quota} />
          )}
        </div>

        <div className="mt-4 rounded-input bg-amber-50 p-3">
          <p className="text-xs text-amber-700 font-jakarta">
            <strong>Importante:</strong> El vendedor deberá cambiar su contraseña en el primer inicio de sesión.
            Estas credenciales no se podrán consultar nuevamente.
          </p>
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-center">
        <Button
          onClick={onDone}
          className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
        >
          Ir a vendedores
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const CopyButton = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-8 w-8 items-center justify-center rounded-badge text-gray-400 dark:text-gray-500 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-300 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500 dark:text-gray-400 font-jakarta">{label}</span>
    <span className={`font-semibold text-gray-900 dark:text-white ${mono ? 'font-mono' : 'font-jakarta'}`}>{value}</span>
  </div>
);

export { CredentialsSummary };
