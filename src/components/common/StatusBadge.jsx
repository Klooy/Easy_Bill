import { cn } from '@/lib/utils';

const statusConfig = {
  active: {
    label: 'Activo',
    className: 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800',
    dotColor: 'bg-green-500',
    pulse: true,
  },
  suspended: {
    label: 'Suspendido',
    className: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800',
    dotColor: 'bg-red-500',
    pulse: false,
  },
  inactive: {
    label: 'Inactivo',
    className: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700',
    dotColor: 'bg-gray-400',
    pulse: false,
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800',
    dotColor: 'bg-amber-500',
    pulse: true,
  },
};

const StatusBadge = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-badge px-2.5 py-0.5 text-xs font-semibold font-jakarta',
        config.className,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-40', config.dotColor)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.dotColor)} />
      </span>
      {config.label}
    </span>
  );
};

export { StatusBadge };
