import { z } from 'zod';

const FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
];

const recurringItemSchema = z.object({
  product_id: z.string().optional().or(z.literal('')),
  code_reference: z.string().default(''),
  name: z.string().min(1, 'Nombre requerido'),
  quantity: z.coerce.number().min(1, 'Mínimo 1'),
  unit_price: z.coerce.number().min(0, 'Precio no puede ser negativo'),
  discount_rate: z.coerce.number().min(0).max(100).default(0),
  tax_rate: z.string().default('19.00'),
  unit_measure_id: z.coerce.number().default(70),
  standard_code_id: z.coerce.number().default(1),
  is_excluded: z.coerce.number().default(0),
  tribute_id: z.coerce.number().default(1),
});

const recurringSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  client_id: z.string().min(1, 'Selecciona un cliente'),
  numbering_range_id: z.string().min(1, 'Selecciona un rango'),
  payment_form_code: z.enum(['1', '2']),
  payment_method_code: z.string().min(1),
  observation: z.string().optional().or(z.literal('')),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  next_run_date: z.string().min(1, 'Fecha de inicio requerida'),
  end_date: z.string().optional().or(z.literal('')),
  items: z.array(recurringItemSchema).min(1, 'Agrega al menos un producto'),
});

export { recurringSchema, recurringItemSchema, FREQUENCIES };
