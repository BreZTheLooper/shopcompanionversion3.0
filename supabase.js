/* ============================================================
   SHOP COMPANION 3.0 — Supabase Client & DB Helpers
   Add this BEFORE shared.js, auth.js, admin.js in index.html:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="supabase.js"></script>
   ============================================================ */

const SUPABASE_URL  = 'https://xuywopabnmwvfxswaqkc.supabase.co';
const SUPABASE_ANON = 'sb_publishable_tJmUDAl_h4uJyqOgXWRuVA_TtolibM8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ============================================================
   DB — All Supabase operations for Shop Companion
   ============================================================ */
const DB = {

  /* ── INVENTORY ── */

  async getInventory(storeId) {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('store_id', storeId);
    if (error) { console.error('[DB] getInventory:', error.message); return []; }
    return (data || []).map(_fromDBProduct);
  },

  async upsertProduct(storeId, product) {
    const row = _toDBProduct(storeId, product);
    const { error } = await supabase
      .from('inventory')
      .upsert(row, { onConflict: 'id' });
    if (error) console.error('[DB] upsertProduct:', error.message);
  },

  async deleteProduct(id) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    if (error) console.error('[DB] deleteProduct:', error.message);
  },

  async updateStock(id, newStock) {
    const { error } = await supabase
      .from('inventory')
      .update({ stock: newStock })
      .eq('id', id);
    if (error) console.error('[DB] updateStock:', error.message);
  },

  /* ── CASHIERS ── */

  async getCashiers(clientEmail) {
    const { data, error } = await supabase
      .from('cashiers')
      .select('*')
      .eq('client_email', clientEmail);
    if (error) { console.error('[DB] getCashiers:', error.message); return []; }
    return (data || []).map(_fromDBCashier);
  },

  async upsertCashier(clientEmail, cashier) {
    const row = _toDBCashier(clientEmail, cashier);
    const { error } = await supabase
      .from('cashiers')
      .upsert(row, { onConflict: 'id' });
    if (error) console.error('[DB] upsertCashier:', error.message);
  },

  async deleteCashier(id) {
    const { error } = await supabase
      .from('cashiers')
      .delete()
      .eq('id', id);
    if (error) console.error('[DB] deleteCashier:', error.message);
  },

  async updateCashierStatus(id, status) {
    const { error } = await supabase
      .from('cashiers')
      .update({ status })
      .eq('id', id);
    if (error) console.error('[DB] updateCashierStatus:', error.message);
  },

  async loginCashier(loginEmail, password) {
    const { data, error } = await supabase
      .from('cashiers')
      .select('*')
      .eq('login_email', loginEmail.toLowerCase().trim())
      .eq('password', password)
      .single();
    if (error) return null;
    return _fromDBCashier(data);
  },

  /* ── CUSTOMERS ── */

  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('joined', { ascending: false });
    if (error) { console.error('[DB] getCustomers:', error.message); return []; }
    return (data || []).map(_fromDBCustomer);
  },

  /* FIX: fetch a single customer by id — avoids loading all customers
     just to refresh one person's points in customer.js renderRewards() */
  async getCustomerById(id) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) { console.error('[DB] getCustomerById:', error.message); return null; }
    return _fromDBCustomer(data);
  },

  async loginCustomer(email, password) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('password', password)
      .single();
    if (error) return null;
    return _fromDBCustomer(data);
  },

  async registerCustomer(customer) {
    const row = _toDBCustomer(customer);
    const { data, error } = await supabase
      .from('customers')
      .insert(row)
      .select()
      .single();
    if (error) { console.error('[DB] registerCustomer:', error.message); return null; }
    return _fromDBCustomer(data);
  },

  async updateCustomer(id, changes) {
    const col = {};
    if (changes.totalOrders !== undefined) col.total_orders = changes.totalOrders;
    if (changes.points      !== undefined) col.points       = changes.points;
    if (changes.lastLogin   !== undefined) col.last_login   = changes.lastLogin;
    if (changes.name        !== undefined) col.name         = changes.name;
    if (changes.phone       !== undefined) col.phone        = changes.phone;
    /* FIX: sync regCode changes (used by admin.js customer management) */
    if (changes.regCode     !== undefined) col.reg_code     = changes.regCode;
    if (!Object.keys(col).length) return;
    const { error } = await supabase
      .from('customers')
      .update(col)
      .eq('id', id);
    if (error) console.error('[DB] updateCustomer:', error.message);
  },

  /* ── ORDERS ── */

  async saveOrder(storeId, order) {
    const row = {
      id:             order.id,
      store_id:       storeId,
      cashier_email:  AuthState?.currentUser?.email || null,
      cashier_name:   order.cashier || null,
      customer_id:    order.customerId || null,
      customer_name:  order.customerName || 'Walk-in',
      /* FIX: persist the shopping list name the customer chose */
      list_name:      order.listName || null,
      items:          order.items || [],
      subtotal:       order.subtotal || 0,
      discount:       order.discount || 0,
      tax:            order.tax || 0,
      total:          order.total || 0,
      status:         order.status || 'completed',
      weight_check:   order.weightCheck || null,
      created_at:     order.date || new Date().toISOString(),
    };
    const { error } = await supabase
      .from('orders')
      .insert(row);
    if (error) console.error('[DB] saveOrder:', error.message);
  },

  async getOrders(storeId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[DB] getOrders:', error.message); return []; }
    return (data || []).map(o => ({
      id:           o.id,
      customerId:   o.customer_id,
      customerName: o.customer_name,
      cashier:      o.cashier_name,
      /* FIX: map list_name back to listName */
      listName:     o.list_name,
      items:        o.items,
      subtotal:     o.subtotal,
      discount:     o.discount,
      tax:          o.tax,
      total:        o.total,
      status:       o.status,
      weightCheck:  o.weight_check,
      date:         o.created_at,
    }));
  },

  /* ── RETAILERS ── */

  async getRetailers() {
    const { data, error } = await supabase
      .from('retailers')
      .select('*');
    if (error) { console.error('[DB] getRetailers:', error.message); return []; }
    return (data || []).map(_fromDBRetailer);
  },

  async upsertRetailer(retailer) {
    const row = _toDBRetailer(retailer);
    const { error } = await supabase
      .from('retailers')
      .upsert(row, { onConflict: 'id' });
    if (error) console.error('[DB] upsertRetailer:', error.message);
  },

  async deleteRetailer(id) {
    const { error } = await supabase
      .from('retailers')
      .delete()
      .eq('id', id);
    if (error) console.error('[DB] deleteRetailer:', error.message);
  },

  /* ── ONE-TIME SEED ── */
  /* Call seedSupabase() once from the browser console to push
     all localStorage data into Supabase.                       */
};

/* ============================================================
   FIELD MAPPERS — camelCase ↔ snake_case
   ============================================================ */

function _toDBProduct(storeId, p) {
  return {
    id:           p.id,
    store_id:     storeId,
    name:         p.name,
    barcode:      p.barcode || null,
    category:     p.category || null,
    type:         p.type || null,
    price:        p.price || 0,
    stock:        p.stock || 0,
    unit:         p.unit || 'unit',
    image:        p.image || '📦',
    expiry:       p.expiry || null,
    low_stock_at: p.lowStockAt || 10,
    weight_grams: p.weightGrams || null,
  };
}

function _fromDBProduct(row) {
  return {
    id:          row.id,
    storeId:     row.store_id,
    name:        row.name,
    barcode:     row.barcode,
    category:    row.category,
    type:        row.type,
    price:       row.price,
    stock:       row.stock,
    unit:        row.unit,
    image:       row.image,
    expiry:      row.expiry,
    lowStockAt:  row.low_stock_at,
    weightGrams: row.weight_grams,
  };
}

function _toDBCashier(clientEmail, c) {
  return {
    id:           c.id,
    store_id:     c.storeSlug || c.storeId || '',
    store_slug:   c.storeSlug || c.storeId || '',
    store_name:   c.storeName || '',
    client_email: clientEmail,
    name:         c.name,
    username:     c.username || '',
    login_email:  c.loginEmail,
    password:     c.password,
    role:         c.role || 'cashier',
    status:       c.status || 'active',
    added:        c.added || new Date().toISOString().slice(0,10),
  };
}

function _fromDBCashier(row) {
  return {
    id:          row.id,
    storeId:     row.store_id,
    storeSlug:   row.store_slug,
    storeName:   row.store_name,
    clientEmail: row.client_email,
    name:        row.name,
    username:    row.username,
    loginEmail:  row.login_email,
    password:    row.password,
    role:        row.role,
    status:      row.status,
    added:       row.added,
  };
}

function _toDBCustomer(c) {
  return {
    id:           c.id,
    name:         c.name,
    email:        c.email,
    password:     c.password || '',
    phone:        c.phone || '',
    /* FIX: persist regCode used by admin customer management & QR lookup */
    reg_code:     c.regCode || null,
    joined:       c.joined || new Date().toISOString().slice(0,10),
    last_login:   c.lastLogin || null,
    total_orders: c.totalOrders || 0,
    points:       c.points || 0,
  };
}

function _fromDBCustomer(row) {
  return {
    id:          row.id,
    name:        row.name,
    email:       row.email,
    password:    row.password,
    phone:       row.phone,
    /* FIX: map reg_code back to regCode */
    regCode:     row.reg_code,
    joined:      row.joined,
    lastLogin:   row.last_login,
    totalOrders: row.total_orders,
    points:      row.points,
  };
}

function _toDBRetailer(r) {
  return {
    id:                 r.id,
    client_name:        r.clientName,
    store_name:         r.storeName,
    email:              r.email,
    phone:              r.phone || '',
    location:           r.location || '',
    plan:               r.plan,
    access_code:        r.accessCode || '',
    subscription_start: r.subscriptionStart || null,
    subscription_end:   r.subscriptionEnd || null,
    status:             r.status || 'active',
    monthly_revenue:    r.monthlyRevenue || [],
  };
}

function _fromDBRetailer(row) {
  return {
    id:                row.id,
    clientName:        row.client_name,
    storeName:         row.store_name,
    email:             row.email,
    phone:             row.phone,
    location:          row.location,
    plan:              row.plan,
    accessCode:        row.access_code,
    subscriptionStart: row.subscription_start,
    subscriptionEnd:   row.subscription_end,
    status:            row.status,
    monthlyRevenue:    row.monthly_revenue || [],
  };
}

/* ============================================================
   ONE-TIME SEED FUNCTION
   Run once in browser console: seedSupabase()
   ============================================================ */
async function seedSupabase() {
  console.log('[Seed] Starting Supabase seed from localStorage...');

  /* 1. Retailers */
  const retailers = JSON.parse(localStorage.getItem('sc_retailers') || '[]');
  for (const r of retailers) {
    await supabase.from('retailers').upsert(_toDBRetailer(r), { onConflict: 'id' });
  }
  console.log(`[Seed] Retailers: ${retailers.length} rows`);

  /* 2. Inventory (all 3 stores) */
  let invTotal = 0;
  for (const storeId of ['grocery', 'toy', 'school']) {
    const key = `sc_inventory_${storeId}`;
    const inv = JSON.parse(localStorage.getItem(key) || '[]');
    for (const p of inv) {
      await supabase.from('inventory').upsert(_toDBProduct(storeId, p), { onConflict: 'id' });
    }
    invTotal += inv.length;
  }
  console.log(`[Seed] Inventory: ${invTotal} rows`);

  /* 3. Cashiers */
  const cashierKeys = Object.keys(localStorage).filter(k => k.startsWith('sc_cashiers_'));
  let cashierTotal = 0;
  for (const key of cashierKeys) {
    const clientEmail = key.replace('sc_cashiers_', '');
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    for (const c of list) {
      await supabase.from('cashiers').upsert(_toDBCashier(clientEmail, c), { onConflict: 'id' });
    }
    cashierTotal += list.length;
  }
  console.log(`[Seed] Cashiers: ${cashierTotal} rows`);

  /* 4. Customers */
  const customers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
  for (const c of customers) {
    await supabase.from('customers').upsert(_toDBCustomer(c), { onConflict: 'id' });
  }
  console.log(`[Seed] Customers: ${customers.length} rows`);

  /* 5. Orders (all 3 stores) */
  let orderTotal = 0;
  for (const storeId of ['grocery', 'toy', 'school']) {
    /* try both key patterns used across the codebase */
    const storeOrders = JSON.parse(localStorage.getItem(`sc_orders_${storeId}`) || 'null')
                     || (storeId === (sessionStorage.getItem('sc_selected_store') || 'grocery')
                         ? JSON.parse(localStorage.getItem('sc_orders') || '[]')
                         : []);
    for (const o of storeOrders) {
      await supabase.from('orders').upsert({
        id:            o.id,
        store_id:      storeId,
        cashier_name:  o.cashier || null,
        customer_id:   o.customerId || null,
        customer_name: o.customerName || 'Walk-in',
        /* FIX: include list_name in seed */
        list_name:     o.listName || null,
        items:         o.items || [],
        subtotal:      o.subtotal || 0,
        discount:      o.discount || 0,
        tax:           o.tax || 0,
        total:         o.total || 0,
        status:        o.status || 'completed',
        weight_check:  o.weightCheck || null,
        created_at:    o.date || new Date().toISOString(),
      }, { onConflict: 'id' });
    }
    orderTotal += storeOrders.length;
  }
  console.log(`[Seed] Orders: ${orderTotal} rows`);

  console.log('[Seed] ✅ Done! Check Supabase Table Editor.');
}
