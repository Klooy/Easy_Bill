import { z } from 'zod';

const CORRECTION_CONCEPTS = [
  { code: 1, label: 'Devolución parcial de bienes / no aceptación parcial del servicio' },
  { code: 2, label: 'Anulación de factura electrónica' },
  { code: 3, label: 'Rebaja o descuento parcial o total' },
  { code: 4, label: 'Ajuste de precio' },
  { code: 5, label: 'Otros' },
];

const creditNoteItemSchema = z.object({
  product_id: z.string().optional(),
  code_reference: z.string().default(''),
  name: z.string().min(1, 'Nombre requerido'),
  quantity: z.coerce.number().int().positive('Cantidad debe ser mayor a 0'),
  unit_price: z.coerce.number().positive('Precio debe ser mayor a 0'),
  discount_rate: z.coerce.number().min(0).max(100).default(0),
  tax_rate: z.string().default('19.00'),
  unit_measure_id: z.coerce.number().default(70),
  standard_code_id: z.coerce.number().default(1),
  is_excluded: z.coerce.number().default(0),
  tribute_id: z.coerce.number().default(1),
});

const creditNoteSchema = z.object({
  invoice_id: z.string().min(1, 'Factura original requerida'),
  numbering_range_id: z.string().min(1, 'Rango de numeración requerido'),
  correction_concept_code: z.coerce.number().min(1, 'Selecciona un concepto de corrección').max(5),
  observation: z.string().optional().or(z.literal('')),
  items: z.array(creditNoteItemSchema).min(1, 'Agrega al menos un ítem'),
});

export { creditNoteSchema, creditNoteItemSchema, CORRECTION_CONCEPTS };
