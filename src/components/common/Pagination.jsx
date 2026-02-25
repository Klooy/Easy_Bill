import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Pagination = ({ current, total, from, to, count, onPrev, onNext }) => {
  if (total <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-2 rounded-card bg-white dark:bg-gray-800 px-3 py-3 shadow-card sm:flex-row sm:justify-between sm:px-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta sm:text-sm">
        Mostrando <span className="font-medium text-gray-700 dark:text-gray-300">{from}–{to}</span> de{' '}
        <span className="font-medium text-gray-700 dark:text-gray-300">{count}</span>
      </p>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] rounded-input px-2.5 sm:px-3"
          disabled={current <= 1}
          onClick={onPrev}
        >
          <ChevronLeft className="mr-0.5 h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Anterior</span>
          <span className="sm:hidden">Ant.</span>
        </Button>
        <span className="min-w-[50px] text-center text-sm font-medium text-gray-700 dark:text-gray-300 font-outfit sm:min-w-[60px]">
          {current} / {total}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] rounded-input px-2.5 sm:px-3"
          disabled={current >= total}
          onClick={onNext}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <span className="sm:hidden">Sig.</span>
          <ChevronRight className="ml-0.5 h-4 w-4 sm:ml-1" />
        </Button>
      </div>
    </div>
  );
};

export { Pagination };
