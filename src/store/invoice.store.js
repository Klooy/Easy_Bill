import { create } from 'zustand';
import { DEFAULT_ITEM } from '@/lib/constants';

const useInvoiceStore = create((set, get) => ({
  step: 1,
  totalSteps: 4,

  // Step 1 — General
  numberingRangeId: '',
  paymentFormCode: '1',
  paymentMethodCode: '10',
  paymentDueDate: '',
  observation: '',

  // Step 2 — Client
  clientId: '',
  selectedClient: null,

  // Step 3 — Items
  items: [],

  // Computed
  isSubmitting: false,

  // Navigation
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, s.totalSteps) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  goToStep: (step) => set({ step }),

  // Step 1 setters
  setGeneral: (data) => set(data),

  // Step 2
  setClient: (clientId, selectedClient) => set({ clientId, selectedClient }),

  // Step 3 — Items
  addItem: () => set((s) => ({ items: [...s.items, { ...DEFAULT_ITEM }] })),
  removeItem: (index) => set((s) => ({
    items: s.items.filter((_, i) => i !== index),
  })),
  updateItem: (index, field, value) => set((s) => ({
    items: s.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ),
  })),
  addProductToItems: (product) => set((s) => ({
    items: [
      // Keep existing items that have ANY content (name, code, or price)
      ...s.items.filter((item) => item.name || item.code_reference || item.unit_price > 0),
      {
        product_id: product.id,
        code_reference: product.code_reference,
        name: product.name,
        quantity: 1,
        unit_price: product.price,
        discount_rate: 0,
        tax_rate: product.tax_rate,
        unit_measure_id: product.unit_measure_id,
        standard_code_id: product.standard_code_id,
        is_excluded: product.is_excluded,
        tribute_id: product.tribute_id,
      },
    ],
  })),

  // Totals — unit_price es el PRECIO BASE (sin IVA).
  // Cada producto resuelve su propio IVA: base × rate%.
  // Subtotal = suma de bases con descuento. IVA = suma de IVAs individuales.

  // Subtotal = suma de precios base después de descuento (sin IVA)
  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const gross = item.quantity * item.unit_price;
      const discount = gross * (item.discount_rate / 100);
      return sum + (gross - discount);
    }, 0);
  },

  // IVA = suma de IVA individual de cada producto
  getTaxTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      if (item.is_excluded) return sum;
      const rate = parseFloat(item.tax_rate) || 0;
      if (rate === 0) return sum;
      const gross = item.quantity * item.unit_price;
      const discount = gross * (item.discount_rate / 100);
      const taxable = gross - discount;
      return sum + (taxable * rate / 100);
    }, 0);
  },

  // Descuento sobre precios base
  getDiscountTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const gross = item.quantity * item.unit_price;
      return sum + (gross * (item.discount_rate / 100));
    }, 0);
  },

  // Total = Base con descuento + IVA de cada producto
  getTotal: () => get().getSubtotal() + get().getTaxTotal(),

  // Submit state
  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  // Reset
  reset: () => set({
    step: 1,
    numberingRangeId: '',
    paymentFormCode: '1',
    paymentMethodCode: '10',
    paymentDueDate: '',
    observation: '',
    clientId: '',
    selectedClient: null,
    items: [],
    isSubmitting: false,
  }),

  // Prefill from existing invoice (for duplicate or draft editing)
  prefill: (invoice) => {
    const items = (invoice.invoice_items || []).map((item) => ({
      product_id: item.product_id || '',
      code_reference: item.code_reference || '',
      name: item.name || '',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      discount_rate: item.discount_rate || 0,
      tax_rate: item.tax_rate || '19.00',
      unit_measure_id: item.unit_measure_id || 70,
      standard_code_id: item.standard_code_id || 1,
      is_excluded: item.is_excluded || 0,
      tribute_id: item.tribute_id || 1,
    }));

    // For draft editing, keep the numbering range; for duplicates, clear it
    const isDraft = invoice.status === 'draft';

    set({
      step: 1,
      numberingRangeId: isDraft ? (invoice.numbering_range_id || '') : '',
      paymentFormCode: invoice.payment_form_code || '1',
      paymentMethodCode: invoice.payment_method_code || '10',
      paymentDueDate: isDraft ? (invoice.payment_due_date || '') : '',
      observation: invoice.observation || '',
      clientId: invoice.client_id || '',
      selectedClient: invoice.clients || null,
      items: items.length > 0 ? items : [{ ...DEFAULT_ITEM }],
      isSubmitting: false,
    });
  },
}));

export { useInvoiceStore, DEFAULT_ITEM };
