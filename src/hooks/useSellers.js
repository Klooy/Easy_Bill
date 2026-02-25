import { useState, useEffect, useCallback } from 'react';
import { sellersService } from '@/services/sellers.service';
import { sileo } from 'sileo';

const useSellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSellers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sellersService.getAll();
      setSellers(data);
    } catch (err) {
      setError(err.message);
      sileo.error({ title: 'Error al cargar vendedores', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  return { sellers, loading, error, refetch: fetchSellers };
};

const useSeller = (id) => {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSeller = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await sellersService.getById(id);
      setSeller(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSeller();
  }, [fetchSeller]);

  return { seller, loading, error, refetch: fetchSeller };
};

const useAdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sellersService.getStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
      sileo.error({ title: 'Error al cargar estadísticas', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

const useCreditHistory = (sellerId) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!sellerId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await sellersService.getCreditHistory(sellerId);
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
};

export { useSellers, useSeller, useAdminStats, useCreditHistory };
