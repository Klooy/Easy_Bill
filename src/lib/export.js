/**
 * CSV export utility — no external dependencies.
 * Generates a CSV string and triggers a browser download.
 */

/**
 * Export an array of objects to a CSV file.
 * @param {Object[]} data - Array of objects to export
 * @param {Object} options
 * @param {string} options.filename - Filename without extension
 * @param {Object} options.columns - Map of { key: 'Header Label' }
 * @param {Object} [options.formatters] - Map of { key: (value) => string }
 */
const exportToCsv = (data, { filename = 'export', columns, formatters = {} }) => {
  if (!data?.length) return;

  const keys = Object.keys(columns);
  const headers = Object.values(columns);

  const escapeCell = (val) => {
    const str = val == null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((row) =>
    keys.map((key) => {
      const raw = key.includes('.') ? key.split('.').reduce((o, k) => o?.[k], row) : row[key];
      const formatted = formatters[key] ? formatters[key](raw, row) : raw;
      return escapeCell(formatted);
    }).join(',')
  );

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};

export { exportToCsv };
