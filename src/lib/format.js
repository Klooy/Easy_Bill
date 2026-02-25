/**
 * Shared formatting utilities for Easy Bill.
 * Single source of truth — do NOT duplicate in page files.
 */

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value || 0);

/**
 * Compact currency for dashboards / mobile.
 * e.g. $1.2M, $345K, $8.500
 */
const formatCurrencyCompact = (value) => {
  const v = value || 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (v >= 10_000) return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1).replace('.0', '')}K`;
  return formatCurrency(v);
};

const formatDate = (date, options = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  if (!date) return '—';
  const d =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date + 'T12:00:00'
      : date;
  return new Date(d).toLocaleDateString('es-CO', options);
};

const formatDateLong = (date) =>
  formatDate(date, { day: '2-digit', month: 'long', year: 'numeric' });

export { formatCurrency, formatCurrencyCompact, formatDate, formatDateLong };
