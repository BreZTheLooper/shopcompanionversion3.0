/**
 * SHOP COMPANION v2.0 — Shared Utilities & Data Layer
 * Enhanced: Retailers, Subscriptions, Rewards, Improved Scanner,
 *           Orders, Customers, Inventory helpers
 */

/* ============================================================
   DATA STORE — LocalStorage wrapper
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
  if (Store.get('seeded_v2')) return;

  // ── Subscription Plans ──
  Store.set('subscription_plans', [
    { id: 'PLAN_BASIC',   name: 'Basic',      price: 499,  duration: 30,  maxProducts: 100, features: ['Inventory', 'Checkout', 'Basic Reports'] },
    { id: 'PLAN_PRO',     name: 'Pro',        price: 999,  duration: 30,  maxProducts: 500, features: ['All Basic', 'Advanced Reports', 'Multi-Cashier', 'Customer QR'] },
    { id: 'PLAN_PREMIUM', name: 'Premium',    price: 1999, duration: 30,  maxProducts: -1,  features: ['All Pro', 'API Access', 'Priority Support', 'Custom Branding'] },
  ]);

  // ── Retailers (Clients) ──
  Store.set('retailers', [
    {
      id: 'R001', clientName: 'Juan Dela Cruz', storeName: 'JDC Grocery',
      email: 'jdcgrocery@pro', phone: '09171234567',
      location: 'Makati City, Metro Manila',
      plan: 'PLAN_PRO', accessCode: 'JDC-PRO-2024',
      subscriptionStart: '2024-01-01', subscriptionEnd: '2026-01-01',
      status: 'active', monthlyRevenue: [42000, 45000, 38000, 51000, 48000, 55000]
    },
    {
      id: 'R002', clientName: 'Maria Santos', storeName: 'Toy Kingdom',
      email: 'toykingdom@pro', phone: '09181234567',
      location: 'Quezon City, Metro Manila',
      plan: 'PLAN_BASIC', accessCode: 'TOY-BAS-2024',
      subscriptionStart: '2024-03-15', subscriptionEnd: '2026-09-15',
      status: 'active', monthlyRevenue: [18000, 21000, 19500, 22000, 20000, 23000]
    },
    {
      id: 'R003', clientName: 'Pedro Reyes', storeName: 'School Hub',
      email: 'schoolhub@pro', phone: '09191234567',
      location: 'Cebu City, Cebu',
      plan: 'PLAN_PREMIUM', accessCode: 'SCH-PRM-2024',
      subscriptionStart: '2024-06-01', subscriptionEnd: '2026-06-01',
      status: 'active', monthlyRevenue: [95000, 102000, 98000, 110000, 105000, 118000]
    },
  ]);

  // ── Inventory ──
  Store.set('inventory', [
    { id: 'P001', name: 'Whole Milk (1L)',       barcode: '8901234560011', category: 'Dairy',     type: 'Fresh Milk',    price: 75,  stock: 50, unit: 'bottle', image: '🥛', expiry: '2025-03-15', lowStockAt: 10 },
    { id: 'P002', name: 'White Bread Loaf',      barcode: '8901234560028', category: 'Bakery',    type: 'Sliced Bread',  price: 55,  stock: 30, unit: 'loaf',   image: '🍞', expiry: '2025-02-28', lowStockAt: 8  },
    { id: 'P003', name: 'Organic Eggs (12 pcs)', barcode: '8901234560035', category: 'Dairy',     type: 'Fresh Eggs',    price: 120, stock: 40, unit: 'tray',   image: '🥚', expiry: '2025-03-10', lowStockAt: 10 },
    { id: 'P004', name: 'Cheddar Cheese (200g)', barcode: '8901234560042', category: 'Dairy',     type: 'Cheese',        price: 185, stock: 20, unit: 'pack',   image: '🧀', expiry: '2025-04-01', lowStockAt: 5  },
    { id: 'P005', name: 'Chicken Breast (500g)', barcode: '8901234560059', category: 'Meat',      type: 'Fresh Chicken', price: 210, stock: 25, unit: 'pack',   image: '🍗', expiry: '2025-02-20', lowStockAt: 5  },
    { id: 'P006', name: 'Jasmine Rice (1kg)',    barcode: '8901234560066', category: 'Grains',    type: 'White Rice',    price: 65,  stock: 80, unit: 'bag',    image: '🍚', expiry: '2026-01-01', lowStockAt: 15 },
    { id: 'P007', name: 'Olive Oil (500ml)',     barcode: '8901234560073', category: 'Pantry',    type: 'Cooking Oil',   price: 320, stock: 15, unit: 'bottle', image: '🫒', expiry: '2026-06-01', lowStockAt: 5  },
    { id: 'P008', name: 'Pasta (500g)',          barcode: '8901234560080', category: 'Grains',    type: 'Dry Pasta',     price: 45,  stock: 60, unit: 'pack',   image: '🍝', expiry: '2026-01-01', lowStockAt: 10 },
    { id: 'P009', name: 'Tomato Sauce (250g)',   barcode: '8901234560097', category: 'Pantry',    type: 'Canned Goods',  price: 35,  stock: 45, unit: 'can',    image: '🥫', expiry: '2026-03-01', lowStockAt: 10 },
    { id: 'P010', name: 'Orange Juice (1L)',     barcode: '8901234560103', category: 'Beverages', type: 'Fruit Juice',   price: 95,  stock: 35, unit: 'bottle', image: '🍊', expiry: '2025-04-15', lowStockAt: 8  },
    { id: 'P011', name: 'Greek Yogurt (200g)',   barcode: '8901234560110', category: 'Dairy',     type: 'Yogurt',        price: 85,  stock: 8,  unit: 'cup',    image: '🍦', expiry: '2025-03-05', lowStockAt: 5  },
    { id: 'P012', name: 'Banana (per kg)',       barcode: '8901234560127', category: 'Produce',   type: 'Fruits',        price: 60,  stock: 55, unit: 'kg',     image: '🍌', expiry: '2025-02-25', lowStockAt: 10 },
    { id: 'P013', name: 'Apple Fuji (per kg)',   barcode: '8901234560134', category: 'Produce',   type: 'Fruits',        price: 110, stock: 40, unit: 'kg',     image: '🍎', expiry: '2025-03-20', lowStockAt: 8  },
    { id: 'P014', name: 'Instant Noodles',       barcode: '8901234560141', category: 'Pantry',    type: 'Noodles',       price: 15,  stock: 5,  unit: 'pack',   image: '🍜', expiry: '2026-01-01', lowStockAt: 20 },
    { id: 'P015', name: 'Bottled Water (1.5L)',  barcode: '8901234560158', category: 'Beverages', type: 'Water',         price: 25,  stock: 90, unit: 'bottle', image: '💧', expiry: '2027-01-01', lowStockAt: 20 },
    { id: 'P016', name: 'Mineral Water (500ml)', barcode: '4800049720114', category: 'Beverages', type: 'Water',         price: 20,  stock: 60, unit: 'bottle', image: '💧', expiry: '2027-06-01', lowStockAt: 15 },
    { id: 'P017', name: 'Wipes',                 barcode: '4806525540948', category: 'Hygiene',   type: 'Wipes',         price: 45,  stock: 40, unit: 'pack',   image: '🧻', expiry: '2026-12-01', lowStockAt: 10 },
    { id: 'P018', name: 'Face Powder (50g)',      barcode: '4800047862533', category: 'Hygiene',   type: 'Cosmetics',     price: 120, stock: 25, unit: 'pack',   image: '🪥', expiry: '2027-03-01', lowStockAt: 5  },
  ]);

  // ── Customers ──
  Store.set('customers', [
    { id: 'C001', name: 'Maria Santos',  email: 'maria@email.com',  phone: '09171234567', joined: '2024-01-15', totalOrders: 12, points: 240, regCode: 'REG-001' },
    { id: 'C002', name: 'Jose Reyes',   email: 'jose@email.com',   phone: '09181234567', joined: '2024-02-20', totalOrders: 8,  points: 160, regCode: 'REG-002' },
    { id: 'C003', name: 'Ana Cruz',     email: 'ana@email.com',    phone: '09191234567', joined: '2024-03-10', totalOrders: 5,  points: 100, regCode: 'REG-003' },
  ]);

  // ── Vouchers ──
  Store.set('vouchers', [
    { id: 'VOU001', code: 'SAVE50',  discount: 50,  type: 'fixed',   minOrder: 300,  active: true  },
    { id: 'VOU002', code: 'SAVE10P', discount: 10,  type: 'percent', minOrder: 200,  active: true  },
    { id: 'VOU003', code: 'FREESHIP', discount: 30, type: 'fixed',   minOrder: 500,  active: false },
  ]);

  Store.set('orders', []);

  // ── Global Customers (for Developer Customers tab + Customer login) ──
  if (!localStorage.getItem('sc_global_customers')) {
    localStorage.setItem('sc_global_customers', JSON.stringify([
      { id: 'GC001', name: 'Mark Santos',  email: 'mark@gmail.com',  password: 'mark123', phone: '09171111111', joined: '2025-01-10', lastLogin: '2025-05-14', totalOrders: 5,  points: 50 },
      { id: 'GC002', name: 'Ana Reyes',    email: 'ana@gmail.com',   password: 'ana123',  phone: '09182222222', joined: '2025-02-03', lastLogin: '2025-05-10', totalOrders: 3,  points: 30 },
    ]));
  }

  Store.set('seeded_v2', true);
}

/* ============================================================
   INVENTORY HELPERS
   ============================================================ */
const Inventory = {
  getAll()  { return Store.get('inventory') || []; },
  save(inv) { Store.set('inventory', inv); },

  findById(id)        { return this.getAll().find(p => p.id === id); },
  findByBarcode(bc)   { return this.getAll().find(p => p.barcode === bc); },

  add(product) {
    const inv = this.getAll();
    product.id = 'P' + String(Date.now()).slice(-6);
    if (!product.lowStockAt) product.lowStockAt = 10;
    inv.push(product);
    this.save(inv);
    return product;
  },

  update(id, changes) {
    const inv = this.getAll().map(p => p.id === id ? { ...p, ...changes } : p);
    this.save(inv);
  },

  delete(id) { this.save(this.getAll().filter(p => p.id !== id)); },

  deductStock(items) {
    const inv = this.getAll();
    items.forEach(({ id, qty }) => {
      const p = inv.find(x => x.id === id);
      if (p) p.stock = Math.max(0, p.stock - qty);
    });
    this.save(inv);
  },

  categories()  { return [...new Set(this.getAll().map(p => p.category))].sort(); },
  types(cat)    { return [...new Set(this.getAll().filter(p => !cat || p.category === cat).map(p => p.type))].sort(); },

  isLowStock(p) { return p.stock > 0 && p.stock <= (p.lowStockAt || 10); },
  isExpired(p)  { return p.expiry && new Date(p.expiry) < new Date(); },
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
  getAll()  { return Store.get('customers') || []; },
  save(c)   { Store.set('customers', c); },
  findById(id)      { return this.getAll().find(c => c.id === id); },
  findByRegCode(rc) { return this.getAll().find(c => c.regCode === rc); },

  add(customer) {
    const list = this.getAll();
    customer.id       = 'C' + String(Date.now()).slice(-6);
    customer.joined   = new Date().toISOString().slice(0,10);
    customer.totalOrders = 0;
    customer.points   = 0;
    customer.regCode  = 'REG-' + uid();
    list.push(customer);
    this.save(list);
    return customer;
  },

  update(id, changes) {
    this.save(this.getAll().map(c => c.id === id ? { ...c, ...changes } : c));
  },

  delete(id) { this.save(this.getAll().filter(c => c.id !== id)); },

  /** Add reward points (1 point per peso spent) */
  addPoints(id, amount) {
    const c = this.findById(id);
    if (!c) return;
    const pts = Math.floor(amount / 10); // 1 point per ₱10
    this.update(id, { points: (c.points || 0) + pts });
    return pts;
  }
};

/* ============================================================
   ORDERS HELPERS
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
   RETAILER HELPERS (Developer/Admin panel)
   ============================================================ */
const Retailers = {
  getAll()  { return Store.get('retailers') || []; },
  save(r)   { Store.set('retailers', r); },
  findById(id) { return this.getAll().find(r => r.id === id); },

  add(retailer) {
    const list = this.getAll();
    retailer.id = 'R' + String(Date.now()).slice(-5);
    retailer.status = 'active';
    retailer.monthlyRevenue = [0, 0, 0, 0, 0, 0];
    list.push(retailer);
    this.save(list);
    return retailer;
  },

  update(id, changes) {
    this.save(this.getAll().map(r => r.id === id ? { ...r, ...changes } : r));
  },

  delete(id) { this.save(this.getAll().filter(r => r.id !== id)); },

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
  getAll()   { return Store.get('vouchers') || []; },
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
const TAX_RATE = 0.12; // 12% VAT

function calcTotals(items, discountAmt = 0) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discounted = Math.max(0, subtotal - discountAmt);
  const tax  = discounted * TAX_RATE;
  const total = discounted + tax;
  return { subtotal, discount: discountAmt, discounted, tax, total };
}

function formatPHP(num) {
  return '₱' + Number(num || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

/* ============================================================
   QR CODE — Generate using qrcode.js (CDN)
   ============================================================ */
function generateQR(container, data, size = 200) {
  container.innerHTML = '';
  new QRCode(container, {
    text: typeof data === 'string' ? data : JSON.stringify(data),
    width: size, height: size,
    colorDark: '#1a6bff',
    colorLight: '#0a0a0f',
    correctLevel: QRCode.CorrectLevel.M
  });
}

/** High-contrast black-on-white QR for maximum scanning reliability */
function generatePlainQR(container, data, size = 220) {
  container.innerHTML = '';
  // Compress payload to reduce QR density and improve scan speed
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  new QRCode(container, {
    text,
    width: size, height: size,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M  // Medium = smaller QR, faster scan
  });
}

/* ============================================================
   ENHANCED SCANNER v2 — ZXing with debounce, cooldown, manual fallback
   ============================================================ */
const Scanner = {
  reader:     null,
  active:     false,
  lastCode:   null,
  cooldownMs: 1500, // prevent duplicate scans
  _cooldown:  false,

  async start(videoEl, onDecode, opts = {}) {
    if (this.active) await this.stop();
    this.lastCode = null;
    this._cooldown = false;

    try {
      const ZXing = window.ZXing;
      if (!ZXing) throw new Error('ZXing library not loaded');

      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.QR_CODE,
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.ITF,
      ]);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

      this.reader = new ZXing.BrowserMultiFormatReader(hints);
      this.active = true;

      await this.reader.decodeFromVideoDevice(null, videoEl, (result, err) => {
        if (result && !this._cooldown) {
          const code = result.getText();
          this._cooldown = true;
          setTimeout(() => { this._cooldown = false; }, this.cooldownMs);
          onDecode(code);
        }
      });

      // Update scan status indicator if present
      const statusEl = opts.statusEl || null;
      if (statusEl) statusEl.textContent = '📷 Camera active — point at barcode or QR';

    } catch (err) {
      console.warn('Scanner error:', err);
      const msg = err.message && err.message.includes('permission')
        ? 'Camera permission denied. Please allow camera access and retry.'
        : `Camera unavailable: ${err.message || err}`;
      toast(msg, 'error');
      this.active = false;
    }
  },

  async stop() {
    try {
      if (this.reader) {
        this.reader.reset();
        this.reader = null;
      }
    } catch(e) { /* ignore */ }
    this.active = false;
    this.lastCode = null;
  }
};

/* Manual barcode/QR entry fallback */
function manualEntry(prompt_text, onEntry) {
  const val = prompt(prompt_text || 'Enter barcode or QR data manually:');
  if (val && val.trim()) onEntry(val.trim());
}

/* ============================================================
   DEBOUNCE UTILITY
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
  ['themeToggleAdmin', 'themeToggleCust', 'themeToggleDev', 'themeToggleCashier'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
  });
}

function toggleTheme() {
  const cur = localStorage.getItem('sc_theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  setTheme(next);
  toast(`${next === 'light' ? 'Light' : 'Dark'} mode enabled`, 'info');
}

function initTheme() {
  const saved = localStorage.getItem('sc_theme');
  if (saved) setTheme(saved);
  else {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(prefersLight ? 'light' : 'dark');
  }
}

/* ============================================================
   Accessibility helpers: make .access-card keyboard/touch actionable
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.access-card[role="button"]');
  cards.forEach(card => {
    // Keyboard activation (Enter / Space)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });

    // Touch feedback: add active class on touchstart, remove on touchend/cancel
    card.addEventListener('touchstart', () => {
      card.classList.add('touch-active');
    }, { passive: true });
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
   CUSTOMER ACCESS TOKENS (one-time QR access from cashier)
   ============================================================ */
function getCustomerAccessTokens() { return Store.get('cust_access_tokens') || []; }
function saveCustomerAccessTokens(list) { Store.set('cust_access_tokens', list || []); }

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
  const list = getCustomerAccessTokens();
  const idx  = list.findIndex(t => t.token === token);
  if (idx === -1) return false;
  const entry = list[idx];
  if (entry.used || Date.now() > entry.expires) {
    list.splice(idx, 1);
    saveCustomerAccessTokens(list);
    return false;
  }
  list.splice(idx, 1);
  saveCustomerAccessTokens(list);
  return true;
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
      } else {
        toast('Access link expired.', 'error');
        return;
      }
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
