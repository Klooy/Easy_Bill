import { useState, useEffect } from 'react';
import { FileText, Send, Check, Shield, X } from 'lucide-react';

const STEPS = [
  { icon: FileText, label: 'Preparando factura...' },
  { icon: Send, label: 'Enviando a FACTUS...' },
  { icon: Shield, label: 'Validando ante la DIAN...' },
  { icon: Check, label: 'Casi listo...' },
];

const TIMEOUT_SECONDS = 30;

const EmissionOverlay = ({ visible, onCancel }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const showCancel = elapsed >= TIMEOUT_SECONDS && typeof onCancel === 'function';

  // Cycle through steps
  useEffect(() => {
    if (!visible) { setStepIndex(0); return; }
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 3200);
    return () => clearInterval(interval);
  }, [visible]);

  // Animate dots
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [visible]);

  // Track elapsed time
  useEffect(() => {
    if (!visible) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const CurrentIcon = STEPS[stepIndex].icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-6 rounded-card bg-white/95 dark:bg-gray-800/95 px-10 py-10 shadow-2xl animate-scale-in max-w-[320px] w-[90%]">

        {/* Animated icon with rings */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* Outer pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-primary-400/20 animate-[emission-ping_2s_ease-out_infinite]" />
          {/* Middle pulsing ring (delayed) */}
          <span className="absolute inset-2 rounded-full bg-primary-400/15 animate-[emission-ping_2s_0.6s_ease-out_infinite]" />
          {/* Icon container */}
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-lg animate-[emission-breathe_2.4s_ease-in-out_infinite]">
            <CurrentIcon className="h-7 w-7 text-white transition-all duration-500" />
          </div>
        </div>

        {/* Step label */}
        <div className="text-center">
          <p className="font-outfit text-base font-bold text-gray-900 dark:text-white">
            Emitiendo factura
          </p>
          <p className="mt-1.5 font-jakarta text-sm text-primary-600 dark:text-primary-400 min-h-[20px]">
            {STEPS[stepIndex].label}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-700 ease-out animate-[emission-shimmer_1.5s_linear_infinite] bg-[length:200%_100%]"
              style={{ width: `${Math.min(25 + stepIndex * 25, 95)}%` }}
            />
          </div>
        </div>

        {/* Hint / Cancel */}
        {showCancel ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-center font-jakarta text-xs text-amber-600 dark:text-amber-400">
              Esto está tardando más de lo esperado.
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-gray-200 bg-white px-4 py-2 font-jakarta text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar y reintentar
            </button>
          </div>
        ) : (
          <p className="text-center font-jakarta text-[11px] text-gray-400 dark:text-gray-500">
            No cierres esta ventana{dots}
          </p>
        )}

        {/* Step indicators */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= stepIndex
                  ? 'w-5 bg-primary-500'
                  : 'w-1.5 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export { EmissionOverlay };
