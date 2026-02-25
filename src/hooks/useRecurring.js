import { useState, useEffect, useCallback } from 'react';
import { recurringService } from '@/services/recurring.service';

const useRecurring = () => {
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecurring = useCallback(async () => {
    try {
      setLoading(true);
      const data = await recurringService.getAll();
      setRecurring(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecurring(); }, [fetchRecurring]);

  return { recurring, loading, error, refetch: fetchRecurring };
};

export { useRecurring };
