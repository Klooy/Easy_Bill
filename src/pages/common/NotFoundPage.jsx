import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const NotFoundPage = () => {
  const role = useAuthStore((s) => s.role);
  const homePath = role === 'admin' ? '/admin' : '/dashboard';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md text-center">
        <p className="font-outfit text-7xl font-bold text-primary-500">404</p>
        <h1 className="mt-4 font-outfit text-2xl font-bold text-gray-900 dark:text-white">
          Página no encontrada
        </h1>
        <p className="mt-2 font-jakarta text-sm text-gray-500 dark:text-gray-400">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to={homePath}>
            <Button className="min-h-[44px] w-full rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Ir al inicio
            </Button>
          </Link>
          <Button
            variant="outline"
            className="min-h-[44px] w-full rounded-input sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver atrás
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
