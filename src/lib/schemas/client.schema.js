import { z } from 'zod';

/**
 * FACTUS identification_document_id mapping:
 * 1 = Registro Civil, 2 = Tarjeta de Identidad, 3 = Cédula de Ciudadanía,
 * 4 = Tarjeta de Extranjería, 5 = Cédula de Extranjería, 6 = NIT,
 * 7 = Pasaporte, 8 = Documento de Identificación Extranjero,
 * 9 = PEP, 10 = NIT de otro país
 */
const IDENTIFICATION_TYPES = [
  { id: 3, label: 'Cédula de Ciudadanía' },
  { id: 6, label: 'NIT' },
  { id: 5, label: 'Cédula de Extranjería' },
  { id: 7, label: 'Pasaporte' },
  { id: 1, label: 'Registro Civil' },
  { id: 2, label: 'Tarjeta de Identidad' },
  { id: 4, label: 'Tarjeta de Extranjería' },
  { id: 8, label: 'Doc. de Identificación Extranjero' },
  { id: 9, label: 'PEP' },
  { id: 10, label: 'NIT de otro país' },
];

const LEGAL_ORGANIZATIONS = [
  { id: 1, label: 'Persona Jurídica' },
  { id: 2, label: 'Persona Natural' },
];

const TRIBUTES = [
  { id: 1, label: 'IVA' },
  { id: 21, label: 'No responsable de IVA' },
];

const clientSchema = z.object({
  identification_document_id: z.coerce.number({
    required_error: 'Tipo de documento requerido',
  }).min(1, 'Tipo de documento requerido'),
  identification: z.string().min(3, 'Número de documento requerido'),
  dv: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  trade_name: z.string().optional().or(z.literal('')),
  names: z.string().min(1, 'Nombre requerido').or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  municipality_id: z.coerce.number().optional(),
  legal_organization_id: z.coerce.number({
    required_error: 'Tipo de organización requerido',
  }).min(1, 'Tipo de organización requerido'),
  tribute_id: z.coerce.number({
    required_error: 'Tributo requerido',
  }).min(1, 'Tributo requerido'),
});

export { clientSchema, IDENTIFICATION_TYPES, LEGAL_ORGANIZATIONS, TRIBUTES };
