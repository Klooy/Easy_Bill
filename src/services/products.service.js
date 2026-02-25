import { supabase } from '@/lib/supabase';

const productsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getActive() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(product) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, seller_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleActive(id, active) {
    const { data, error } = await supabase
      .from('products')
      .update({ active })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    // Check if product has invoice items before attempting delete
    const { count } = await supabase
      .from('invoice_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id);
    if (count > 0) {
      throw new Error('Este producto tiene facturas asociadas. Puedes desactivarlo en su lugar.');
    }
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async search(query) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%,code_reference.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};

export { productsService };
