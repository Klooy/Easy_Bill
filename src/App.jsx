import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'sileo';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';


// Lazy-loaded pages - code splitting por ruta
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePasswordPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const SellersListPage = lazy(() => import('@/pages/admin/SellersListPage'));
const SellerCreatePage = lazy(() => import('@/pages/admin/SellerCreatePage'));
const SellerDetailPage = lazy(() => import('@/pages/admin/SellerDetailPage'));
const AdminInvoicesPage = lazy(() => import('@/pages/admin/AdminInvoicesPage'));
const AdminRangesPage = lazy(() => import('@/pages/admin/AdminRangesPage'));

const DashboardPage = lazy(() => import('@/pages/seller/DashboardPage'));
const ClientsPage = lazy(() => import('@/pages/seller/ClientsPage'));
const ClientFormPage = lazy(() => import('@/pages/seller/ClientFormPage'));
const ProductsPage = lazy(() => import('@/pages/seller/ProductsPage'));
const ProductFormPage = lazy(() => import('@/pages/seller/ProductFormPage'));
const SuppliersPage = lazy(() => import('@/pages/seller/SuppliersPage'));
const SupplierFormPage = lazy(() => import('@/pages/seller/SupplierFormPage'));
const InvoicesPage = lazy(() => import('@/pages/seller/InvoicesPage'));
const NewInvoicePage = lazy(() => import('@/pages/seller/NewInvoicePage'));
const InvoiceDetailPage = lazy(() => import('@/pages/seller/InvoiceDetailPage'));
const CreditNotePage = lazy(() => import('@/pages/seller/CreditNotePage'));
const RecurringInvoicesPage = lazy(() => import('@/pages/seller/RecurringInvoicesPage'));
const RecurringFormPage = lazy(() => import('@/pages/seller/RecurringFormPage'));
const RecurringDetailPage = lazy(() => import('@/pages/seller/RecurringDetailPage'));
const MorePage = lazy(() => import('@/pages/seller/MorePage'));
const SettingsPage = lazy(() => import('@/pages/seller/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/common/NotFoundPage'));

const App = () => {
  // Initialize auth listener
  useAuth();
  const { role, loading } = useAuthStore();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Authenticated routes (any role) */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'seller']} />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
              <Route path="/admin/sellers" element={<ErrorBoundary><SellersListPage /></ErrorBoundary>} />
              <Route path="/admin/sellers/new" element={<ErrorBoundary><SellerCreatePage /></ErrorBoundary>} />
              <Route path="/admin/sellers/:id" element={<ErrorBoundary><SellerDetailPage /></ErrorBoundary>} />
              <Route path="/admin/invoices" element={<ErrorBoundary><AdminInvoicesPage /></ErrorBoundary>} />
              <Route path="/admin/ranges" element={<ErrorBoundary><AdminRangesPage /></ErrorBoundary>} />
            </Route>
          </Route>

          {/* Seller routes */}
          <Route element={<ProtectedRoute allowedRoles={['seller']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="/clients" element={<ErrorBoundary><ClientsPage /></ErrorBoundary>} />
              <Route path="/clients/new" element={<ErrorBoundary><ClientFormPage /></ErrorBoundary>} />
              <Route path="/clients/:id/edit" element={<ErrorBoundary><ClientFormPage /></ErrorBoundary>} />
              <Route path="/products" element={<ErrorBoundary><ProductsPage /></ErrorBoundary>} />
              <Route path="/products/new" element={<ErrorBoundary><ProductFormPage /></ErrorBoundary>} />
              <Route path="/products/:id/edit" element={<ErrorBoundary><ProductFormPage /></ErrorBoundary>} />
              <Route path="/suppliers" element={<ErrorBoundary><SuppliersPage /></ErrorBoundary>} />
              <Route path="/suppliers/new" element={<ErrorBoundary><SupplierFormPage /></ErrorBoundary>} />
              <Route path="/suppliers/:id/edit" element={<ErrorBoundary><SupplierFormPage /></ErrorBoundary>} />
              <Route path="/invoices" element={<ErrorBoundary><InvoicesPage /></ErrorBoundary>} />
              <Route path="/invoices/new" element={<ErrorBoundary><NewInvoicePage /></ErrorBoundary>} />
              <Route path="/invoices/:id" element={<ErrorBoundary><InvoiceDetailPage /></ErrorBoundary>} />
              <Route path="/invoices/:id/credit-note" element={<ErrorBoundary><CreditNotePage /></ErrorBoundary>} />
              <Route path="/recurring" element={<ErrorBoundary><RecurringInvoicesPage /></ErrorBoundary>} />
              <Route path="/recurring/new" element={<ErrorBoundary><RecurringFormPage /></ErrorBoundary>} />
              <Route path="/recurring/:id" element={<ErrorBoundary><RecurringDetailPage /></ErrorBoundary>} />
              <Route path="/recurring/:id/edit" element={<ErrorBoundary><RecurringFormPage /></ErrorBoundary>} />
              <Route path="/more" element={<ErrorBoundary><MorePage /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
            </Route>
          </Route>

        {/* Root redirect */}
        <Route
          path="/"
          element={
            loading ? null : (
              <Navigate
                to={role === 'admin' ? '/admin' : role === 'seller' ? '/dashboard' : '/login'}
                replace
              />
            )
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>

      <Toaster
        position="top-right"
        options={{
          fill: '#1C1528',
          roundness: 14,
          styles: {
            title: '!text-white !font-semibold',
            description: '!text-white/70',
          },
        }}
      />
    </BrowserRouter>
  );
};

export default App;
