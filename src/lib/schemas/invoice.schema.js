import { z } from 'zod';

const PAYMENT_FORMS = [
  { code: '1', label: 'Contado' },
  { code: '2', label: 'Crédito' },
];

const PAYMENT_METHODS = [
  { code: '10', label: 'Efectivo' },
  { code: '42', label: 'Consignación bancaria' },
  { code: '47', label: 'Transferencia débito bancaria' },
  { code: '48', label: 'Tarjeta crédito' },
  { code: '49', label: 'Tarjeta débito' },
  { code: 'ZZZ', label: 'Otro' },
];

const invoiceItemSchema = z.object({
  product_id: z.string().optional(),
  code_reference: z.string().min(1, 'Código requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  quantity: z.coerce.number().int().positive('Cantidad debe ser mayor a 0').max(999999, 'Cantidad máxima excedida'),
  unit_price: z.coerce.number().positive('Precio debe ser mayor a 0'),
  discount_rate: z.coerce.number().min(0).max(100).default(0),
  tax_rate: z.string().default('19.00'),
  unit_measure_id: z.coerce.number().default(70),
  standard_code_id: z.coerce.number().default(1),
  is_excluded: z.coerce.number().default(0),
  tribute_id: z.coerce.number().default(1),
});

const invoiceSchema = z.object({
  numbering_range_id: z.string({ required_error: 'Rango de numeración requerido' }).min(1, 'Rango de numeración requerido'),
  client_id: z.string({ required_error: 'Cliente requerido' }).min(1, 'Cliente requerido'),
  payment_form_code: z.string().default('1'),
  payment_method_code: z.string().default('10'),
  payment_due_date: z.string().optional(),
  observation: z.string().optional().or(z.literal('')),
  items: z.array(invoiceItemSchema).min(1, 'Agrega al menos un ítem'),
});

export { invoiceSchema, invoiceItemSchema, PAYMENT_FORMS, PAYMENT_METHODS };
