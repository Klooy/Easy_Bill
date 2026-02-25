import { FileText, Users, Package, Check } from 'lucide-react';

const STEP_LABELS = ['Datos generales', 'Cliente', 'Productos', 'Resumen'];
const STEP_ICONS = [FileText, Users, Package, Check];

const StepIndicator = ({ step, totalSteps }) => (
  <div className="mb-6">
    <p className="text-sm text-gray-500 dark:text-gray-400 font-jakarta md:hidden">
      Paso {step} de {totalSteps} — {STEP_LABELS[step - 1]}
    </p>
    <div className="hidden md:flex items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const Icon = STEP_ICONS[i];
        const isActive = i + 1 === step;
        const isDone = i + 1 < step;
        return (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-8 ${isDone ? 'bg-primary-500' : 'bg-gray-200'}`} />}
            <div className={`flex items-center gap-1.5 rounded-badge px-3 py-1.5 text-xs font-medium transition-colors
              ${isActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700' : isDone ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500 dark:text-gray-400'}`}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export { StepIndicator };
