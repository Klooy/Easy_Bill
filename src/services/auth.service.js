import { supabase } from '@/lib/supabase';

const authService = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  },

  async resetPasswordForEmail(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  },

  /**
   * Fetch the seller profile from DB to check must_change_password flag
   */
  async getSellerProfile(userId) {
    const { data, error } = await supabase
      .from('sellers')
      .select('id, company_name, status, invoice_quota, invoice_used, must_change_password')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  /**
   * Clear must_change_password flag in sellers table + user_metadata
   */
  async clearMustChangePassword() {
    // Update user_metadata
    const { data: userData, error: metaError } = await supabase.auth.updateUser({
      data: { must_change_password: false },
    });
    if (metaError) throw metaError;

    // Update sellers table
    const userId = userData.user.id;
    const { error: dbError } = await supabase
      .from('sellers')
      .update({ must_change_password: false })
      .eq('id', userId);
    if (dbError) throw dbError;

    return userData;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  getRoleFromUser(user) {
    return user?.user_metadata?.role || null;
  },
};

export { authService };
