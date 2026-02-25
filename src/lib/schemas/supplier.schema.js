import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  document_type: z.string().optional().or(z.literal('')),
  document_number: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

export { supplierSchema };
