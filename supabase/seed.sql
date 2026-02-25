-- =============================================
-- Easy Bill — Seed Data
-- =============================================
-- Datos de prueba para desarrollo local.
-- Ejecutar DESPUÉS de las migraciones.
--
-- Asume que el Admin (admin@easybill.co) ya existe.
-- Crea:
--   1) Vendedor demo con perfil seller
--   3) 6 clientes de prueba
--   4) 8 productos de prueba
--   5) 4 proveedores de prueba
--   6) Créditos de facturación
--   7) Rango de numeración (cache FACTUS)
--
-- IMPORTANTE: Los usuarios auth se crean vía
-- Supabase Dashboard o supabase auth admin.
-- Este seed asume que ya existen los UUIDs.
-- =============================================

-- ─────────────────────────────────────────────
-- PASO 1: Crear usuario vendedor en auth.users
-- (El admin ya existe: admin@easybill.co)
-- ─────────────────────────────────────────────

-- Seller demo user
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  role, aud, created_at, updated_at,
  confirmation_token, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'vendedor@easybill.co',
  crypt('Vendedor2024!', gen_salt('bf')),
  now(),
  '{"role": "seller", "company_name": "Comercializadora Demo SAS"}'::jsonb,
  'authenticated', 'authenticated', now(), now(),
  '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Add identity for seller
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '{"sub": "00000000-0000-0000-0000-000000000002", "email": "vendedor@easybill.co"}'::jsonb,
  'email', '00000000-0000-0000-0000-000000000002',
  now(), now(), now()
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- PASO 2: Perfil del vendedor
-- ─────────────────────────────────────────────

INSERT INTO public.sellers (
  id, company_name, nit, phone, address,
  status, invoice_quota, invoice_used,
  must_change_password, created_by
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Comercializadora Demo SAS',
  '900123456-7',
  '3001234567',
  'Cra 15 #88-32, Bogotá',
  'active',
  50,  -- 50 créditos de facturación
  3,   -- 3 ya usados (para mostrar progreso)
  false, -- No forzar cambio de contraseña en demo
  (SELECT id FROM auth.users WHERE email = 'admin@easybill.co' LIMIT 1)
)
ON CONFLICT (id) DO NOTHING;

-- Log del paquete de créditos
INSERT INTO public.invoice_packages (seller_id, quantity, assigned_by, note)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  50,
  (SELECT id FROM auth.users WHERE email = 'admin@easybill.co' LIMIT 1),
  'Paquete inicial de prueba'
);

-- ─────────────────────────────────────────────
-- PASO 3: Clientes de prueba (6)
-- ─────────────────────────────────────────────

INSERT INTO public.clients (
  seller_id, identification_document_id, identification, dv,
  company, trade_name, names, address, email, phone,
  legal_organization_id, tribute_id, municipality_id
) VALUES
  -- 1. Persona Jurídica - NIT
  (
    '00000000-0000-0000-0000-000000000002',
    6, '901234567', '7',
    'Tech Solutions Colombia SAS', 'TechCol',
    'Tech Solutions Colombia SAS',
    'Cra 7 #71-52, Torre B, Of. 805, Bogota',
    'facturacion@techcol.co', '6012345678',
    1, 21, 169
  ),
  -- 2. Persona Jurídica - NIT
  (
    '00000000-0000-0000-0000-000000000002',
    6, '800987654', '4',
    'Distribuidora Andina Ltda', 'DisAndina',
    'Distribuidora Andina Ltda',
    'Av. El Dorado #68C-61, Bogota',
    'contabilidad@disandina.com', '6019876543',
    1, 21, 169
  ),
  -- 3. Persona Natural - CC
  (
    '00000000-0000-0000-0000-000000000002',
    3, '1020304050', NULL,
    NULL, NULL,
    'Maria Fernanda Lopez Martinez',
    'Calle 85 #15-35, Apto 302, Bogota',
    'mflopez@gmail.com', '3109876543',
    2, 21, 169
  ),
  -- 4. Persona Natural - CC
  (
    '00000000-0000-0000-0000-000000000002',
    3, '79876543', NULL,
    NULL, NULL,
    'Carlos Andres Ramirez Gomez',
    'Cra 43A #1-50, Medellin',
    'carlos.ramirez@hotmail.com', '3201234567',
    2, 21, 80
  ),
  -- 5. Persona Jurídica - NIT
  (
    '00000000-0000-0000-0000-000000000002',
    6, '900555444', '3',
    'Restaurante El Buen Sabor SAS', 'El Buen Sabor',
    'Restaurante El Buen Sabor SAS',
    'Calle 10 #5-21, Cartagena',
    'admin@elbuensabor.co', '3185551234',
    1, 21, 178
  ),
  -- 6. Extranjero - Pasaporte
  (
    '00000000-0000-0000-0000-000000000002',
    7, 'AB1234567', NULL,
    'Global Trade LLC', NULL,
    'John Smith',
    '1234 Main St, Miami, FL',
    'john.smith@globaltrade.com', '+17865551234',
    1, 21, NULL
  );

-- ─────────────────────────────────────────────
-- PASO 4: Productos de prueba (8)
-- ─────────────────────────────────────────────

INSERT INTO public.products (
  seller_id, code_reference, name, description,
  price, tax_rate, unit_measure_id,
  standard_code_id, is_excluded, tribute_id, active
) VALUES
  -- Servicios de consultoría
  (
    '00000000-0000-0000-0000-000000000002',
    'SERV-001', 'Consultoría empresarial',
    'Hora de consultoría en gestión empresarial y estrategia',
    250000.00, '19.00', 70, 1, 0, 1, true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'SERV-002', 'Desarrollo de software',
    'Hora de desarrollo de aplicaciones web y móviles',
    180000.00, '19.00', 70, 1, 0, 1, true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'SERV-003', 'Diseño gráfico',
    'Hora de diseño gráfico y branding corporativo',
    120000.00, '19.00', 70, 1, 0, 1, true
  ),
  -- Productos físicos
  (
    '00000000-0000-0000-0000-000000000002',
    'PROD-001', 'Laptop HP ProBook 450',
    'Laptop empresarial HP ProBook 450 G10, 16GB RAM, 512GB SSD',
    3500000.00, '19.00', 70, 1, 0, 1, true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'PROD-002', 'Monitor Dell 27"',
    'Monitor Dell UltraSharp U2722D, 27 pulgadas, QHD',
    1850000.00, '19.00', 70, 1, 0, 1, true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'PROD-003', 'Teclado mecánico Logitech',
    'Teclado mecánico Logitech MX Mechanical, inalámbrico',
    450000.00, '19.00', 70, 1, 0, 1, true
  ),
  -- Producto excluido de IVA
  (
    '00000000-0000-0000-0000-000000000002',
    'PROD-004', 'Cuaderno ejecutivo',
    'Cuaderno ejecutivo argollado, 200 páginas',
    25000.00, '0.00', 70, 1, 1, 1, true
  ),
  -- Producto inactivo
  (
    '00000000-0000-0000-0000-000000000002',
    'PROD-005', 'Mouse inalámbrico (descontinuado)',
    'Mouse inalámbrico básico — ya no se vende',
    85000.00, '19.00', 70, 1, 0, 1, false
  );

-- ─────────────────────────────────────────────
-- PASO 5: Proveedores de prueba (4)
-- ─────────────────────────────────────────────

INSERT INTO public.suppliers (
  seller_id, name, document_type, document_number,
  email, phone, address
) VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    'Distribuciones TecnoMax SAS',
    'NIT', '900111222',
    'ventas@tecnomax.co', '6013334444',
    'Zona Industrial Fontibón, Bod 32, Bogotá'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Papelería y Suministros La Estrella',
    'NIT', '800333444',
    'pedidos@laestrella.com', '6014445555',
    'Cra 13 #26-45, Bogotá'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Importaciones GlobalTech',
    'NIT', '900666777',
    'importaciones@globaltech.co', '3176667777',
    'Calle 100 #19-54, Of. 401, Bogotá'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Juan Carlos Méndez (Freelancer)',
    'CC', '80112233',
    'jcmendez@gmail.com', '3158889999',
    'Calle 45 #23-10, Medellín'
  );

-- ─────────────────────────────────────────────
-- PASO 6: Rango de numeración (cache local)
-- ─────────────────────────────────────────────

INSERT INTO public.numbering_ranges (
  factus_id, document, prefix,
  from_number, to_number, current_number,
  resolution_number, start_date, end_date,
  technical_key, is_active
) VALUES
  (
    8,
    'Factura de Venta',
    'SETP',
    990000000, 995000000, 990000001,
    '18760000001',
    '2019-01-19',
    '2030-01-19',
    NULL,
    true
  )
ON CONFLICT (factus_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- PASO 7: Facturas de ejemplo (3)
-- Para que el dashboard muestre datos
-- ─────────────────────────────────────────────

-- Guardar IDs de clientes para referenciarlos
DO $$
DECLARE
  v_client_1 UUID;
  v_client_2 UUID;
  v_client_3 UUID;
  v_range_id UUID;
  v_invoice_1 UUID;
  v_invoice_2 UUID;
  v_invoice_3 UUID;
BEGIN
  -- Obtener IDs de clientes
  SELECT id INTO v_client_1 FROM public.clients
    WHERE identification = '901234567' AND seller_id = '00000000-0000-0000-0000-000000000002' LIMIT 1;
  SELECT id INTO v_client_2 FROM public.clients
    WHERE identification = '1020304050' AND seller_id = '00000000-0000-0000-0000-000000000002' LIMIT 1;
  SELECT id INTO v_client_3 FROM public.clients
    WHERE identification = '900555444' AND seller_id = '00000000-0000-0000-0000-000000000002' LIMIT 1;

  -- Obtener rango de numeración
  SELECT id INTO v_range_id FROM public.numbering_ranges WHERE prefix = 'SETP' LIMIT 1;

  -- Factura 1: Emitida exitosamente
  v_invoice_1 := gen_random_uuid();
  INSERT INTO public.invoices (
    id, seller_id, client_id, numbering_range_id,
    reference_code, number, status,
    subtotal, discount_total, tax_total, total,
    cufe, observation,
    payment_form_code, payment_method_code,
    validated_at, created_at
  ) VALUES (
    v_invoice_1,
    '00000000-0000-0000-0000-000000000002',
    v_client_1, v_range_id,
    'SETP-1', 'SETP1', 'issued',
    3680000.00, 0, 699200.00, 4379200.00,
    'abc123def456cufe789example0001',
    'Primera factura de prueba',
    '1', '10',
    now() - interval '5 days', now() - interval '5 days'
  );

  -- Ítems de factura 1
  INSERT INTO public.invoice_items (invoice_id, code_reference, name, quantity, unit_price, discount_rate, tax_rate, subtotal)
  VALUES
    (v_invoice_1, 'SERV-001', 'Consultoría empresarial', 8, 250000.00, 0, '19.00', 2000000.00),
    (v_invoice_1, 'SERV-002', 'Desarrollo de software', 8, 180000.00, 0, '19.00', 1440000.00),
    (v_invoice_1, 'SERV-003', 'Diseño gráfico', 2, 120000.00, 0, '19.00', 240000.00);

  -- Factura 2: Emitida
  v_invoice_2 := gen_random_uuid();
  INSERT INTO public.invoices (
    id, seller_id, client_id, numbering_range_id,
    reference_code, number, status,
    subtotal, discount_total, tax_total, total,
    cufe, observation,
    payment_form_code, payment_method_code,
    validated_at, created_at
  ) VALUES (
    v_invoice_2,
    '00000000-0000-0000-0000-000000000002',
    v_client_2, v_range_id,
    'SETP-2', 'SETP2', 'issued',
    450000.00, 45000.00, 76950.00, 481950.00,
    'abc123def456cufe789example0002',
    'Venta de accesorios',
    '1', '48',
    now() - interval '2 days', now() - interval '2 days'
  );

  -- Ítems de factura 2
  INSERT INTO public.invoice_items (invoice_id, code_reference, name, quantity, unit_price, discount_rate, tax_rate, subtotal)
  VALUES
    (v_invoice_2, 'PROD-003', 'Teclado mecánico Logitech', 1, 450000.00, 10, '19.00', 405000.00),
    (v_invoice_2, 'PROD-004', 'Cuaderno ejecutivo', 2, 25000.00, 10, '0.00', 45000.00);

  -- Factura 3: Borrador (no enviada a FACTUS)
  v_invoice_3 := gen_random_uuid();
  INSERT INTO public.invoices (
    id, seller_id, client_id, numbering_range_id,
    reference_code, status,
    subtotal, discount_total, tax_total, total,
    observation,
    payment_form_code, payment_method_code,
    created_at
  ) VALUES (
    v_invoice_3,
    '00000000-0000-0000-0000-000000000002',
    v_client_3, v_range_id,
    'SETP-3', 'draft',
    3500000.00, 0, 665000.00, 4165000.00,
    'Pedido pendiente de aprobación',
    '2', '42',
    now() - interval '1 day'
  );

  -- Ítems de factura 3
  INSERT INTO public.invoice_items (invoice_id, code_reference, name, quantity, unit_price, discount_rate, tax_rate, subtotal)
  VALUES
    (v_invoice_3, 'PROD-001', 'Laptop HP ProBook 450', 1, 3500000.00, 0, '19.00', 3500000.00);

END $$;

-- ─────────────────────────────────────────────
-- Resumen de credenciales de prueba:
-- ─────────────────────────────────────────────
-- Admin:    admin@easybill.co     (ya existente)
-- Vendedor: vendedor@easybill.co  / Vendedor2024!
-- ─────────────────────────────────────────────
