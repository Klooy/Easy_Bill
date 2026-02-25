import { Info } from 'lucide-react';

/**
 * Unified section header for form pages.
 * Supports all color variants: primary, blue, emerald, amber.
 */
const COLOR_MAP = {
  primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

const SectionHeader = ({ icon: Icon, title, description, color = 'primary' }) => {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ${COLOR_MAP[color] || COLOR_MAP.primary}`}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <h2 className="font-outfit text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Small hint text below form fields.
 * Optionally shows an Info icon (used in admin pages).
 */
const FieldHint = ({ children, showIcon = false }) => (
  <p className="mt-1 flex items-start gap-1 text-[11px] text-gray-400 dark:text-gray-500 font-jakarta">
    {showIcon && <Info className="h-3 w-3 shrink-0 mt-0.5" />}
    <span>{children}</span>
  </p>
);

export { SectionHeader, FieldHint };
