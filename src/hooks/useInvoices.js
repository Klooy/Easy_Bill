import { useState, useEffect, useCallback } from 'react';
import { invoicesService } from '@/services/invoices.service';
import { sileo } from 'sileo';

const useInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoicesService.getAllDocuments();
      setInvoices(data);
    } catch (err) {
      setError(err.message);
      sileo.error({ title: 'Error al cargar facturas', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const searchInvoices = useCallback(async (query) => {
    if (!query.trim()) {
      return fetchInvoices();
    }
    try {
      setLoading(true);
      const data = await invoicesService.search(query);
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchInvoices]);

  return { invoices, loading, error, refetch: fetchInvoices, searchInvoices };
};

const useDashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoicesService.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
      sileo.error({ title: 'Error al cargar estadísticas', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

const useRecentInvoices = (limit = 5) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await invoicesService.getRecent(limit);
        setInvoices(data);
      } catch (err) {
        setError(err.message);
        console.error('[useRecentInvoices]:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [limit]);

  return { invoices, loading, error };
};

const useMonthlyStats = (months = 6) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const stats = await invoicesService.getMonthlyStats(months);
        setData(stats);
      } catch (err) {
        setError(err.message);
        console.error('[useMonthlyStats]:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [months]);

  return { data, loading, error };
};

const useTopClients = (limit = 5) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const clients = await invoicesService.getTopClients(limit);
        setData(clients);
      } catch (err) {
        setError(err.message);
        console.error('[useTopClients]:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [limit]);

  return { data, loading, error };
};

export { useInvoices, useDashboardStats, useRecentInvoices, useMonthlyStats, useTopClients };
