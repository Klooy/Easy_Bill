import { useState, useEffect, useCallback } from 'react';
import { clientsService } from '@/services/clients.service';
import { sileo } from 'sileo';

const useClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientsService.getAll();
      setClients(data);
    } catch (err) {
      setError(err.message);
      sileo.error({ title: 'Error al cargar clientes', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const searchClients = useCallback(async (query) => {
    if (!query.trim()) {
      return fetchClients();
    }
    try {
      setLoading(true);
      const data = await clientsService.search(query);
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients, searchClients };
};

const useClient = (id) => {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchClient = async () => {
      try {
        setLoading(true);
        const data = await clientsService.getById(id);
        setClient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  return { client, loading, error };
};

export { useClients, useClient };
