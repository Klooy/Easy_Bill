const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="animate-scale-in rounded-card bg-white dark:bg-gray-800 p-5 text-center shadow-card sm:p-8">
    {Icon && (
      <div className="mx-auto mb-1 flex h-20 w-20 items-center justify-center">
        <div className="relative">
          {/* Decorative rings */}
          <div className="absolute inset-0 h-16 w-16 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border-2 border-dashed border-primary-100 dark:border-primary-900/30" />
          <div className="absolute inset-0 h-20 w-20 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-dashed border-primary-50 dark:border-primary-900/15" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <Icon className="h-6 w-6 text-primary-400 dark:text-primary-500" />
          </div>
        </div>
      </div>
    )}
    <h3 className="mt-3 font-outfit text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
    {description && (
      <p className="mx-auto mt-1 max-w-xs text-sm text-gray-400 dark:text-gray-500 font-jakarta">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export { EmptyState };
