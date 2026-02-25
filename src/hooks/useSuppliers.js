import { useState, useEffect, useCallback } from 'react';
import { suppliersService } from '@/services/suppliers.service';
import { sileo } from 'sileo';

const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await suppliersService.getAll();
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
      sileo.error({ title: 'Error al cargar proveedores', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const searchSuppliers = useCallback(async (query) => {
    if (!query.trim()) {
      return fetchSuppliers();
    }
    try {
      setLoading(true);
      const data = await suppliersService.search(query);
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchSuppliers]);

  return { suppliers, loading, error, refetch: fetchSuppliers, searchSuppliers };
};

const useSupplier = (id) => {
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchSupplier = async () => {
      try {
        setLoading(true);
        const data = await suppliersService.getById(id);
        setSupplier(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [id]);

  return { supplier, loading, error };
};

export { useSuppliers, useSupplier };
