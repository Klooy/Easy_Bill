import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mt-4 font-outfit text-xl font-bold text-gray-900 dark:text-white">
            Algo salió mal
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400 font-jakarta">
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="rounded-input"
              onClick={this.handleReset}
            >
              Reintentar
            </Button>
            <Button
              className="rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white"
              onClick={() => window.location.reload()}
            >
              Recargar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
