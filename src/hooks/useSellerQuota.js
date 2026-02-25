import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { sellersService } from '@/services/sellers.service';

/**
 * Hook to manage seller quota centrally.
 * Fetches quota on mount for sellers, provides refresh & decrement.
 */
const useSellerQuota = () => {
  const { user, role, sellerQuota, setSellerQuota, decrementQuota } = useAuthStore();
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (role !== 'seller' || !user?.id) return;
    try {
      setError(null);
      const seller = await sellersService.getById(user.id);
      if (seller) setSellerQuota(seller.invoice_quota);
    } catch (err) {
      setError(err.message);
      console.error('[useSellerQuota]:', err.message);
    }
  }, [role, user?.id, setSellerQuota]);

  useEffect(() => {
    if (sellerQuota === null && role === 'seller') {
      refresh();
    }
  }, [sellerQuota, role, refresh]);

  return { quota: sellerQuota, refresh, decrement: decrementQuota, error };
};

export { useSellerQuota };
