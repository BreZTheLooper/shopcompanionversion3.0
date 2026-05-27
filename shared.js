/**
 * SHOP COMPANION v3.0 — Shared Utilities & Data Layer
 * Supabase-integrated: Inventory, Orders, Retailers, Customers
 * localStorage still used as fast local cache.
 */

/* ============================================================
   DATA STORE — LocalStorage wrapper (still used as cache)
   ============================================================ */
const Store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('sc_' + key)) || null; }
    catch { return null; }
  },
  set(key, val) { localStorage.setItem('sc_' + key, JSON.stringify(val)); },
  remove(key)   { localStorage.removeItem('sc_' + key); }
};

/* ============================================================
   SEED DATA — Populated once if store is empty
   ============================================================ */
function seedData() {
  if (Store.get('seeded_v4')) return;

  Store.set('subscription_plans', [
    { id: 'PLAN_BASIC',   name: 'Basic',   price: 499,  duration: 30, maxProducts: 100, features: ['Inventory', 'Checkout', 'Basic Reports'] },
    { id: 'PLAN_PRO',     name: 'Pro',     price: 999,  duration: 30, maxProducts: 500, features: ['All Basic', 'Advanced Reports', 'Multi-Cashier', 'Customer QR'] },
    { id: 'PLAN_PREMIUM', name: 'Premium', price: 1999, duration: 30, maxProducts: -1,  features: ['All Pro', 'API Access', 'Priority Support', 'Custom Branding'] },
  ]);

  Store.set('retailers', [
    { id: 'R001', clientName: 'Juan Dela Cruz', storeName: 'JDC Grocery',    email: 'jdcgrocery@astech.pro',  phone: '09171234567', location: 'Makati City, Metro Manila',   plan: 'PLAN_BASIC',   accessCode: 'JDC-BAS-2024', subscriptionStart: '2025-01-01', subscriptionEnd: '2027-01-01', status: 'active', monthlyRevenue: [42000,45000,38000,51000,48000,55000] },
    { id: 'R002', clientName: 'Maria Santos',   storeName: 'Toylandia',       email: 'toylandia@astech.pro',   phone: '09181234567', location: 'Quezon City, Metro Manila',   plan: 'PLAN_PRO',     accessCode: 'TOY-PRO-2024', subscriptionStart: '2025-03-15', subscriptionEnd: '2027-09-15', status: 'active', monthlyRevenue: [18000,21000,19500,22000,20000,23000] },
    { id: 'R003', clientName: 'Pedro Reyes',    storeName: 'Hiraya Likhain',  email: 'hirayal@astech.premium', phone: '09191234567', location: 'Cebu City, Cebu',            plan: 'PLAN_PREMIUM', accessCode: 'INK-PRM-2024', subscriptionStart: '2025-06-01', subscriptionEnd: '2027-06-01', status: 'active', monthlyRevenue: [95000,102000,98000,110000,105000,118000] },
  ]);

  Store.set('vouchers', [
    { id: 'VOU001', code: 'SAVE50',   discount: 50, type: 'fixed',   minOrder: 300, active: true  },
    { id: 'VOU002', code: 'SAVE10P',  discount: 10, type: 'percent', minOrder: 200, active: true  },
    { id: 'VOU003', code: 'FREESHIP', discount: 30, type: 'fixed',   minOrder: 500, active: false },
  ]);

  Store.set('orders', []);

  if (!localStorage.getItem('sc_global_customers')) {
    localStorage.setItem('sc_global_customers', JSON.stringify([
      { id: 'GC001', name: 'Mark Santos', email: 'mark@gmail.com', password: 'mark123', phone: '09171111111', joined: '2025-01-10', lastLogin: '2025-05-14', totalOrders: 5,  points: 50 },
      { id: 'GC002', name: 'Ana Reyes',   email: 'ana@gmail.com',  password: 'ana123',  phone: '09182222222', joined: '2025-02-03', lastLogin: '2025-05-10', totalOrders: 3,  points: 30 },
    ]));
  }

  Store.set('seeded_v4', true);
}

/* ============================================================
   WEIGHT MIGRATION
   ============================================================ */
const WEIGHT_MAP = {
  /* JDC Grocery */
  JDC001:530,  JDC002:400,  JDC003:390,  JDC004:75,   JDC005:200,
  JDC006:195,  JDC007:200,  JDC008:200,  JDC009:130,  JDC010:55,
  JDC011:55,   JDC012:40,   JDC013:290,  JDC014:1580, JDC015:60,
  JDC016:20,   JDC017:25,   JDC018:30,   JDC019:25,   JDC020:30,
  JDC021:35,   JDC022:290,  JDC023:80,
  /* Toylandia */
  TL001:450,  TL002:320,  TL003:180,  TL004:550,  TL005:35,
  TL006:500,  TL007:620,  TL008:480,  TL009:850,  TL010:700,
  TL011:380,  TL012:1800, TL013:2500, TL014:950,  TL015:420,
  TL016:550,  TL017:1200, TL018:750,  TL019:600,  TL020:500,
  TL021:150,  TL022:320,  TL023:220,
  /* Hiraya Likhain */
  HL001:110,  HL002:160,  HL003:15,   HL004:15,   HL005:25,
  HL006:12,   HL007:2400, HL008:280,  HL009:5,    HL010:80,
  HL011:1200, HL012:55,   HL013:260,  HL014:20,   HL015:190,
  HL016:180,  HL017:90,   HL018:220,  HL019:65,   HL020:35,
  HL021:180,  HL022:210,  HL023:310,
};

function migrateWeightGrams() {
  const inv = JSON.parse(localStorage.getItem('sc_inventory') || 'null');
  if (!inv) return;
  let changed = false;
  inv.forEach(p => {
    if (p.weightGrams == null && WEIGHT_MAP[p.id] != null) { p.weightGrams = WEIGHT_MAP[p.id]; changed = true; }
  });
  if (changed) localStorage.setItem('sc_inventory', JSON.stringify(inv));
}
migrateWeightGrams();

/* ============================================================
   INVENTORY HELPERS — reads from localStorage cache,
   writes to BOTH localStorage and Supabase
   ============================================================ */
/* Standalone helper — avoids 'this' context loss when Inventory methods
   are called as detached references (e.g. Object.getAll) from admin.js */
function _getStoreId() {
  try { return JSON.parse(sessionStorage.getItem('sc_auth') || '{}')?.user?.storeId || null; } catch { return null; }
}

const Inventory = {
  _storeId() { return _getStoreId(); },

  getAll() {
    const sid = _getStoreId();
    if (sid) return Store.get('inventory_' + sid) || Store.get('inventory') || [];
    return Store.get('inventory') || [];
  },

  save(inv) {
    const sid = _getStoreId();
    if (sid) Store.set('inventory_' + sid, inv);
    Store.set('inventory', inv);
  },

  findById(id)      { return this.getAll().find(p => p.id === id); },
  findByBarcode(bc) { return this.getAll().find(p => p.barcode === bc); },

  add(product) {
    if (!product.weightGrams || isNaN(Number(product.weightGrams)) || Number(product.weightGrams) <= 0) {
      throw new Error('weightGrams is required and must be a positive number');
    }
    product.weightGrams = Number(product.weightGrams);
    const inv = this.getAll();
    product.id = 'P' + String(Date.now()).slice(-6);
    if (!product.lowStockAt) product.lowStockAt = 10;
    inv.push(product);
    this.save(inv);
    /* Sync to Supabase */
    const sid = _getStoreId();
    if (sid && typeof DB !== 'undefined') {
      DB.upsertProduct(sid, product).catch(e => console.warn('[Inventory.add]', e));
    }
    return product;
  },

  update(id, changes) {
    const inv = this.getAll().map(p => p.id === id ? { ...p, ...changes } : p);
    this.save(inv);
    /* Sync to Supabase */
    const sid = _getStoreId();
    const updated = inv.find(p => p.id === id);
    if (sid && updated && typeof DB !== 'undefined') {
      DB.upsertProduct(sid, updated).catch(e => console.warn('[Inventory.update]', e));
    }
  },

  delete(id) {
    this.save(this.getAll().filter(p => p.id !== id));
    if (typeof DB !== 'undefined') {
      DB.deleteProduct(id).catch(e => console.warn('[Inventory.delete]', e));
    }
  },

  deductStock(items) {
    const inv = this.getAll();
    items.forEach(({ id, qty }) => {
      const p = inv.find(x => x.id === id);
      if (p) {
        p.stock = Math.max(0, p.stock - qty);
        /* Sync stock to Supabase per item */
        if (typeof DB !== 'undefined') {
          DB.updateStock(id, p.stock).catch(e => console.warn('[Inventory.deductStock]', e));
        }
      }
    });
    this.save(inv);
  },

  categories()  { return [...new Set(this.getAll().map(p => p.category))].sort(); },
  types(cat)    { return [...new Set(this.getAll().filter(p => !cat || p.category === cat).map(p => p.type))].sort(); },

  isLowStock(p)          { return p.stock > 0 && p.stock <= (p.lowStockAt || 10); },
  isExpired(p)           { return p.expiry && new Date(p.expiry) < new Date(); },
  isExpiringSoon(p, days = 7) {
    if (!p.expiry) return false;
    const diff = (new Date(p.expiry) - new Date()) / 86400000;
    return diff >= 0 && diff <= days;
  }
};

/* ============================================================
   CUSTOMER HELPERS
   ============================================================ */
const Customers = {
  getAll()          { return Store.get('customers') || []; },
  save(c)           { Store.set('customers', c); },
  findById(id)      { return this.getAll().find(c => c.id === id); },
  findByRegCode(rc) { return this.getAll().find(c => c.regCode === rc); },

  add(customer) {
    const list = this.getAll();
    customer.id          = 'C' + String(Date.now()).slice(-6);
    customer.joined      = new Date().toISOString().slice(0,10);
    customer.totalOrders = 0;
    customer.points      = 0;
    customer.regCode     = 'REG-' + uid();
    list.push(customer);
    this.save(list);
    return customer;
  },

  update(id, changes) {
    this.save(this.getAll().map(c => c.id === id ? { ...c, ...changes } : c));
    /* Sync to Supabase */
    if (typeof DB !== 'undefined') {
      DB.updateCustomer(id, changes).catch(e => console.warn('[Customers.update]', e));
    }
  },

  delete(id) { this.save(this.getAll().filter(c => c.id !== id)); },

  addPoints(id, amount) {
    const c = this.findById(id);
    if (!c) return 0;
    const pts = Math.floor(amount / 10);
    this.update(id, { points: (c.points || 0) + pts });
    return pts;
  }
};

/* ============================================================
   ORDERS HELPERS — saves to localStorage + Supabase
   ============================================================ */
const Orders = {
  getAll()  { return Store.get('orders') || []; },
  save(o)   { Store.set('orders', o); },

  add(order) {
    const list = this.getAll();
    order.id   = 'ORD-' + Date.now();
    order.date = new Date().toISOString();
    list.unshift(order);
    this.save(list);
    /* Sync to Supabase */
    try {
      const storeId = JSON.parse(sessionStorage.getItem('sc_auth') || '{}')?.user?.storeId;
      if (storeId && typeof DB !== 'undefined') {
        DB.saveOrder(storeId, order).catch(e => console.warn('[Orders.add]', e));
      }
    } catch(e) { console.warn('[Orders.add storeId]', e); }
    return order;
  },

  todayRevenue() {
    const today = new Date().toISOString().slice(0,10);
    return this.getAll()
      .filter(o => o.date && o.date.slice(0,10) === today)
      .reduce((s, o) => s + (o.total || 0), 0);
  },

  todayCount() {
    const today = new Date().toISOString().slice(0,10);
    return this.getAll().filter(o => o.date && o.date.slice(0,10) === today).length;
  },

  totalRevenue() {
    return this.getAll().reduce((s, o) => s + (o.total || 0), 0);
  }
};

/* ============================================================
   RETAILER HELPERS — saves to localStorage + Supabase
   ============================================================ */
const Retailers = {
  getAll()     { return Store.get('retailers') || []; },
  save(r)      { Store.set('retailers', r); },
  findById(id) { return this.getAll().find(r => r.id === id); },

  add(retailer) {
    const list = this.getAll();
    retailer.id             = 'R' + String(Date.now()).slice(-5);
    retailer.status         = 'active';
    retailer.monthlyRevenue = [0, 0, 0, 0, 0, 0];
    list.push(retailer);
    this.save(list);
    /* Sync to Supabase */
    if (typeof DB !== 'undefined') {
      DB.upsertRetailer(retailer).catch(e => console.warn('[Retailers.add]', e));
    }
    return retailer;
  },

  update(id, changes) {
    const list = this.getAll().map(r => r.id === id ? { ...r, ...changes } : r);
    this.save(list);
    /* Sync to Supabase */
    const updated = list.find(r => r.id === id);
    if (updated && typeof DB !== 'undefined') {
      DB.upsertRetailer(updated).catch(e => console.warn('[Retailers.update]', e));
    }
  },

  delete(id) {
    this.save(this.getAll().filter(r => r.id !== id));
    if (typeof DB !== 'undefined') {
      DB.deleteRetailer(id).catch(e => console.warn('[Retailers.delete]', e));
    }
  },

  isActive(r) {
    if (r.status === 'expired') return false;
    if (!r.subscriptionEnd) return false;
    return new Date(r.subscriptionEnd) >= new Date();
  },

  monthlySubscriptionRevenue() {
    const plans = Store.get('subscription_plans') || [];
    return Retailers.getAll()
      .filter(r => Retailers.isActive(r))
      .reduce((sum, r) => {
        const plan = plans.find(p => p.id === r.plan);
        return sum + (plan ? plan.price : 0);
      }, 0);
  }
};

/* ============================================================
   VOUCHER HELPERS
   ============================================================ */
const Vouchers = {
  getAll()         { return Store.get('vouchers') || []; },
  findByCode(code) { return this.getAll().find(v => v.code === code && v.active); },

  applyDiscount(code, subtotal) {
    const v = this.findByCode(code);
    if (!v) return { discount: 0, valid: false, msg: 'Invalid or expired voucher' };
    if (subtotal < v.minOrder) return { discount: 0, valid: false, msg: `Minimum order ₱${v.minOrder} required` };
    const disc = v.type === 'percent' ? subtotal * (v.discount / 100) : v.discount;
    return { discount: disc, valid: true, msg: `Voucher applied: -${formatPHP(disc)}` };
  }
};

/* ============================================================
   TAX & TOTALS
   ============================================================ */
const TAX_RATE = 0.12;

function calcTotals(items, discountAmt = 0) {
  const subtotal   = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discounted = Math.max(0, subtotal - discountAmt);
  const tax        = discounted * TAX_RATE;
  const total      = discounted + tax;
  return { subtotal, discount: discountAmt, discounted, tax, total };
}

function formatPHP(num) {
  return '₱' + Number(num || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function toast(msg, type = 'info') {
  const icons     = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el        = document.createElement('div');
  el.className    = `toast ${type}`;
  el.innerHTML    = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 300); }, 3200);
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

/* ============================================================
   QR CODE
   ============================================================ */
function generateQR(container, data, size = 200) {
  container.innerHTML = '';
  new QRCode(container, {
    text: typeof data === 'string' ? data : JSON.stringify(data),
    width: size, height: size,
    colorDark: '#1a6bff', colorLight: '#0a0a0f',
    correctLevel: QRCode.CorrectLevel.M
  });
}

function generatePlainQR(container, data, size = 220) {
  container.innerHTML = '';
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  new QRCode(container, {
    text, width: size, height: size,
    colorDark: '#000000', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

/* ============================================================
   ENHANCED SCANNER v2 — ZXing
   ============================================================ */
const Scanner = {
  reader: null, active: false, lastCode: null,
  cooldownMs: 1500, _cooldown: false,

  async start(videoEl, onDecode, opts = {}) {
    if (this.active) await this.stop();
    this.lastCode = null; this._cooldown = false;
    try {
      const ZXing = window.ZXing;
      if (!ZXing) throw new Error('ZXing library not loaded');
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,   ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39, ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,   ZXing.BarcodeFormat.ITF,
      ]);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      this.reader = new ZXing.BrowserMultiFormatReader(hints);
      this.active = true;
      await this.reader.decodeFromVideoDevice(null, videoEl, (result) => {
        if (result && !this._cooldown) {
          const code = result.getText();
          this._cooldown = true;
          setTimeout(() => { this._cooldown = false; }, this.cooldownMs);
          onDecode(code);
        }
      });
      const statusEl = opts.statusEl || null;
      if (statusEl) statusEl.textContent = '📷 Camera active — point at barcode or QR';
    } catch (err) {
      console.warn('Scanner error:', err);
      const msg = err.message?.includes('permission')
        ? 'Camera permission denied. Please allow camera access and retry.'
        : `Camera unavailable: ${err.message || err}`;
      toast(msg, 'error');
      this.active = false;
    }
  },

  async stop() {
    try { if (this.reader) { this.reader.reset(); this.reader = null; } } catch(e) {}
    this.active = false; this.lastCode = null;
  }
};

function manualEntry(prompt_text, onEntry) {
  const val = prompt(prompt_text || 'Enter barcode or QR data manually:');
  if (val && val.trim()) onEntry(val.trim());
}

/* ============================================================
   DEBOUNCE
   ============================================================ */
function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/* ============================================================
   DATE FORMATTING
   ============================================================ */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
}

/* ============================================================
   ID GENERATOR
   ============================================================ */
function uid() { return Math.random().toString(36).slice(2, 9).toUpperCase(); }

/* ============================================================
   THEME TOGGLE
   ============================================================ */
function setTheme(theme) {
  try { localStorage.setItem('sc_theme', theme); } catch(e) {}
  document.documentElement.classList.toggle('light-theme', theme === 'light');
  ['themeToggleAdmin','themeToggleCust','themeToggleDev','themeToggleCashier'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
  });
}

function toggleTheme() {
  const cur  = localStorage.getItem('sc_theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  setTheme(next);
  toast(`${next === 'light' ? 'Light' : 'Dark'} mode enabled`, 'info');
}

function initTheme() {
  const saved = localStorage.getItem('sc_theme');
  if (saved) setTheme(saved);
  else {
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    setTheme(prefersLight ? 'light' : 'dark');
  }
}

/* ============================================================
   ACCESSIBILITY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.access-card[role="button"]');
  cards.forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
    card.addEventListener('touchstart', () => { card.classList.add('touch-active'); }, { passive: true });
    ['touchend','touchcancel','mouseleave','blur'].forEach(ev => {
      card.addEventListener(ev, () => card.classList.remove('touch-active'));
    });
  });
});

window.addEventListener('DOMContentLoaded', initTheme);

/* ============================================================
   SPLASH SCREEN
   ============================================================ */
function initSplash(ms = 5000) {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.addEventListener('click', () => hideSplash(splash));
  setTimeout(() => hideSplash(splash), parseInt(ms, 10) || 5000);
}

function hideSplash(el) {
  if (!el) el = document.getElementById('splash');
  if (!el) return;
  el.classList.add('splash-hidden');
  setTimeout(() => { try { el.remove(); } catch(e) {} }, 600);
}

window.addEventListener('DOMContentLoaded', () => initSplash(5000));

/* ============================================================
   CUSTOMER ACCESS TOKENS
   ============================================================ */
function getCustomerAccessTokens()        { return Store.get('cust_access_tokens') || []; }
function saveCustomerAccessTokens(list)   { Store.set('cust_access_tokens', list || []); }

function createCustomerAccessToken(minutes = 10) {
  const token   = uid();
  const now     = Date.now();
  const expires = now + Math.max(1, parseInt(minutes || 10)) * 60 * 1000;
  const list    = getCustomerAccessTokens();
  const item    = { token, created: now, expires, used: false };
  list.push(item);
  saveCustomerAccessTokens(list);
  return item;
}

function revokeCustomerAccessToken(token) {
  saveCustomerAccessTokens(getCustomerAccessTokens().filter(t => t.token !== token));
}

function validateAndConsumeCustomerAccessToken(token) {
  if (!token) return false;
  const list  = getCustomerAccessTokens();
  const idx   = list.findIndex(t => t.token === token);
  if (idx === -1) return false;
  const entry = list[idx];
  if (entry.used || Date.now() > entry.expires) {
    list.splice(idx, 1); saveCustomerAccessTokens(list); return false;
  }
  list.splice(idx, 1); saveCustomerAccessTokens(list); return true;
}

function initCustomerAccessFromURL() {
  try {
    const hash = window.location.hash || '';
    if (!hash) return;
    const raw  = hash.slice(1);
    const [, qs] = raw.split('?');
    if (!qs) return;
    const params = new URLSearchParams(qs);
    const token  = params.get('access') || params.get('token');
    if (!token) return;
    const exp = params.get('exp');
    if (exp) {
      const expTs = parseInt(exp, 10);
      if (!isNaN(expTs) && Date.now() <= expTs) {
        sessionStorage.setItem('sc_customer_allowed', '1');
        if (typeof navigateTo === 'function') navigateTo('customer');
        toast('Customer access granted — welcome!', 'success');
        history.replaceState(null, '', window.location.pathname + '#customer');
        return;
      } else { toast('Access link expired.', 'error'); return; }
    }
    const ok = validateAndConsumeCustomerAccessToken(token);
    if (ok) {
      sessionStorage.setItem('sc_customer_allowed', '1');
      if (typeof navigateTo === 'function') navigateTo('customer');
      toast('Customer access granted — welcome!', 'success');
      history.replaceState(null, '', window.location.pathname + '#customer');
    } else {
      toast('Invalid or expired access token.', 'error');
    }
  } catch(e) { /* ignore */ }
}

window.addEventListener('DOMContentLoaded', initCustomerAccessFromURL);
