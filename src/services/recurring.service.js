import { supabase } from '@/lib/supabase';

const recurringService = {
  async getAll() {
    const { data, error } = await supabase
      .from('recurring_invoices')
      .select('*, clients(names, company, identification)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('recurring_invoices')
      .select('*, clients(names, company, identification, email, phone, address)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(recurring) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('recurring_invoices')
      .insert({ ...recurring, seller_id: user.id })
      .select('*, clients(names, company, identification)')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('recurring_invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clients(names, company, identification)')
      .single();
    if (error) throw error;
    return data;
  },

  async toggleActive(id, active) {
    const { data, error } = await supabase
      .from('recurring_invoices')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('recurring_invoices')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export { recurringService };
