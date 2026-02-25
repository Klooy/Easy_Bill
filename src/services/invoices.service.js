import { supabase } from '@/lib/supabase';

// unit_price es el PRECIO BASE (sin IVA).
// Cada producto resuelve su propio IVA: base × rate%.
const calcTotals = (items) => {
  const subtotal = items.reduce((sum, item) => {
    const gross = item.quantity * item.unit_price;
    const disc = gross * ((item.discount_rate || 0) / 100);
    return sum + (gross - disc);
  }, 0);

  const discountTotal = items.reduce((sum, item) => {
    const gross = item.quantity * item.unit_price;
    return sum + (gross * ((item.discount_rate || 0) / 100));
  }, 0);

  const taxTotal = items.reduce((sum, item) => {
    if (item.is_excluded) return sum;
    const rate = parseFloat(item.tax_rate) || 0;
    if (rate === 0) return sum;
    const gross = item.quantity * item.unit_price;
    const disc = gross * ((item.discount_rate || 0) / 100);
    const taxable = gross - disc;
    return sum + (taxable * rate / 100);
  }, 0);

  const total = subtotal + taxTotal;
  return { subtotal, discountTotal, taxTotal, total };
};

const invoicesService = {
  /**
   * Save a new draft invoice (no DIAN emission)
   */
  async saveDraft(payload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay sesión activa');

    const items = (payload.items || []).filter((i) => i.name);

    // Calculate totals client-side — unit_price es el PRECIO BASE (sin IVA)
    const { subtotal, discountTotal, taxTotal, total } = calcTotals(items);

    // Generate temporary reference_code for draft (required NOT NULL in DB)
    const draftRef = `DRAFT-${Date.now()}`;

    // Insert invoice as draft
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        seller_id: user.id,
        reference_code: draftRef,
        numbering_range_id: payload.numbering_range_id,
        client_id: payload.client_id || null,
        status: 'draft',
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        total,
        observation: payload.observation || null,
        payment_form_code: payload.payment_form_code || '1',
        payment_method_code: String(payload.payment_method_code || '10'),
        payment_due_date: payload.payment_due_date || null,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Insert invoice items
    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        invoice_id: invoice.id,
        product_id: item.product_id || null,
        code_reference: item.code_reference || 'ITEM',
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_rate: item.discount_rate || 0,
        tax_rate: item.tax_rate || '19.00',
        unit_measure_id: item.unit_measure_id || 70,
        standard_code_id: item.standard_code_id || 1,
        is_excluded: item.is_excluded || 0,
        tribute_id: item.tribute_id || 1,
        subtotal: (() => {
          const gross = item.quantity * item.unit_price;
          const disc = gross * ((item.discount_rate || 0) / 100);
          return gross - disc;
        })(),
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return invoice;
  },

  /**
   * Update an existing draft invoice
   */
  async updateDraft(id, payload) {
    const items = (payload.items || []).filter((i) => i.name);

    // Recalculate totals — unit_price es el PRECIO BASE (sin IVA)
    const { subtotal, discountTotal, taxTotal, total } = calcTotals(items);

    // Update invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        numbering_range_id: payload.numbering_range_id,
        client_id: payload.client_id || null,
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        total,
        observation: payload.observation || null,
        payment_form_code: payload.payment_form_code || '1',
        payment_method_code: String(payload.payment_method_code || '10'),
        payment_due_date: payload.payment_due_date || null,
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Replace items: delete old, insert new
    await supabase.from('invoice_items').delete().eq('invoice_id', id);

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        invoice_id: id,
        product_id: item.product_id || null,
        code_reference: item.code_reference || 'ITEM',
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_rate: item.discount_rate || 0,
        tax_rate: item.tax_rate || '19.00',
        unit_measure_id: item.unit_measure_id || 70,
        standard_code_id: item.standard_code_id || 1,
        is_excluded: item.is_excluded || 0,
        tribute_id: item.tribute_id || 1,
        subtotal: (() => {
          const gross = item.quantity * item.unit_price;
          const disc = gross * ((item.discount_rate || 0) / 100);
          return gross - disc;
        })(),
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return invoice;
  },

  /**
   * Delete a draft invoice and its items
   */
  async deleteDraft(id) {
    // Items are cascade-deleted via FK, but let's be explicit
    await supabase.from('invoice_items').delete().eq('invoice_id', id);
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('status', 'draft');
    if (error) throw error;
  },

  async getAll(documentType = 'invoice') {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, clients(names, company, identification)')
      .eq('document_type', documentType)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAllDocuments() {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, clients(names, company, identification)')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, clients(names, company, identification, email, phone, address), invoice_items(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getCreditNotesByInvoice(invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, number, reference_code, status, total, created_at, correction_concept_code')
      .eq('related_invoice_id', invoiceId)
      .eq('document_type', 'credit_note')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getRecent(limit = 5) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, number, reference_code, status, total, created_at, clients(names, company)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async search(query) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, clients(names, company, identification)')
      .or(`number.ilike.%${query}%,reference_code.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getFiltered({ search = '', status = '', dateFrom = '', dateTo = '', documentType = '' } = {}) {
    let query = supabase
      .from('invoices')
      .select('*, clients(names, company, identification)')
      .neq('status', 'deleted');

    if (status) {
      query = query.eq('status', status);
    }
    if (documentType) {
      query = query.eq('document_type', documentType);
    }
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    // Server-side text search using DB ilike for number and reference_code
    if (search) {
      query = query.or(`number.ilike.%${search}%,reference_code.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return data;
  },

  async getMonthlyStats(months = 6) {
    const { data, error } = await supabase
      .from('invoices')
      .select('total, created_at, status, document_type')
      .eq('document_type', 'invoice')
      .eq('status', 'issued')
      .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - months)).toISOString())
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Aggregate by month
    const monthlyMap = {};
    (data || []).forEach((inv) => {
      const month = new Date(inv.created_at).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
      if (!monthlyMap[month]) monthlyMap[month] = { month, total: 0, count: 0 };
      monthlyMap[month].total += parseFloat(inv.total) || 0;
      monthlyMap[month].count += 1;
    });

    return Object.values(monthlyMap);
  },

  async getTopClients(limit = 5) {
    const { data, error } = await supabase
      .from('invoices')
      .select('total, clients(names, company)')
      .eq('document_type', 'invoice')
      .eq('status', 'issued');
    if (error) throw error;

    // Aggregate by client
    const clientMap = {};
    (data || []).forEach((inv) => {
      const name = inv.clients?.names || inv.clients?.company || 'Sin nombre';
      if (!clientMap[name]) clientMap[name] = { name, total: 0, count: 0 };
      clientMap[name].total += parseFloat(inv.total) || 0;
      clientMap[name].count += 1;
    });

    return Object.values(clientMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },

  /**
   * Get seller's dashboard counts + this-month deltas
   */
  async getDashboardStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [clients, products, suppliers, invoices, seller, clientsMonth, productsMonth, invoicesMonth] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('suppliers').select('id', { count: 'exact', head: true }),
      supabase.from('invoices').select('id', { count: 'exact', head: true }),
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase
          .from('sellers')
          .select('invoice_quota, invoice_used, company_name')
          .eq('id', user.id)
          .single();
        return data;
      })(),
      supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('products').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    ]);

    return {
      clientsCount: clients.count || 0,
      productsCount: products.count || 0,
      suppliersCount: suppliers.count || 0,
      invoicesCount: invoices.count || 0,
      clientsMonth: clientsMonth.count || 0,
      productsMonth: productsMonth.count || 0,
      invoicesMonth: invoicesMonth.count || 0,
      invoiceQuota: seller?.invoice_quota || 0,
      invoiceUsed: seller?.invoice_used || 0,
      companyName: seller?.company_name || '',
    };
  },
};

export { invoicesService };
