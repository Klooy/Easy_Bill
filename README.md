# 🧾 Easy Bill

**Sistema SaaS de facturación electrónica para Colombia** integrado con la API de [FACTUS](https://factus.com.co) (DIAN).

Plataforma multi-tenant donde un **Super Admin** incorpora **Vendedores** que gestionan clientes, productos, proveedores y emiten facturas electrónicas validadas ante la DIAN. El modelo de negocio se basa en paquetes/créditos de facturas. No existe registro público — solo el admin puede crear cuentas.

---

## 📋 Tabla de contenidos

- [Roles del sistema](#-roles-del-sistema)
- [Stack tecnológico](#-stack-tecnológico)
- [Arquitectura del proyecto](#-arquitectura-del-proyecto)
- [Setup local](#-setup-local)
- [Variables de entorno](#-variables-de-entorno)
- [Funcionalidades implementadas](#-funcionalidades-implementadas)
- [Flujo de facturación electrónica](#-flujo-de-facturación-electrónica)
- [Rutas de la aplicación](#-rutas-de-la-aplicación)
- [Base de datos](#-base-de-datos)
- [Edge Functions (Backend)](#-edge-functions-backend)
- [Sistema de diseño](#-sistema-de-diseño)
- [Estado global (Zustand)](#-estado-global-zustand)
- [Servicios y hooks](#-servicios-y-hooks)
- [Validación de datos (Zod)](#-validación-de-datos-zod)
- [Seguridad](#-seguridad)
- [Performance y optimización](#-performance-y-optimización)
- [Despliegue](#-despliegue)
- [Roadmap de escalabilidad](#-roadmap-de-escalabilidad)
- [Convenciones de código](#-convenciones-de-código)
- [Estado del proyecto](#-estado-del-proyecto)

---

## 👥 Roles del sistema

| Rol | Acceso |
|-----|--------|
| **Super Admin** | Crea vendedores, asigna créditos de facturación, suspende/reactiva cuentas, ve métricas globales, gestiona rangos de numeración DIAN |
| **Vendedor** | Gestiona su catálogo (clientes, productos, proveedores), emite facturas electrónicas, notas crédito, configura recurrencias, ve su dashboard personal |

> No existe registro público. El admin crea cada vendedor con credenciales temporales y el vendedor debe cambiar su contraseña al primer ingreso.

---

## 🛠 Stack tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Framework** | React + Vite | 19.2 / 7.3.1 | SPA con HMR ultrarrápido |
| **Estilos** | Tailwind CSS + shadcn/ui | 3.4 | Utility-first CSS + componentes accesibles |
| **Estado global** | Zustand | 4.5.7 | Stores mínimos sin boilerplate |
| **Formularios** | React Hook Form + Zod | 7.71 / 3.25 | Validación declarativa + schemas reutilizables |
| **Routing** | React Router | 6.30 | Rutas protegidas por rol con lazy loading |
| **Backend** | Supabase | 2.96 | Auth (JWT), PostgreSQL + RLS, Edge Functions (Deno) |
| **Gráficas** | Recharts | 3.7.0 | ComposedChart (barras + líneas), tooltips custom |
| **Toasts** | Sileo | 0.1.4 | Notificaciones con botones nativos |
| **Iconos** | Lucide React | 0.574 | ~25 iconos usados del set |
| **Deploy** | Vercel | CI/CD | Build automático desde Git |

### Dependencias adicionales

| Paquete | Uso |
|---------|-----|
| `@radix-ui/*` | Primitivas accesibles (Dialog, Select, Label, Separator) |
| `class-variance-authority` | Variantes de componentes (shadcn/ui) |
| `clsx` + `tailwind-merge` | Helper `cn()` para clases condicionales |

---

## 📁 Arquitectura del proyecto

```
easy-bill/
├── .env.local                          # Variables locales (NO commitear)
├── package.json
├── vite.config.js                      # Alias @/ → src/
├── tailwind.config.js                  # Paleta custom, fonts, tokens de diseño
├── components.json                     # Config shadcn/ui
├── index.html                          # Google Fonts (Outfit, Jakarta Sans, JetBrains Mono)
│
├── supabase/                           # ── BACKEND ──
│   ├── config.toml
│   ├── seed.sql
│   ├── migrations/                     # 7 migraciones SQL
│   │   ├── 001_initial_schema.sql      # Tablas core (sellers, clients, products, suppliers, invoices, items)
│   │   ├── 002_rls_policies.sql        # Row-Level Security multi-tenant
│   │   ├── 003_sellers_quota.sql       # Funciones PL/pgSQL de créditos
│   │   ├── 004_credit_notes.sql        # Soporte notas crédito DIAN
│   │   ├── 005_recurring_invoices.sql  # Facturas recurrentes
│   │   ├── 006_municipalities_cache.sql # Caché municipios Colombia + pg_trgm
│   │   └── 007_tributes_and_units.sql  # Tributos y unidades de medida DIAN
│   └── functions/                      # 19 Edge Functions (Deno/TypeScript)
│       ├── _shared/                    # Utilidades compartidas
│       │   ├── cors.ts                 # Headers CORS
│       │   ├── auth-guard.ts           # Verificación JWT + estado vendedor
│       │   └── factus-token.ts         # OAuth token management con cache en BD
│       ├── admin-create-seller/        # Crear vendedores (service role)
│       ├── factus-auth/                # OAuth2 con FACTUS
│       ├── factus-invoice/             # Crear/validar factura directa ante DIAN
│       ├── factus-emit/                # Emitir borrador a DIAN
│       ├── factus-credit-note/         # Notas crédito ante DIAN
│       ├── factus-bills/               # Consultar facturas FACTUS
│       ├── factus-bill-show/           # Detalle de factura específica
│       ├── factus-delete-bill/         # Eliminar borrador
│       ├── factus-ranges/              # Rangos de numeración DIAN
│       ├── factus-ranges-manage/       # Gestión de rangos (admin)
│       ├── factus-pdf/                 # Descarga PDF de factura
│       ├── factus-municipalities/      # Búsqueda municipios colombianos
│       ├── factus-tributes/            # Catálogo de tributos DIAN
│       ├── factus-units/               # Unidades de medida DIAN
│       ├── factus-radian-emit/         # Eventos RADIAN
│       ├── factus-radian-events/       # Consulta eventos RADIAN
│       ├── factus-send-credit-note-email/ # Email nota crédito
│       └── send-invoice-email/         # Envío factura por email (Resend)
│
└── src/                                # ── FRONTEND ──
    ├── main.jsx                        # Entry point
    ├── App.jsx                         # Router + lazy loading + ErrorBoundary + Toaster
    ├── index.css                       # Tema custom, animaciones, scrollbar, @keyframes
    │
    ├── lib/                            # Utilidades y configuración
    │   ├── supabase.js                 # Cliente Supabase (VITE_SUPABASE_URL + ANON_KEY)
    │   ├── utils.js                    # Helper cn() (clsx + tailwind-merge)
    │   ├── constants.js                # Constantes del sistema (estados, ítems, errores DIAN, paginación)
    │   ├── format.js                   # formatCurrency, formatCurrencyCompact, formatDate
    │   ├── export.js                   # Exportación CSV sin dependencias externas
    │   └── schemas/                    # 8 schemas Zod (validación + futuros DTOs NestJS)
    │       ├── auth.schema.js
    │       ├── client.schema.js
    │       ├── product.schema.js
    │       ├── supplier.schema.js
    │       ├── invoice.schema.js
    │       ├── credit-note.schema.js
    │       ├── recurring.schema.js
    │       └── seller.schema.js
    │
    ├── store/                          # Zustand stores
    │   ├── auth.store.js               # Sesión, rol, cuota, isAdmin/isSeller
    │   ├── invoice.store.js            # Estado del wizard de factura (4 pasos)
    │   └── theme.store.js              # Dark mode (localStorage + prefers-color-scheme)
    │
    ├── hooks/                          # 10 custom hooks
    │   ├── useAuth.js                  # Listener de sesión Supabase
    │   ├── useClients.js               # CRUD clientes
    │   ├── useProducts.js              # CRUD productos
    │   ├── useSuppliers.js             # CRUD proveedores
    │   ├── useInvoices.js              # Facturas + dashboard stats + monthly + top clients
    │   ├── useSellers.js               # Admin: CRUD vendedores
    │   ├── useSellerQuota.js           # Cuota del vendedor logueado
    │   ├── useNumberingRanges.js       # Rangos de numeración DIAN
    │   ├── useRecurring.js             # Facturas recurrentes
    │   └── useDebounce.js              # Debounce genérico para búsquedas
    │
    ├── services/                       # 8 servicios (capa de datos)
    │   ├── auth.service.js             # signIn, signOut, changePassword, resetPassword
    │   ├── clients.service.js          # CRUD + búsqueda
    │   ├── products.service.js         # CRUD + búsqueda
    │   ├── suppliers.service.js        # CRUD + búsqueda
    │   ├── invoices.service.js         # CRUD + stats + getMonthlyStats + getTopClients
    │   ├── sellers.service.js          # Admin: CRUD + créditos + suspend/reactivate
    │   ├── factus.service.js           # Proxy a Edge Functions FACTUS
    │   └── recurring.service.js        # CRUD facturas recurrentes
    │
    ├── components/
    │   ├── ui/                         # 9 componentes shadcn/ui (auto-generados, no editar)
    │   │   ├── badge.jsx
    │   │   ├── button.jsx
    │   │   ├── card.jsx
    │   │   ├── dialog.jsx
    │   │   ├── input.jsx
    │   │   ├── label.jsx
    │   │   ├── select.jsx
    │   │   ├── separator.jsx
    │   │   └── textarea.jsx
    │   │
    │   ├── layout/                     # Componentes de layout
    │   │   ├── AppLayout.jsx           # Sidebar + Main + BottomNav (responsive)
    │   │   ├── Sidebar.jsx             # Sidebar colapsable con toggle (md+)
    │   │   ├── BottomNav.jsx           # Navegación inferior mobile con FAB central
    │   │   └── Topbar.jsx              # Barra superior mobile (logo + cuota + avatar)
    │   │
    │   ├── common/                     # 13 componentes reutilizables
    │   │   ├── ConfirmDialog.jsx       # Diálogo de confirmación con variantes (danger, warning)
    │   │   ├── CredentialsSummary.jsx  # Resumen de credenciales al crear vendedor
    │   │   ├── EmissionOverlay.jsx     # Overlay fullscreen durante emisión DIAN
    │   │   ├── EmptyState.jsx          # Estado vacío con anillos decorativos
    │   │   ├── ErrorBoundary.jsx       # Catch de errores React + vista de recuperación
    │   │   ├── LoadingSpinner.jsx      # Spinner de carga inicial
    │   │   ├── MunicipalitySearch.jsx  # Búsqueda fuzzy de municipios colombianos
    │   │   ├── Pagination.jsx          # Paginación reutilizable
    │   │   ├── ProtectedRoute.jsx      # Guard de ruta por rol (admin/seller)
    │   │   ├── ScrollToTop.jsx         # Auto-scroll al cambiar de ruta
    │   │   ├── SectionHeader.jsx       # Header de sección con breadcrumb
    │   │   ├── Skeleton.jsx            # Skeleton loading (cards, charts, grids, tables)
    │   │   └── StatusBadge.jsx         # Badge de estado con colores semánticos
    │   │
    │   └── invoice/                    # Componentes del wizard de factura
    │       ├── StepIndicator.jsx       # Indicador visual de paso (stepper)
    │       ├── StepGeneral.jsx         # Paso 1: Rango, método de pago, observación
    │       ├── StepClient.jsx          # Paso 2: Selección/creación de cliente
    │       ├── StepItems.jsx           # Paso 3: Ítems, cantidades, precios, IVA
    │       ├── StepSummary.jsx         # Paso 4: Resumen final + emit
    │       ├── InlineClientForm.jsx    # Formulario de cliente inline dentro del wizard
    │       ├── FactusBillDialog.jsx    # Diálogo de detalle factura FACTUS
    │       ├── RadianEventsSection.jsx # Sección de eventos RADIAN en detalle
    │       └── parseDianErrors.js      # Parser de errores DIAN a mensajes amigables
    │
    └── pages/
        ├── auth/                       # 3 páginas de autenticación
        │   ├── LoginPage.jsx           # Login con panel de branding (layout dividido)
        │   ├── ChangePasswordPage.jsx  # Cambio de contraseña obligatorio (primer login)
        │   └── ForgotPasswordPage.jsx  # Recuperar contraseña via email
        │
        ├── admin/                      # 6 páginas de administración
        │   ├── AdminDashboard.jsx      # Métricas globales: vendedores, facturas, ingresos
        │   ├── SellersListPage.jsx     # Lista de vendedores con búsqueda y filtros
        │   ├── SellerCreatePage.jsx    # Crear vendedor + credenciales temporales
        │   ├── SellerDetailPage.jsx    # Detalle vendedor: cuota, historial, suspender
        │   ├── AdminInvoicesPage.jsx   # Vista global de todas las facturas
        │   └── AdminRangesPage.jsx     # Gestión de rangos de numeración DIAN
        │
        ├── seller/                     # 16 páginas de vendedor
        │   ├── DashboardPage.jsx       # Dashboard: créditos, stats, quick actions, charts
        │   ├── ClientsPage.jsx         # Lista de clientes con búsqueda
        │   ├── ClientFormPage.jsx      # Crear/editar cliente (con municipio)
        │   ├── ProductsPage.jsx        # Lista de productos con búsqueda
        │   ├── ProductFormPage.jsx     # Crear/editar producto (precio, IVA, código)
        │   ├── SuppliersPage.jsx       # Lista de proveedores
        │   ├── SupplierFormPage.jsx    # Crear/editar proveedor
        │   ├── InvoicesPage.jsx        # Lista facturas con filtros por estado
        │   ├── NewInvoicePage.jsx      # Wizard de 4 pasos para nueva factura
        │   ├── InvoiceDetailPage.jsx   # Detalle factura: CUFE, QR, PDF, email, RADIAN
        │   ├── CreditNotePage.jsx      # Emisión de nota crédito DIAN
        │   ├── RecurringInvoicesPage.jsx # Lista facturas recurrentes
        │   ├── RecurringFormPage.jsx   # Crear/editar plantilla recurrente
        │   ├── RecurringDetailPage.jsx # Detalle de recurrencia + historial
        │   ├── MorePage.jsx            # Menú overflow mobile (opciones adicionales)
        │   └── SettingsPage.jsx        # Configuración del perfil vendedor
        │
        └── common/
            └── NotFoundPage.jsx        # 404
```

---

## 🚀 Setup local

### Prerrequisitos

- **Node.js** ≥ 18
- **npm** ≥ 9
- Cuenta en [Supabase](https://supabase.com) (proyecto creado)
- Credenciales de [FACTUS API](https://factus.com.co) (sandbox o producción)

### Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd easy-bill

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las URLs y keys de Supabase

# 4. Ejecutar migraciones en Supabase
# (desde el dashboard de Supabase o con CLI)
npx supabase db push

# 5. Desplegar Edge Functions
npx supabase functions deploy --project-ref <PROJECT_REF>

# 6. Configurar secrets de Edge Functions
npx supabase secrets set \
  FACTUS_API_URL=https://api-sandbox.factus.com.co \
  FACTUS_CLIENT_ID=... \
  FACTUS_CLIENT_SECRET=... \
  FACTUS_EMAIL=... \
  FACTUS_PASSWORD=... \
  RESEND_API_KEY=... \
  --project-ref <PROJECT_REF>

# 7. Desarrollo local
npm run dev
```

### Scripts disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `vite --host` | Dev server con HMR (accesible en red local) |
| `build` | `vite build` | Build de producción (output en `dist/`) |
| `lint` | `eslint .` | Lint del código |
| `preview` | `vite preview` | Preview del build local |

---

## 🔐 Variables de entorno

### Frontend (`.env.local`) — solo variables públicas

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Edge Functions (Supabase Secrets) — credenciales privadas

```env
FACTUS_API_URL=https://api-sandbox.factus.com.co
FACTUS_CLIENT_ID=<client_id>
FACTUS_CLIENT_SECRET=<client_secret>
FACTUS_EMAIL=<factus_email>
FACTUS_PASSWORD=<factus_password>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
RESEND_API_KEY=<resend_api_key>
```

> ⚠️ **FACTUS_CLIENT_SECRET**, **SUPABASE_SERVICE_ROLE_KEY** y **RESEND_API_KEY** solo existen como secrets en Edge Functions. El frontend **nunca** tiene acceso a ellas.

---

## ✅ Funcionalidades implementadas

### Autenticación y roles

- Login con Supabase Auth (JWT + role en `raw_user_meta_data`)
- Cambio de contraseña obligatorio en primer acceso (`must_change_password`)
- Recuperación de contraseña vía email
- Rutas protegidas por rol con `<ProtectedRoute allowedRoles={[...]} />`
- Redirección automática a `/admin` o `/dashboard` según rol
- Sesión persistente con listener `onAuthStateChange`

### Panel Super Admin

- **Dashboard global** — vendedores activos, totales de facturas, ingresos acumulados, facturas este mes
- **CRUD vendedores** — crear con email + contraseña temporal (credenciales mostrables en diálogo), suspender/reactivar, ver detalle
- **Asignación de créditos** — paquetes de N créditos con nota, historial completo
- **Vista global de facturas** — todas las facturas de todos los vendedores, con filtros
- **Gestión de rangos** — consultar y administrar rangos de numeración DIAN

### Panel Vendedor

- **Dashboard personal:**
  - Saludo contextual con hora del día (Buenos días/tardes/noches + ícono)
  - **Quick Actions** — botones directos: Nueva Factura, Nuevo Cliente, Nuevo Producto, Ver Facturas
  - **Flip card de créditos** — animación 3D con shine sweep, barra de progreso, reverso con botón WhatsApp para recargas
  - **4 stat cards** con delta mensual (+N este mes)
  - **Gráfica de ventas mensuales** — ComposedChart (barras de ingresos + línea de conteo), summary stats (total, promedio por factura, variación %), dual YAxis
  - **Top 5 clientes** — lista rankeada con posición, barra de progreso relativa, monto compacto
  - **Facturas recientes** con número, cliente, fecha, monto y badge de estado
- **Clientes** — CRUD completo, tipos de documento (NIT, CC, CE, PAS, TE, DIE, NIT de otro país), DV automático, búsqueda de municipio colombiano con fuzzy search
- **Productos** — CRUD, código de referencia, precio, IVA configurable (0%, 5%, 8%, 19%), unidad de medida DIAN, código estándar, tributo
- **Proveedores** — CRUD, datos de contacto
- **Facturación electrónica:**
  - **Wizard 4 pasos** (General → Cliente → Ítems → Resumen)
  - Selección de rango de numeración DIAN (obtenidos en tiempo real de FACTUS)
  - Creación de cliente inline dentro del wizard
  - Cálculo automático de subtotal, descuentos, IVA, total
  - Conversión automática de precios base a IVA-inclusive para FACTUS API
  - Emisión directa o guardar como borrador
  - Emisión de borradores posteriormente
  - Overlay fullscreen durante emisión con animación
  - Reintento automático en conflictos DIAN (409) con backoff exponencial
  - Descarga de **PDF** desde FACTUS
  - **Envío por email** vía Resend
  - **Duplicar factura** existente como nuevo borrador
  - **Eliminar borradores**
  - Vista detalle con todos los datos DIAN: CUFE, QR, fechas, desglose de ítems
  - **Eventos RADIAN** — consulta de eventos de acuse de recibo
- **Notas crédito DIAN:**
  - 5 conceptos de corrección oficiales (devolución, anulación, rebaja, ajuste, otros)
  - Vinculación a factura original
  - Selección de ítems a ajustar con cantidades/precios parciales
  - Envío a DIAN vía FACTUS
  - Envío por email de nota crédito
- **Facturas recurrentes:**
  - Crear plantillas con frecuencia (semanal, quincenal, mensual)
  - Seleccionar cliente y definir ítems template (JSONB)
  - Activar/desactivar recurrencia
  - Tracking de próxima ejecución (`next_run_date`)
  - Historial de ejecuciones
  - CRUD completo + vista detalle
- **Configuración** — perfil del vendedor, tema
- **Exportación CSV** — facturas y otros listados

### 🌙 Modo oscuro

- Toggle en Sidebar (desktop) y Topbar (mobile) con iconos Sun/Moon
- Persistencia en `localStorage`
- Respeta `prefers-color-scheme` del sistema en primera visita
- Cobertura completa: layout, cards, charts, tablas, formularios, modales, toasts, scrollbar, skeletons

### 📱 Mobile First

- Sidebar oculta en mobile → Bottom Nav con 5 ítems y FAB central morado
- Sidebar **colapsable** en desktop con botón toggle (68px / 248px)
- Página "Más" para opciones overflow en mobile
- Topbar mobile con logo + chip de cuota + avatar
- Modales y forms optimizados para pantalla táctil (min 44px targets)
- Formularios: 1 columna en mobile, 2 columnas desde `md:`
- Tablas con `overflow-x-auto` en mobile
- Dashboard: grid adaptativo (flip card + stats en una fila en `lg:`)

---

## 🔄 Flujo de facturación electrónica

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│                                                              │
│  Wizard 4 pasos → buildPayload() → factusService.create()   │
│       ↓                                                      │
│  Opción A: Emitir directamente → POST /factus-invoice        │
│  Opción B: Guardar borrador → INSERT en Supabase             │
│       ↓ (luego desde detalle)                                │
│  Emitir borrador → POST /factus-emit                         │
└─────────────┬───────────────────────────────────────────────┘
              │ HTTPS (JWT en header)
              ▼
┌─────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION (Deno/TypeScript)                  │
│                                                              │
│  1. verifyAuth(req) → JWT válido + seller activo             │
│  2. check_seller_can_invoice() → créditos > 0                │
│  3. getFactusToken() → OAuth cache/refresh                   │
│  4. Convertir items: base price → IVA-inclusive               │
│  5. POST → FACTUS API /v1/bills/validate                     │
│  6. Si 409 (conflict DIAN) → retry con backoff (hasta 3x)    │
│  7. Si OK → consume_invoice_credit()                         │
│  8. INSERT/UPDATE invoice en Supabase                        │
│  9. Retornar resultado al frontend                           │
└─────────────┬───────────────────────────────────────────────┘
              │ HTTPS (OAuth2 Bearer)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API FACTUS (DIAN)                          │
│                                                              │
│  • Valida la factura ante la DIAN                            │
│  • Retorna: CUFE, número, QR URL, link PDF                   │
│  • Errores tipificados (FAK24, FAD02, FAJ43b, etc.)          │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de créditos

```
Admin asigna N créditos → assign_invoice_credits() → sellers.invoice_quota += N
                                                    → invoice_packages INSERT (log)

Vendedor emite factura → check_seller_can_invoice() → ¿quota > 0?
                         └─ Si no → 403 "Sin créditos"
                         └─ Si ok → consume_invoice_credit()
                                   → sellers.invoice_quota -= 1
                                   → sellers.invoice_used += 1
```

---

## 🗺 Rutas de la aplicación

### Públicas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | LoginPage | Autenticación con panel de branding |
| `/forgot-password` | ForgotPasswordPage | Recuperar contraseña |
| `/change-password` | ChangePasswordPage | Cambio obligatorio (primer login) |

### Admin (protegidas — `role: admin`)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/admin` | AdminDashboard | Dashboard global |
| `/admin/sellers` | SellersListPage | Lista de vendedores |
| `/admin/sellers/new` | SellerCreatePage | Crear vendedor |
| `/admin/sellers/:id` | SellerDetailPage | Detalle + créditos + suspender |
| `/admin/invoices` | AdminInvoicesPage | Todas las facturas |
| `/admin/ranges` | AdminRangesPage | Rangos de numeración DIAN |

### Vendedor (protegidas — `role: seller`)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/dashboard` | DashboardPage | Dashboard personal |
| `/clients` | ClientsPage | Lista de clientes |
| `/clients/new` | ClientFormPage | Crear cliente |
| `/clients/:id/edit` | ClientFormPage | Editar cliente |
| `/products` | ProductsPage | Lista de productos |
| `/products/new` | ProductFormPage | Crear producto |
| `/products/:id/edit` | ProductFormPage | Editar producto |
| `/suppliers` | SuppliersPage | Lista proveedores |
| `/suppliers/new` | SupplierFormPage | Crear proveedor |
| `/suppliers/:id/edit` | SupplierFormPage | Editar proveedor |
| `/invoices` | InvoicesPage | Lista facturas (filtros por estado) |
| `/invoices/new` | NewInvoicePage | Wizard nueva factura |
| `/invoices/:id` | InvoiceDetailPage | Detalle + PDF + email + RADIAN |
| `/invoices/:id/credit-note` | CreditNotePage | Nota crédito DIAN |
| `/recurring` | RecurringInvoicesPage | Facturas recurrentes |
| `/recurring/new` | RecurringFormPage | Crear recurrente |
| `/recurring/:id` | RecurringDetailPage | Detalle recurrente |
| `/recurring/:id/edit` | RecurringFormPage | Editar recurrente |
| `/more` | MorePage | Menú mobile overflow |
| `/settings` | SettingsPage | Configuración |

---

## 🗄 Base de datos

### Modelo de datos

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   sellers     │────<│ invoice_packages  │     │  numbering   │
│              │     └──────────────────┘     │   _ranges    │
│  id (PK=uid) │                               └──────────────┘
│  company_name│─────────┬──────────┬──────────┐
│  nit         │         │          │          │  ┌──────────────┐
│  status      │    ┌────┴───┐ ┌────┴───┐ ┌───┴───┐│factus_tokens│
│  invoice_quota│   │clients │ │products│ │suppliers│ (1 row)     │
│  invoice_used│    └────┬───┘ └────┬───┘ └────────┘└──────────────┘
└──────────────┘         │          │
                    ┌────┴──────────┴────┐     ┌──────────────────┐
                    │     invoices       │────<│  invoice_items    │
                    │                    │     └──────────────────┘
                    │  document_type:    │
                    │   invoice |        │     ┌──────────────────┐
                    │   credit_note |    │     │ recurring_invoices│
                    │   debit_note       │     │  (templates)     │
                    │  related_invoice_id├──┐  └──────────────────┘
                    └────────────────────┘  │
                         ↑_________________│
```

### Tablas

| Tabla | Filas típicas | Tenant key | Descripción |
|-------|--------------|------------|-------------|
| `sellers` | Decenas | `id` (= auth.uid) | Perfiles vendedores, cuota, estado |
| `invoice_packages` | Cientos | `seller_id` | Historial de créditos asignados |
| `clients` | Miles | `seller_id` | Clientes con datos DIAN (NIT, DV, organización) |
| `products` | Cientos | `seller_id` | Catálogo con precios, IVA, unidad de medida |
| `suppliers` | Decenas | `seller_id` | Proveedores (referencia interna) |
| `invoices` | Miles | `seller_id` | Facturas + notas crédito (CUFE, QR, PDF, payload JSON) |
| `invoice_items` | Miles | vía `invoice_id` | Líneas de cada factura |
| `recurring_invoices` | Decenas | `seller_id` | Plantillas recurrentes (items JSONB) |
| `numbering_ranges` | ~10 | — (global) | Caché rangos DIAN/FACTUS |
| `factus_tokens` | 1 | — (global) | Token OAuth FACTUS con `expires_at` |
| `municipalities` | ~1,123 | — (global) | Municipios Colombia con búsqueda trigram |
| `tributes` | ~10 | — (global) | Tributos DIAN (IVA, IC, ICA) |
| `measurement_units` | ~80 | — (global) | Unidades de medida DIAN |

### Funciones PL/pgSQL

| Función | Tipo | Descripción |
|---------|------|-------------|
| `is_admin()` | Helper | Verifica si el usuario actual es admin |
| `assign_invoice_credits()` | Procedure | Asigna N créditos + log en `invoice_packages` |
| `consume_invoice_credit()` | Procedure | Descuenta 1 crédito (con `FOR UPDATE` lock) |
| `check_seller_can_invoice()` | Query | Verifica estado + cuota antes de emitir |
| `suspend_seller()` | Procedure | Suspende vendedor con timestamp y quién |
| `reactivate_seller()` | Procedure | Reactiva vendedor (limpia `suspended_at`) |
| `handle_updated_at()` | Trigger | Auto-actualiza `updated_at` en UPDATE |

### Row-Level Security (RLS)

- **Patrón multi-tenant:** Cada vendedor solo ve datos donde `seller_id = auth.uid()`
- **Admin bypass:** Acceso completo via `is_admin()`
- **Datos de referencia:** `municipalities`, `tributes`, `measurement_units` → SELECT para todos los autenticados
- **Edge Functions:** Usan `SUPABASE_SERVICE_ROLE_KEY` para bypass cuando es necesario (ej: crear vendedor)

### Migraciones

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `001_initial_schema.sql` | 8 tablas core + 10 índices + trigger `updated_at` |
| 2 | `002_rls_policies.sql` | RLS en 8 tablas + función `is_admin()` + 15 policies |
| 3 | `003_sellers_quota.sql` | 5 funciones PL/pgSQL para gestión de créditos |
| 4 | `004_credit_notes.sql` | `document_type`, `related_invoice_id`, `correction_concept_code` en invoices |
| 5 | `005_recurring_invoices.sql` | Tabla `recurring_invoices` + RLS |
| 6 | `006_municipalities_cache.sql` | Tabla `municipalities` + extensión `pg_trgm` + índices GIN |
| 7 | `007_tributes_and_units.sql` | Tablas `tributes` y `measurement_units` |

---

## ⚡ Edge Functions (Backend)

19 funciones Deno/TypeScript desplegadas en Supabase, organizadas como proxy seguro hacia la API FACTUS:

### Funciones principales

| Función | Método | Auth | Descripción |
|---------|--------|------|-------------|
| `factus-auth` | POST | — | OAuth2 password grant con FACTUS |
| `factus-invoice` | POST | JWT | Crear factura directa y validar ante DIAN |
| `factus-emit` | POST | JWT | Emitir borrador guardado ante DIAN |
| `factus-credit-note` | POST | JWT | Emitir nota crédito ante DIAN |
| `factus-bills` | GET | JWT | Listar facturas desde FACTUS |
| `factus-bill-show` | GET | JWT | Detalle de una factura desde FACTUS |
| `factus-delete-bill` | DELETE | JWT | Eliminar borrador en FACTUS |
| `factus-pdf` | GET | JWT | Descargar PDF de factura |
| `factus-ranges` | GET | JWT | Obtener rangos de numeración DIAN |
| `factus-ranges-manage` | POST | JWT+Admin | Gestión de rangos (admin) |
| `factus-municipalities` | GET | JWT | Búsqueda de municipios colombianos |
| `factus-tributes` | GET | JWT | Catálogo de tributos DIAN |
| `factus-units` | GET | JWT | Unidades de medida DIAN |
| `factus-radian-emit` | POST | JWT | Emitir evento RADIAN |
| `factus-radian-events` | GET | JWT | Consultar eventos RADIAN |
| `send-invoice-email` | POST | JWT | Enviar factura por email (Resend) |
| `factus-send-credit-note-email` | POST | JWT | Enviar nota crédito por email |
| `admin-create-seller` | POST | Service Role | Crear vendedor (solo admin) |

### Utilidades compartidas (`_shared/`)

| Archivo | Descripción |
|---------|-------------|
| `cors.ts` | Headers CORS (`Access-Control-Allow-Origin: *`) + CORS preflight handler |
| `auth-guard.ts` | Extrae JWT del header `Authorization`, valida usuario, obtiene perfil del seller, verifica estado (activo/suspendido) |
| `factus-token.ts` | Gestión de token OAuth FACTUS: lee de cache en BD (`factus_tokens`), valida expiración, refresh automático, backoff en caso de error, escribe nuevo token en BD |

### Patrón de Edge Function

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, seller } = await verifyAuth(req);  // 1. JWT + perfil
    const token = await getFactusToken();              // 2. OAuth cache
    // 3. Lógica de negocio...
    // 4. Llamada a FACTUS API
    // 5. Persistir resultado en Supabase
    return new Response(JSON.stringify({ success: true, data }), { ... });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, ... });
  }
});
```

---

## 🎨 Sistema de diseño

### Paleta de colores

| Token | Hex | Uso |
|-------|-----|-----|
| `primary-50` | `#FAF5FF` | Fondos suaves, cards destacadas |
| `primary-100` | `#F3E8FF` | Fondos de íconos, badges, hover |
| `primary-200` | `#E9D5FF` | Bordes activos, focus ring |
| `primary-300` | `#D8B4FE` | Bordes más intensos |
| `primary-400` | `#A78BFA` | Texto secundario activo |
| `primary-500` | `#7C3AED` | **Color principal**: botones, nav activo, acentos |
| `primary-600` | `#6D28D9` | Hover de botones |
| `primary-700` | `#5B21B6` | Gradientes, sidebar oscura |
| `primary-800` | `#4C1D95` | Gradientes profundos |
| `primary-900` | `#3B0764` | Fondo de badges en dark mode |

### Tipografía

| Familia | Peso | Uso |
|---------|------|-----|
| **Outfit** | 400-700 | Títulos, stats, logo, números grandes |
| **Plus Jakarta Sans** | 400-600 | Cuerpo, tablas, labels, descripciones |
| **JetBrains Mono** | 400-500 | # factura, NIT, CUFE, códigos, reference_code |

### Tokens de diseño

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-card` | `14px` | Cards, modales, sidebar |
| `rounded-input` | `9px` | Inputs, botones, badges pequeños |
| `rounded-badge` | `6px` | Badges, chips, status indicators |
| `shadow-card` | Purple-tinted 8% | Sombra por defecto de cards |
| `shadow-card-hover` | Purple-tinted 15% | Hover de cards |
| `shadow-primary-md` | Purple-tinted 25% | Botones primarios |
| `shadow-primary-lg` | Purple-tinted 30% | Elementos elevados |

### Animaciones (9 keyframes custom)

| Animación | Duración | Uso |
|-----------|----------|-----|
| `fade-in-up` | 0.4s | Entrada de páginas y cards |
| `fade-in` | 0.3s | Entrada sutil |
| `slide-in-right` | 0.4s | Entrada lateral (mobile) |
| `scale-in` | 0.3s | Modales y popups |
| `skeleton-pulse` | 1.8s ∞ | Loading skeleton |
| `bounce-in` | 0.6s | FAB button mount |
| `shimmer` | 2s ∞ | Skeleton gradient sweep |
| `ping-slow` | 2.5s ∞ | Status dot pulse |
| `emission-*` | varias | Overlay de emisión DIAN (ping, breathe, shimmer) |

### Stagger classes

```css
.stagger-1  { animation-delay: 50ms; }
.stagger-2  { animation-delay: 100ms; }
...
.stagger-12 { animation-delay: 600ms; }
```

### Efectos especiales

- **Card shine sweep** — `linear-gradient` animado con `card-shine 4s ease-in-out infinite`
- **Flip card 3D** — `perspective: 1000px` + `transform: rotateY(180deg)` con `backface-visibility: hidden`
- **Title accent** — `::after` pseudo-element con gradiente morado debajo del título
- **Custom scrollbar** — Purple-themed, adaptada a dark mode
- **Card hover border** — Gradiente purple que aparece con `opacity: 0→1`

---

## 🧠 Estado global (Zustand)

### `auth.store.js`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user` | Object | Usuario de Supabase Auth |
| `role` | `'admin'` \| `'seller'` | Rol del usuario |
| `session` | Object | Sesión JWT |
| `loading` | Boolean | Estado de carga inicial |
| `sellerQuota` | Number | Cuota disponible (cache local) |

| Método | Descripción |
|--------|-------------|
| `setSession()` | Guardar sesión completa |
| `clearSession()` | Logout |
| `decrementQuota()` | Descontar 1 crédito localmente (optimistic update) |
| `isAdmin()` / `isSeller()` | Checks de rol |

### `invoice.store.js`

Maneja el estado del wizard de factura de 4 pasos:
- Paso 1: `numberingRangeId`, `paymentFormCode`, `paymentMethodCode`, `observation`
- Paso 2: `clientId`, `selectedClient`
- Paso 3: `items[]` (array de ítems con precio, cantidad, IVA, descuento)
- Paso 4: Resumen + emisión
- Navegación: `nextStep()`, `prevStep()`, `goToStep()`
- Reset: `resetWizard()`

### `theme.store.js`

| Campo | Descripción |
|-------|-------------|
| `theme` | `'light'` \| `'dark'` |
| `initialize()` | Aplica tema al `<html>` |
| `toggleTheme()` | Alterna y persiste en `localStorage` |

---

## 🔌 Servicios y hooks

### Servicios (`src/services/`)

| Servicio | Entidad | Operaciones |
|----------|---------|-------------|
| `auth.service.js` | Auth | signIn, signOut, changePassword, resetPassword |
| `clients.service.js` | Clientes | getAll, getById, create, update, delete, search |
| `products.service.js` | Productos | getAll, getById, create, update, delete, search |
| `suppliers.service.js` | Proveedores | getAll, getById, create, update, delete |
| `invoices.service.js` | Facturas | CRUD, getDashboardStats (con deltas mensuales), getMonthlyStats, getTopClients, getRecentInvoices |
| `sellers.service.js` | Vendedores | CRUD, assignCredits, suspend, reactivate |
| `factus.service.js` | FACTUS API | Proxy a todas las Edge Functions de FACTUS |
| `recurring.service.js` | Recurrentes | CRUD facturas recurrentes |

### Hooks (`src/hooks/`)

| Hook | Retorna | Descripción |
|------|---------|-------------|
| `useAuth` | — | Listener `onAuthStateChange` + carga perfil seller |
| `useClients` | `{ clients, loading, refetch, search }` | Lista con búsqueda |
| `useProducts` | `{ products, loading, refetch, search }` | Lista con búsqueda |
| `useSuppliers` | `{ suppliers, loading, refetch }` | Lista |
| `useInvoices` | `{ invoices, loading, refetch, search }` | Lista con búsqueda |
| `useDashboardStats` | `{ stats, loading }` | Conteos + cuota + deltas mensuales |
| `useMonthlyStats(n)` | `{ data, loading }` | Ventas/conteo últimos N meses |
| `useTopClients(n)` | `{ data, loading }` | Top N clientes por ingresos |
| `useRecentInvoices` | `{ invoices, loading }` | Últimas 5 facturas |
| `useSellers` | `{ sellers, loading, refetch }` | Admin: lista vendedores |
| `useSellerQuota` | `{ quota, loading }` | Cuota del seller logueado |
| `useNumberingRanges` | `{ ranges, loading }` | Rangos DIAN |
| `useRecurring` | `{ items, loading, refetch }` | Recurrentes |
| `useDebounce(value, ms)` | `debouncedValue` | Genérico para búsquedas |

---

## 📐 Validación de datos (Zod)

8 schemas reutilizables en `src/lib/schemas/`. Diseñados como **futuros DTOs** para la migración a NestJS.

| Schema | Campos clave | Uso |
|--------|-------------|-----|
| `auth.schema.js` | email, password | Login, change password |
| `client.schema.js` | identification, identification_document_id, company, names, email, municipality_id | CRUD clientes |
| `product.schema.js` | code_reference, name, price, tax_rate, unit_measure_id, is_excluded | CRUD productos |
| `supplier.schema.js` | name, document_type, document_number, email, phone | CRUD proveedores |
| `invoice.schema.js` | numbering_range_id, client_id, items[], payment_form_code | Wizard de factura |
| `credit-note.schema.js` | correction_concept_code, related_invoice_id, items[] | Notas crédito |
| `recurring.schema.js` | client_id, frequency, items[], next_run_date | Facturas recurrentes |
| `seller.schema.js` | company_name, nit, email, phone | Admin: crear vendedor |

---

## 🔒 Seguridad

| Capa | Medida |
|------|--------|
| **Auth** | Supabase Auth con JWT + role en `raw_user_meta_data` |
| **RLS** | Row-Level Security en todas las tablas de dominio |
| **Multi-tenant** | `seller_id = auth.uid()` garantiza aislamiento total |
| **Secrets** | FACTUS credentials solo en Edge Functions (Deno env) |
| **Frontend** | Solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (públicas) |
| **API proxy** | Frontend **nunca** llama a FACTUS directamente |
| **Service Role** | Solo en `admin-create-seller` (crear usuarios) |
| **SQL injection** | Queries via Supabase SDK (parameterizadas) |
| **Credenciales** | Primer login forzado a cambiar contraseña (`must_change_password`) |
| **Cuota lock** | `FOR UPDATE` en `consume_invoice_credit()` previene race conditions |
| **Error masking** | Errores internos → mensaje genérico al cliente; log interno |

---

## ⚡ Performance y optimización

| Técnica | Implementación |
|---------|---------------|
| **Code splitting** | `React.lazy()` + `Suspense` en todas las páginas (25 rutas) |
| **Parallel data** | `Promise.all()` en dashboard stats (8 queries concurrentes) |
| **Skeleton loading** | Shimmer animado reemplaza spinners — UX percibido más rápido |
| **Debounced search** | Hook `useDebounce(300ms)` para búsquedas en tiempo real |
| **Token cache** | OAuth token de FACTUS cacheado en BD con `expires_at` — evita re-auth por request |
| **Municipality cache** | ~1,123 municipios en tabla local con índices GIN trigram |
| **Tributes/Units cache** | Datos de referencia DIAN cacheados en BD con TTL |
| **DB indexes** | 10+ índices en migraciones (seller_id, status, created_at, factus_id) |
| **Optimistic updates** | `decrementQuota()` actualiza cuota local sin esperar al servidor |
| **CSS** | Tailwind purge elimina clases no usadas en build |
| **Retry logic** | Backoff exponencial en conflictos DIAN (409) — hasta 3 reintentos |

---

## 🚢 Despliegue

### Frontend (Vercel)

```bash
# Build
npm run build
# Output: dist/

# Vercel auto-detecta Vite y despliega desde Git
# Configurar env vars en Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### Edge Functions (Supabase CLI)

```bash
# Login
npx supabase login

# Desplegar una función específica
npx supabase functions deploy factus-invoice --project-ref <PROJECT_REF>

# Desplegar todas
npx supabase functions deploy --project-ref <PROJECT_REF>

# Configurar secrets
npx supabase secrets set FACTUS_API_URL=... --project-ref <PROJECT_REF>
npx supabase secrets set FACTUS_CLIENT_SECRET=... --project-ref <PROJECT_REF>
npx supabase secrets set RESEND_API_KEY=... --project-ref <PROJECT_REF>

# Nota: algunas funciones requieren --no-verify-jwt
npx supabase functions deploy admin-create-seller --project-ref <PROJECT_REF> --no-verify-jwt
```

### Migraciones

```bash
# Aplicar migraciones pendientes
npx supabase db push --project-ref <PROJECT_REF>

# O ejecutar SQL directamente en el dashboard de Supabase
```

---

## 🔮 Roadmap de escalabilidad

El diseño actual contempla la migración futura a un backend dedicado:

| Señal de migración | Acción |
|-------------------|--------|
| +50 vendedores activos | Evaluar NestJS + Neon PostgreSQL |
| +500 facturas/mes | Migrar backend de Edge Functions a NestJS |
| Necesidad de reintentos | Agregar BullMQ + Redis para colas |
| Alertas automáticas | Workers de notificaciones |
| API pública para terceros | API Keys + rate limiting |

### Decisiones de diseño para migración

- **Servicios reutilizables** — La lógica de negocio vive en `src/services/` con interfaz clara
- **Schemas Zod = futuros DTOs** — Los schemas de `lib/schemas/` se convertirán en DTOs de NestJS
- **Endpoints estables** — Las Edge Functions respetan interfaces REST; al migrar, solo cambia la base URL
- **Modelo preparado** — `seller_api_keys` y `api_usage_logs` contemplados para futura API pública

---

## 📝 Convenciones de código

| Aspecto | Regla |
|---------|-------|
| **Lenguaje** | JavaScript (.js/.jsx) — NO TypeScript en frontend (sí en Edge Functions) |
| **Componentes** | Funcionales con arrow functions, máx 150 líneas |
| **Exports** | Named exports (`export { Component }`), default solo para páginas |
| **Archivos** | kebab-case para utils (`auth.service.js`), PascalCase para componentes (`LoginPage.jsx`) |
| **Estado** | `useState` para UI local, Zustand para estado compartido |
| **Formularios** | React Hook Form + Zod schema (reutilizable) |
| **Estilos** | Mobile First, Tailwind utilities, `cn()` para condicionales |
| **Imports** | Absolutas primero (`react`, libs), luego relativas. Separar con línea en blanco |
| **Event handlers** | Prefijo `handle` (`handleSubmit`, `handleDelete`) |
| **Keys** | IDs únicos, nunca índices de array |
| **Fragmentos** | `<>...</>` en lugar de `<React.Fragment>` |
| **Commits** | Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) |
| **Branches** | `main`, `feat/nombre`, `fix/descripcion` |

---

## 📊 Estado del proyecto

| Módulo | Estado | Detalles |
|--------|--------|----------|
| Autenticación + roles | ✅ | JWT, primer login, recuperar contraseña |
| Panel Admin (CRUD vendedores) | ✅ | Dashboard, lista, crear, detalle, suspender |
| Asignación de créditos | ✅ | Paquetes con historial, funciones PL/pgSQL |
| Rangos de numeración DIAN | ✅ | Consulta y gestión |
| CRUD Clientes | ✅ | Con municipios, DV, organizaciones DIAN |
| CRUD Productos | ✅ | Con IVA, unidades, tributos DIAN |
| CRUD Proveedores | ✅ | Datos de contacto |
| Facturación electrónica | ✅ | Wizard 4 pasos, emisión DIAN, retry 409 |
| Borradores | ✅ | Guardar, editar, emitir, eliminar |
| Notas crédito DIAN | ✅ | 5 conceptos de corrección |
| Facturación recurrente | ✅ | Semanal/quincenal/mensual, JSONB items |
| Descarga PDF | ✅ | Desde FACTUS API |
| Envío por email | ✅ | Facturas y notas crédito via Resend |
| Duplicar factura | ✅ | Clone como borrador |
| Eventos RADIAN | ✅ | Emisión y consulta |
| Exportación CSV | ✅ | Sin dependencias externas |
| Modo oscuro | ✅ | Completo, persiste, respeta OS |
| Mobile First | ✅ | Sidebar colapsable, BottomNav, FAB, targets 44px |
| Skeleton loading | ✅ | En todas las páginas (shimmer) |
| Animaciones | ✅ | 9 keyframes, stagger, flip card, shine |
| RLS multi-tenant | ✅ | Aislamiento total por seller_id |
| Code splitting | ✅ | Lazy loading en 25 rutas |
| Error Boundary | ✅ | En cada ruta + global |
| 404 | ✅ | Catch-all con diseño |

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.
