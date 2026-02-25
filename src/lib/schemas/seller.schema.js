import { z } from 'zod';

const createSellerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener mínimo 6 caracteres'),
  company_name: z
    .string()
    .min(2, 'Nombre de empresa requerido'),
  nit: z
    .string()
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .optional()
    .or(z.literal('')),
  invoice_quota: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo')
    .default(0),
});

const assignCreditsSchema = z.object({
  quantity: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 crédito'),
  note: z
    .string()
    .optional()
    .or(z.literal('')),
});

export { createSellerSchema, assignCreditsSchema };
