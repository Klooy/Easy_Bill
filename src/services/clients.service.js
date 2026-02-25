import { supabase } from '@/lib/supabase';

const clientsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(client) {
    // Get current user id as seller_id
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, seller_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    // Check if client has invoices before attempting delete
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', id);
    if (count > 0) {
      throw new Error('Este cliente tiene facturas asociadas. No es posible eliminarlo.');
    }
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async search(query) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(`names.ilike.%${query}%,identification.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};

export { clientsService };
