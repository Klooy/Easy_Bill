import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  session: null,
  loading: true,
  sellerQuota: null,

  setSession: (session, user, role) => set({ session, user, role, loading: false }),
  clearSession: () => set({ user: null, role: null, session: null, loading: false, sellerQuota: null }),
  setLoading: (loading) => set({ loading }),
  setSellerQuota: (sellerQuota) => set({ sellerQuota }),
  decrementQuota: () => {
    const current = get().sellerQuota;
    if (current !== null && current > 0) set({ sellerQuota: current - 1 });
  },

  isAdmin: () => get().role === 'admin',
  isSeller: () => get().role === 'seller',
  isAuthenticated: () => !!get().session,
}));

export { useAuthStore };
