import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LoadingSpinner = ({ className, text = 'Cargando...' }) => (
  <div className={cn('flex flex-col items-center justify-center py-12', className)}>
    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
    {text && (
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-jakarta">{text}</p>
    )}
  </div>
);

export { LoadingSpinner };
