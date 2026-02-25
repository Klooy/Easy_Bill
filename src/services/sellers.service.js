import { supabase } from '@/lib/supabase';

const sellersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(sellerData) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-seller`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sellerData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al crear vendedor');
    }

    return result.data;
  },

  async update(sellerId, updates) {
    const { data, error } = await supabase
      .from('sellers')
      .update(updates)
      .eq('id', sellerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async suspend(sellerId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const adminId = sessionData?.session?.user?.id;

    const { error } = await supabase.rpc('suspend_seller', {
      p_seller_id: sellerId,
      p_suspended_by: adminId,
    });
    if (error) throw error;
  },

  async reactivate(sellerId) {
    const { error } = await supabase.rpc('reactivate_seller', {
      p_seller_id: sellerId,
    });
    if (error) throw error;
  },

  async assignCredits(sellerId, quantity, note) {
    const { data: sessionData } = await supabase.auth.getSession();
    const adminId = sessionData?.session?.user?.id;

    const { error } = await supabase.rpc('assign_invoice_credits', {
      p_seller_id: sellerId,
      p_quantity: quantity,
      p_assigned_by: adminId,
      p_note: note || null,
    });
    if (error) throw error;
  },

  async getStats() {
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('status, invoice_quota, invoice_used');
    if (sellersError) throw sellersError;

    const active = sellers.filter((s) => s.status === 'active').length;
    const suspended = sellers.filter((s) => s.status === 'suspended').length;
    const totalCredits = sellers.reduce((sum, s) => sum + (s.invoice_quota || 0) + (s.invoice_used || 0), 0);
    const totalInvoices = sellers.reduce((sum, s) => sum + (s.invoice_used || 0), 0);

    return {
      activeSellers: active,
      suspendedSellers: suspended,
      totalCredits,
      totalInvoices,
    };
  },

  async getCreditHistory(sellerId) {
    const { data, error } = await supabase
      .from('invoice_packages')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};

export { sellersService };
