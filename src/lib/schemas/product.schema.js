import { z } from 'zod';

const productSchema = z.object({
  code_reference: z.string().min(1, 'Código de referencia requerido'),
  name: z.string().min(2, 'Nombre requerido'),
  price: z.number().positive('El precio debe ser positivo'),
  tax_rate: z.string().default('19.00'),
  unit_measure_id: z.number().default(70),
  standard_code_id: z.number().default(1),
  is_excluded: z.number().default(0),
  tribute_id: z.number().default(1),
  description: z.string().optional(),
});

export { productSchema };
