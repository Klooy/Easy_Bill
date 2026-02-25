import { cn } from '@/lib/utils';

const Skeleton = ({ className, ...props }) => (
  <div
    className={cn('rounded-badge skeleton-shimmer', className)}
    {...props}
  />
);

const SkeletonCard = ({ lines = 3 }) => (
  <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
    <div className="flex items-start gap-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-badge" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
    </div>
    {lines > 1 && (
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} className="h-3 rounded" style={{ width: `${85 - i * 15}%` }} />
        ))}
      </div>
    )}
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 rounded-card bg-white dark:bg-gray-800 p-4 shadow-card">
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-5 w-16 rounded-badge" />
      </div>
      <Skeleton className="h-3 w-40 rounded" />
      <Skeleton className="h-3 w-28 rounded" />
    </div>
    <div className="text-right space-y-1">
      <Skeleton className="ml-auto h-5 w-20 rounded" />
      <Skeleton className="ml-auto h-4 w-12 rounded" />
    </div>
  </div>
);

const SkeletonStatCard = () => (
  <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-badge" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-6 w-10 rounded" />
      </div>
    </div>
  </div>
);

const SkeletonChart = () => (
  <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6">
    <div className="mb-4 flex items-center gap-2">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-5 w-32 rounded" />
    </div>
    <div className="flex h-[200px] items-end gap-3 px-4">
      {[65, 40, 80, 55, 70, 45].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

const SkeletonGrid = ({ count = 6, type = 'card' }) => {
  const Component = type === 'row' ? SkeletonRow : SkeletonCard;
  const gridClass = type === 'row'
    ? 'space-y-3'
    : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-fade-in-up stagger-${i + 1}`}>
          <Component />
        </div>
      ))}
    </div>
  );
};

export { Skeleton, SkeletonCard, SkeletonRow, SkeletonStatCard, SkeletonChart, SkeletonGrid };
