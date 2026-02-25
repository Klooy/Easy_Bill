import { DIAN_ERROR_LABELS } from '@/lib/constants';

/**
 * Parses DIAN validation errors from a FACTUS response.
 * FACTUS returns DIAN errors as: { "FAK24": "Regla: FAK24, Rechazo: ..." }
 * @param {object} factusResponse - Raw FACTUS response
 * @returns {string[]} Array of user-friendly error messages
 */
const parseDianErrors = (factusResponse) => {
  if (!factusResponse) return [];
  const source = factusResponse.data || factusResponse;
  const errors = [];
  for (const [code, msg] of Object.entries(source)) {
    if (/^FA[A-Z]\d+/.test(code)) {
      const label = DIAN_ERROR_LABELS[code] || msg;
      const isRejection = typeof msg === 'string' && msg.includes('Rechazo');
      errors.push(`${isRejection ? '❌' : '⚠️'} ${code}: ${label}`);
    }
  }
  return errors;
};

export { parseDianErrors };
