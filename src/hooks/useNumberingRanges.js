import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Document type keywords used to filter ranges by context.
// FACTUS returns the full Spanish name in the 'document' field, e.g.:
//   "Factura de venta electrónica", "Nota Crédito", "Nota Débito", etc.
const DOC_FILTERS = {
  invoice: 'factura',
  credit_note: 'crédito',
  debit_note: 'débito',
};

const useNumberingRanges = (documentType) => {
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRanges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to fetch from local cache
      const { data: cached, error: cacheError } = await supabase
        .from('numbering_ranges')
        .select('*')
        .eq('is_active', true)
        .order('prefix');

      let allRanges = [];

      if (!cacheError && cached && cached.length > 0) {
        allRanges = cached;
      } else {
        // If cache is empty, try to fetch from FACTUS via Edge Function
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/factus-ranges`,
            {
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (response.ok) {
            const result = await response.json();
            allRanges = result.data || [];
          }
        } catch {
          allRanges = cached || [];
        }
      }

      // Filter by document type if specified
      const keyword = DOC_FILTERS[documentType];
      if (keyword && allRanges.length > 0) {
        const filtered = allRanges.filter(
          (r) => r.document?.toLowerCase().includes(keyword)
        );
        setRanges(filtered);
      } else {
        setRanges(allRanges);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [documentType]);

  useEffect(() => { fetchRanges(); }, [fetchRanges]);

  return { ranges, loading, error, refetch: fetchRanges };
};

export { useNumberingRanges };
