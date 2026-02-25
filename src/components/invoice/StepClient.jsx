import { useState, useEffect } from 'react';
import { Search, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useInvoiceStore } from '@/store/invoice.store';
import { useClients } from '@/hooks/useClients';
import { useDebounce } from '@/hooks/useDebounce';
import { InlineClientForm } from './InlineClientForm';

const StepClient = () => {
  const { clients, loading, searchClients } = useClients();
  const { clientId, selectedClient, setClient } = useInvoiceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('existing');
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    searchClients(debouncedSearch);
  }, [debouncedSearch]);

  const handleSearch = (e) => setSearchQuery(e.target.value);

  /* Client already selected — show confirmation card */
  if (clientId && selectedClient) {
    return (
      <div className="space-y-4">
        <div className="rounded-card border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Cliente seleccionado
              </p>
              <p className="mt-1 truncate font-outfit font-semibold text-gray-900 dark:text-white">
                {selectedClient.names || selectedClient.company || '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{selectedClient.identification}</p>
              {selectedClient.email && (
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{selectedClient.email}</p>
              )}
              {clientId === 'temp' && (
                <span className="mt-1.5 inline-flex items-center rounded-[6px] bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  Venta ocasional
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-input"
              onClick={() => setClient('', null)}
            >
              Cambiar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex rounded-input border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            mode === 'existing'
              ? 'bg-primary-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          onClick={() => setMode('existing')}
        >
          <Users className="h-3.5 w-3.5" />
          Existentes
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            mode === 'new'
              ? 'bg-primary-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          onClick={() => setMode('new')}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Nuevo cliente
        </button>
      </div>

      {mode === 'existing' ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              aria-label="Buscar"
              placeholder="Buscar cliente por nombre o documento..."
              className="rounded-input pl-10"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : clients.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Sin clientes encontrados</p>
              <Button
                type="button"
                variant="link"
                className="mt-1 text-primary-500"
                onClick={() => setMode('new')}
              >
                Crear nuevo cliente
              </Button>
            </div>
          ) : (
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClient(c.id, c)}
                  className={`w-full rounded-card border p-3 text-left transition-colors ${
                    clientId === c.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{c.names || c.company || '—'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.identification}</p>
                  {c.email && <p className="text-xs text-gray-400 dark:text-gray-500">{c.email}</p>}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <InlineClientForm onClientSelected={setClient} />
      )}
    </div>
  );
};

export { StepClient };
