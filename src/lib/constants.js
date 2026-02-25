/**
 * Shared constants for Easy Bill.
 * Single source of truth — do NOT duplicate in page files.
 */

const STATUS_COLORS = {
  draft: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700',
  issued: 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800',
  annulled: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800',
};

const STATUS_LABELS = {
  draft: 'Borrador',
  issued: 'Emitida',
  rejected: 'Rechazada',
  annulled: 'Anulada',
};

const FREQ_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

/**
 * Shared select element class for styled <select> elements.
 * Matches Input styling from shadcn/ui.
 */
const selectClass =
  'flex h-10 min-h-[44px] w-full rounded-input border border-input dark:border-gray-600 bg-background dark:bg-gray-800 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500';

/**
 * Shared default item shape for invoice, credit note, and recurring items.
 * Single source of truth — do NOT define locally in page files.
 */
const DEFAULT_ITEM = {
  product_id: '',
  code_reference: '',
  name: '',
  quantity: 1,
  unit_price: 0,
  discount_rate: 0,
  tax_rate: '19.00',
  unit_measure_id: 70,
  standard_code_id: 1,
  is_excluded: 0,
  tribute_id: 1,
};

/**
 * IVA rate options for Colombia.
 * Used across all forms that allow tax rate selection.
 */
const TAX_RATES = [
  { value: '0.00', label: '0%' },
  { value: '5.00', label: '5%' },
  { value: '8.00', label: '8%' },
  { value: '19.00', label: '19%' },
];

/**
 * DIAN error code labels for user-friendly messages.
 * Extend as new codes are encountered.
 */
const DIAN_ERROR_LABELS = {
  FAK24: 'El dígito de verificación (DV) del NIT no fue informado',
  FAK24b: 'El DV no corresponde al NIT del cliente',
  FAJ43b: 'El nombre del cliente no coincide con el RUT de la DIAN',
  FAD21b: 'Código de tipo de documento inválido',
  FAD06: 'Error en el rango de numeración',
  FAB25b: 'Fecha de emisión fuera de rango',
  FAJ42: 'NIT del adquiriente no se encuentra en el RUT',
  FAK26: 'Nombre o razón social del adquiriente no corresponde con el RUT',
  FAD02: 'Número de factura ya fue reportado anteriormente',
  FAD07: 'El prefijo no corresponde a la resolución de numeración',
  FAJ28: 'El tipo de documento de identificación del adquiriente no es válido',
  FAB36: 'Inconsistencia entre valores de la factura',
};

/**
 * Default pagination sizes per entity type.
 */
const ITEMS_PER_PAGE = {
  invoices: 10,
  clients: 12,
  products: 12,
  sellers: 10,
  recurring: 10,
};

/**
 * WhatsApp recharge URL — configurable in one place.
 */
const WHATSAPP_RECHARGE_URL =
  'https://wa.me/573106226041?text=Hola%2C%20quiero%20recargar%20cr%C3%A9ditos%20de%20facturaci%C3%B3n%20en%20Easy%20Bill';

export {
  STATUS_COLORS,
  STATUS_LABELS,
  FREQ_LABELS,
  selectClass,
  DEFAULT_ITEM,
  TAX_RATES,
  DIAN_ERROR_LABELS,
  ITEMS_PER_PAGE,
  WHATSAPP_RECHARGE_URL,
};
