/**
 * SHOP COMPANION v2.0 — Authentication & Multi-Store System
 * Handles: Client login, Cashier login, Customer global auth,
 *          Store selector, Multi-store inventory isolation,
 *          Developer monitoring panel
 * NON-DESTRUCTIVE: All existing logic preserved and extended.
 */

/* ============================================================
   DEMO ACCOUNTS & STORE DEFINITIONS
   ============================================================ */
const AUTH_CONFIG = {
  developer: {
    pin: '363738'
  },

  clients: {
    'jdcgrocery@astech.pro':     { password: 'jdcgrocery', storeId: 'grocery', storeName: 'JDC Grocery',  plan: 'basic'   },
    'toylandia@astech.pro':      { password: 'toylandia',  storeId: 'toy',     storeName: 'Toylandia',    plan: 'pro'     },
    'hirayal@astech.premium':    { password:   'hirayal',    storeId: 'school',  storeName: 'Hiraya Likhain',     plan: 'premium' }
  },

  cashiers: {
    'mariasantos@jdcgrocery.cashier.pro':  { password: 'maria333',    storeId: 'grocery', storeName: 'JDC Grocery', clientEmail: 'jdcgrocery@astech.pro'  },
    'markreyes@toylandia.cashier.pro':     { password: 'markreyes',   storeId: 'toy',     storeName: 'Toylandia',   clientEmail: 'toylandia@astech.pro'    },
    'junecruz@hirayal.cashier.premium':    { password: 'junecruz123', storeId: 'school',  storeName: 'Hiraya Likhain',    clientEmail: 'hirayal@astech.premium'  }
  }
};

/* ============================================================
   MULTI-STORE INVENTORY DEFINITIONS
   ============================================================ */
const STORE_DEFINITIONS = {
  grocery: {
    id: 'grocery',
    name: 'JDC Grocery',
    icon: '🛒',
    description: 'Fresh produce, beverages & household essentials',
    color: '#1de98b',
    categories: ['Beverages', 'Snacks', 'Household Items'],
    inventory: [
      { id: 'GR001', name: 'Mineral Water (1.5L)',    barcode: 'GR8901234001', category: 'Beverages',       type: 'Water',          price: 25,  stock: 90, unit: 'bottle', image: '💧', expiry: '2027-01-01', lowStockAt: 20, weightGrams: 1510 },
      { id: 'GR002', name: 'Orange Juice (1L)',        barcode: 'GR8901234002', category: 'Beverages',       type: 'Fruit Juice',    price: 95,  stock: 35, unit: 'bottle', image: '🍊', expiry: '2025-09-15', lowStockAt: 8,  weightGrams: 1050 },
      { id: 'GR003', name: 'Cola Soda (330ml)',        barcode: 'GR8901234003', category: 'Beverages',       type: 'Soda',           price: 35,  stock: 60, unit: 'can',    image: '🥤', expiry: '2026-06-01', lowStockAt: 10, weightGrams: 370  },
      { id: 'GR004', name: 'Coffee Sachet (10s)',      barcode: 'GR8901234004', category: 'Beverages',       type: 'Coffee',         price: 65,  stock: 40, unit: 'pack',   image: '☕', expiry: '2026-03-01', lowStockAt: 8,  weightGrams: 200  },
      { id: 'GR005', name: 'Milk Tea Bottle (350ml)',  barcode: 'GR8901234005', category: 'Beverages',       type: 'Tea',            price: 55,  stock: 25, unit: 'bottle', image: '🧋', expiry: '2025-08-01', lowStockAt: 5,  weightGrams: 380  },
      { id: 'GR006', name: 'Potato Chips (60g)',       barcode: 'GR8901234006', category: 'Snacks',          type: 'Chips',          price: 35,  stock: 80, unit: 'pack',   image: '🥔', expiry: '2025-12-01', lowStockAt: 15, weightGrams: 60   },
      { id: 'GR007', name: 'Peanut Butter Crackers',  barcode: 'GR8901234007', category: 'Snacks',          type: 'Crackers',       price: 28,  stock: 50, unit: 'pack',   image: '🥜', expiry: '2025-11-01', lowStockAt: 10, weightGrams: 120  },
      { id: 'GR008', name: 'Chocolate Bar (45g)',      barcode: 'GR8901234008', category: 'Snacks',          type: 'Chocolate',      price: 45,  stock: 70, unit: 'bar',    image: '🍫', expiry: '2026-01-01', lowStockAt: 10, weightGrams: 45   },
      { id: 'GR009', name: 'Instant Noodles',         barcode: 'GR8901234009', category: 'Snacks',          type: 'Noodles',        price: 15,  stock: 5,  unit: 'pack',   image: '🍜', expiry: '2026-06-01', lowStockAt: 20, weightGrams: 85   },
      { id: 'GR010', name: 'Corn Snacks (50g)',        barcode: 'GR8901234010', category: 'Snacks',          type: 'Chips',          price: 22,  stock: 45, unit: 'pack',   image: '🌽', expiry: '2025-10-01', lowStockAt: 10, weightGrams: 50   },
      { id: 'GR011', name: 'Dishwashing Liquid (500ml)',barcode:'GR8901234011', category: 'Household Items', type: 'Cleaning',       price: 85,  stock: 30, unit: 'bottle', image: '🧴', expiry: '2027-06-01', lowStockAt: 5,  weightGrams: 540  },
      { id: 'GR012', name: 'Laundry Detergent (1kg)', barcode: 'GR8901234012', category: 'Household Items', type: 'Laundry',        price: 120, stock: 20, unit: 'pack',   image: '🧺', expiry: '2027-01-01', lowStockAt: 5,  weightGrams: 1020 },
      { id: 'GR013', name: 'Fabric Softener (350ml)', barcode: 'GR8901234013', category: 'Household Items', type: 'Laundry',        price: 75,  stock: 15, unit: 'bottle', image: '🌸', expiry: '2027-01-01', lowStockAt: 5,  weightGrams: 370  },
      { id: 'GR014', name: 'Toilet Tissue (12 rolls)',barcode: 'GR8901234014', category: 'Household Items', type: 'Paper Goods',    price: 145, stock: 40, unit: 'pack',   image: '🧻', expiry: '2028-01-01', lowStockAt: 8,  weightGrams: 900  },
      { id: 'GR015', name: 'Hand Soap (250ml)',        barcode: 'GR8901234015', category: 'Household Items', type: 'Personal Care',  price: 55,  stock: 8,  unit: 'bottle', image: '🧼', expiry: '2026-12-01', lowStockAt: 5,  weightGrams: 280  },
    ]
  },

  toy: {
    id: 'toy',
    name: 'Toylandia',
    icon: '🧸',
    description: 'Action figures, educational toys & board games',
    color: '#ffd94d',
    categories: ['Action Figures', 'Educational Toys', 'Board Games'],
    inventory: [
      { id: 'TY001', name: 'Superhero Action Figure',  barcode: 'TY8901234001', category: 'Action Figures',   type: 'Superhero',      price: 299, stock: 25, unit: 'pc',   image: '🦸', expiry: null, lowStockAt: 5,  weightGrams: 180  },
      { id: 'TY002', name: 'Dinosaur Set (6 pcs)',     barcode: 'TY8901234002', category: 'Action Figures',   type: 'Dinosaur',       price: 450, stock: 15, unit: 'set',  image: '🦕', expiry: null, lowStockAt: 3,  weightGrams: 350  },
      { id: 'TY003', name: 'Robot Transformer',        barcode: 'TY8901234003', category: 'Action Figures',   type: 'Robot',          price: 650, stock: 10, unit: 'pc',   image: '🤖', expiry: null, lowStockAt: 3,  weightGrams: 420  },
      { id: 'TY004', name: 'Fantasy Knight Figure',    barcode: 'TY8901234004', category: 'Action Figures',   type: 'Fantasy',        price: 380, stock: 20, unit: 'pc',   image: '⚔️', expiry: null, lowStockAt: 4,  weightGrams: 210  },
      { id: 'TY005', name: 'Race Car Set (4 pcs)',     barcode: 'TY8901234005', category: 'Action Figures',   type: 'Vehicles',       price: 320, stock: 18, unit: 'set',  image: '🏎️', expiry: null, lowStockAt: 4,  weightGrams: 280  },
      { id: 'TY006', name: 'Alphabet Blocks (26 pcs)',barcode: 'TY8901234006', category: 'Educational Toys', type: 'Learning',       price: 280, stock: 30, unit: 'set',  image: '🔤', expiry: null, lowStockAt: 5,  weightGrams: 520  },
      { id: 'TY007', name: 'Math Puzzle Board',        barcode: 'TY8901234007', category: 'Educational Toys', type: 'Math',           price: 350, stock: 22, unit: 'pc',   image: '🧩', expiry: null, lowStockAt: 5,  weightGrams: 380  },
      { id: 'TY008', name: 'Science Kit (Beginner)',   barcode: 'TY8901234008', category: 'Educational Toys', type: 'Science',        price: 750, stock: 8,  unit: 'kit',  image: '🔬', expiry: null, lowStockAt: 3,  weightGrams: 650  },
      { id: 'TY009', name: 'Coding Robot (Ages 6+)',  barcode: 'TY8901234009', category: 'Educational Toys', type: 'STEM',           price: 1200,stock: 5,  unit: 'pc',   image: '💻', expiry: null, lowStockAt: 2,  weightGrams: 820  },
      { id: 'TY010', name: 'Globe with Stand',         barcode: 'TY8901234010', category: 'Educational Toys', type: 'Geography',      price: 550, stock: 12, unit: 'pc',   image: '🌍', expiry: null, lowStockAt: 3,  weightGrams: 950  },
      { id: 'TY011', name: 'Monopoly Classic',         barcode: 'TY8901234011', category: 'Board Games',      type: 'Strategy',       price: 850, stock: 14, unit: 'box',  image: '🎲', expiry: null, lowStockAt: 3,  weightGrams: 1100 },
      { id: 'TY012', name: 'Scrabble Deluxe',          barcode: 'TY8901234012', category: 'Board Games',      type: 'Word Game',      price: 650, stock: 10, unit: 'box',  image: '📝', expiry: null, lowStockAt: 2,  weightGrams: 870  },
      { id: 'TY013', name: 'Chess Set Wooden',         barcode: 'TY8901234013', category: 'Board Games',      type: 'Strategy',       price: 480, stock: 7,  unit: 'set',  image: '♟️', expiry: null, lowStockAt: 2,  weightGrams: 760  },
      { id: 'TY014', name: 'Jenga Tower',              barcode: 'TY8901234014', category: 'Board Games',      type: 'Dexterity',      price: 395, stock: 16, unit: 'set',  image: '🏗️', expiry: null, lowStockAt: 3,  weightGrams: 480  },
      { id: 'TY015', name: 'Card Game (50 cards)',     barcode: 'TY8901234015', category: 'Board Games',      type: 'Card Game',      price: 180, stock: 30, unit: 'pack', image: '🃏', expiry: null, lowStockAt: 5,  weightGrams: 120  },
    ]
  },

  school: {
    id: 'school',
    name: 'Hiraya Likhain',
    icon: '📚',
    description: 'Notebooks, writing tools & art materials',
    color: '#4d8fff',
    categories: ['Notebooks', 'Writing Tools', 'Art Materials'],
    inventory: [
      { id: 'SC001', name: 'Composition Notebook (80lvs)', barcode:'SC8901234001', category: 'Notebooks',     type: 'Composition',    price: 45,  stock: 100,unit: 'pc',   image: '📓', expiry: null, lowStockAt: 20, weightGrams: 180  },
      { id: 'SC002', name: 'Spiral Notebook (200 lvs)',   barcode: 'SC8901234002', category: 'Notebooks',     type: 'Spiral',         price: 85,  stock: 60, unit: 'pc',   image: '📔', expiry: null, lowStockAt: 10, weightGrams: 320  },
      { id: 'SC003', name: 'Pad Paper (80 sheets)',       barcode: 'SC8901234003', category: 'Notebooks',     type: 'Pad Paper',      price: 35,  stock: 80, unit: 'pad',  image: '📋', expiry: null, lowStockAt: 15, weightGrams: 250  },
      { id: 'SC004', name: 'Index Cards (100 pcs)',       barcode: 'SC8901234004', category: 'Notebooks',     type: 'Index Cards',    price: 28,  stock: 55, unit: 'pack', image: '🗂️', expiry: null, lowStockAt: 10, weightGrams: 140  },
      { id: 'SC005', name: 'Journal Hardcover',           barcode: 'SC8901234005', category: 'Notebooks',     type: 'Journal',        price: 180, stock: 25, unit: 'pc',   image: '📒', expiry: null, lowStockAt: 5,  weightGrams: 420  },
      { id: 'SC006', name: 'Ballpen (Black, 12 pcs)',     barcode: 'SC8901234006', category: 'Writing Tools', type: 'Ballpen',        price: 55,  stock: 120,unit: 'box',  image: '🖊️', expiry: null, lowStockAt: 20, weightGrams: 130  },
      { id: 'SC007', name: 'Pencil Set (HB, 12 pcs)',     barcode: 'SC8901234007', category: 'Writing Tools', type: 'Pencil',         price: 45,  stock: 90, unit: 'box',  image: '✏️', expiry: null, lowStockAt: 15, weightGrams: 110  },
      { id: 'SC008', name: 'Highlighter Set (5 colors)',  barcode: 'SC8901234008', category: 'Writing Tools', type: 'Highlighter',    price: 75,  stock: 40, unit: 'set',  image: '🖍️', expiry: null, lowStockAt: 8,  weightGrams: 95   },
      { id: 'SC009', name: 'Permanent Marker (Black)',    barcode: 'SC8901234009', category: 'Writing Tools', type: 'Marker',         price: 35,  stock: 65, unit: 'pc',   image: '🖋️', expiry: null, lowStockAt: 10, weightGrams: 35   },
      { id: 'SC010', name: 'Correction Tape',             barcode: 'SC8901234010', category: 'Writing Tools', type: 'Correction',     price: 28,  stock: 50, unit: 'pc',   image: '📎', expiry: null, lowStockAt: 10, weightGrams: 25   },
      { id: 'SC011', name: 'Watercolor Set (24 colors)',  barcode: 'SC8901234011', category: 'Art Materials', type: 'Watercolor',     price: 125, stock: 30, unit: 'set',  image: '🎨', expiry: null, lowStockAt: 5,  weightGrams: 380  },
      { id: 'SC012', name: 'Oil Pastels (24 pcs)',        barcode: 'SC8901234012', category: 'Art Materials', type: 'Pastels',        price: 95,  stock: 25, unit: 'box',  image: '🖼️', expiry: null, lowStockAt: 5,  weightGrams: 290  },
      { id: 'SC013', name: 'Sketchpad A4 (30 sheets)',   barcode: 'SC8901234013', category: 'Art Materials', type: 'Sketchpad',      price: 65,  stock: 40, unit: 'pad',  image: '🗒️', expiry: null, lowStockAt: 8,  weightGrams: 310  },
      { id: 'SC014', name: 'Ruler 30cm Metal',            barcode: 'SC8901234014', category: 'Art Materials', type: 'Measuring',      price: 45,  stock: 35, unit: 'pc',   image: '📏', expiry: null, lowStockAt: 5,  weightGrams: 85   },
      { id: 'SC015', name: 'Scissors (Stainless)',        barcode: 'SC8901234015', category: 'Art Materials', type: 'Cutting',        price: 55,  stock: 28, unit: 'pc',   image: '✂️', expiry: null, lowStockAt: 5,  weightGrams: 110  },
    ]
  }
};

/* ============================================================
   AUTH STATE
   ============================================================ */
const AuthState = {
  currentRole: null,      // 'developer' | 'client' | 'cashier' | 'customer'
  currentUser: null,      // { email, storeId, storeName, role }
  currentStore: null,     // store definition object
  isAuthenticated: false,

  set(role, user, store) {
    this.currentRole = role;
    this.currentUser = user;
    this.currentStore = store;
    this.isAuthenticated = true;
    try {
      sessionStorage.setItem('sc_auth', JSON.stringify({ role, user }));
    } catch(e) {}
  },

  clear() {
    this.currentRole = null;
    this.currentUser = null;
    this.currentStore = null;
    this.isAuthenticated = false;
    try { sessionStorage.removeItem('sc_auth'); } catch(e) {}
  },

  restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('sc_auth'));
      if (saved && saved.role && saved.user) {
        this.currentRole = saved.role;
        this.currentUser = saved.user;
        if (saved.user.storeId) {
          this.currentStore = STORE_DEFINITIONS[saved.user.storeId] || null;
        }
        this.isAuthenticated = true;
        return true;
      }
    } catch(e) {}
    return false;
  }
};

/* ============================================================
   MULTI-STORE INVENTORY SYSTEM
   ============================================================ */
const MultiStore = {
  // Get inventory for a specific store
  getInventory(storeId) {
    const key = `sc_inventory_${storeId}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && saved.length > 0) return saved;
    } catch(e) {}
    // Return fresh seed data for this store
    return STORE_DEFINITIONS[storeId]?.inventory?.map(p => ({...p})) || [];
  },

  saveInventory(storeId, inventory) {
    const key = `sc_inventory_${storeId}`;
    localStorage.setItem(key, JSON.stringify(inventory));
  },

  // Get orders for a specific store
  getOrders(storeId) {
    try {
      return JSON.parse(localStorage.getItem(`sc_orders_${storeId}`)) || [];
    } catch(e) { return []; }
  },

  saveOrders(storeId, orders) {
    localStorage.setItem(`sc_orders_${storeId}`, JSON.stringify(orders));
  },

  // Get cashiers managed by a client
  getCashiers(clientEmail) {
    try {
      return JSON.parse(localStorage.getItem(`sc_cashiers_${clientEmail}`)) || [];
    } catch(e) { return []; }
  },

  saveCashiers(clientEmail, cashiers) {
    localStorage.setItem(`sc_cashiers_${clientEmail}`, JSON.stringify(cashiers));
  },

  // Get all stores for developer overview
  getAllStores() {
    return Object.values(STORE_DEFINITIONS);
  },

  // Cart per store
  getCart(storeId) {
    try {
      return JSON.parse(sessionStorage.getItem(`sc_cart_${storeId}`)) || [];
    } catch(e) { return []; }
  },

  saveCart(storeId, cart) {
    sessionStorage.setItem(`sc_cart_${storeId}`, JSON.stringify(cart));
  }
};

/* ============================================================
   SEED MULTI-STORE DATA
   ============================================================ */
function seedMultiStoreData() {
  // Build a flat weight lookup map from all store definitions
  const STORE_WEIGHT_MAP = {};
  Object.values(STORE_DEFINITIONS).forEach(store => {
    (store.inventory || []).forEach(p => {
      if (p.weightGrams != null) STORE_WEIGHT_MAP[p.id] = p.weightGrams;
    });
  });

  // Only seed if not already done; also migrate weightGrams on existing data
  Object.keys(STORE_DEFINITIONS).forEach(storeId => {
    const key = `sc_inventory_${storeId}`;
    const existing = localStorage.getItem(key);
    if (!existing) {
      // Fresh seed — write definition data (already has weightGrams)
      MultiStore.saveInventory(storeId, STORE_DEFINITIONS[storeId].inventory.map(p => ({...p})));
    } else {
      // Already seeded — migrate any items missing weightGrams
      try {
        const inv = JSON.parse(existing);
        let changed = false;
        inv.forEach(p => {
          if (p.weightGrams == null && STORE_WEIGHT_MAP[p.id] != null) {
            p.weightGrams = STORE_WEIGHT_MAP[p.id];
            changed = true;
          }
        });
        if (changed) localStorage.setItem(key, JSON.stringify(inv));
      } catch(e) {
        // Corrupt data — re-seed cleanly
        MultiStore.saveInventory(storeId, STORE_DEFINITIONS[storeId].inventory.map(p => ({...p})));
      }
    }
  });

  // Seed demo customers — always ensure the demo accounts are present.
  // We merge rather than skip so stale/old localStorage data can't
  // block the demo accounts from logging in.
  const demoCustomers = [
    { id: 'GC001', name: 'Mark Santos', email: 'mark@gmail.com', password: 'mark123', phone: '09171234567', joined: '2024-01-15', totalOrders: 12, points: 240 },
    { id: 'GC002', name: 'Ana Reyes',   email: 'ana@gmail.com',  password: 'ana123',      phone: '09181234567', joined: '2024-02-10', totalOrders: 5,  points: 100 },
    { id: 'GC003', name: 'Jose Cruz',   email: 'jose@gmail.com', password: 'jose123',     phone: '09191234567', joined: '2024-03-20', totalOrders: 8,  points: 180 },
  ];
  try {
    let existing = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
    if (!Array.isArray(existing)) existing = [];
    demoCustomers.forEach(demo => {
      const idx = existing.findIndex(c => c.id === demo.id);
      if (idx === -1) {
        existing.push(demo);
      } else if (!existing[idx].password) {
        existing[idx].password = demo.password;
      }
    });
    localStorage.setItem('sc_global_customers', JSON.stringify(existing));
  } catch(e) {
    localStorage.setItem('sc_global_customers', JSON.stringify(demoCustomers));
  }
}

/* ============================================================
   AUTHENTICATION FUNCTIONS
   ============================================================ */

// Show login screen for a specific role
function showAuthScreen(role) {
  // Hide all views first
  document.getElementById('view-selector')?.classList.add('hidden');
  document.getElementById('auth-screen')?.classList.remove('hidden');

  const screen = document.getElementById('auth-screen');
  const configs = {
    client: {
      title: 'Client Login',
      subtitle: 'Store Owner / Retailer Access',
      icon: '<img src="assets/Client_Icon.png" alt="Client" style="width:64px;height:64px;object-fit:contain;border-radius:16px;">',
      placeholder: 'storename@astech.pro',
      hint: 'e.g. jdcgrocery@astech.pro',
      color: '#1de98b'
    },
    cashier: {
      title: 'Cashier Login',
      subtitle: 'Point of Sale Access',
      icon: '<img src="assets/Cashier_Icon.png" alt="Cashier" style="width:64px;height:64px;object-fit:contain;border-radius:16px;">',
      placeholder: 'name@storeid.cashier.plan',
      hint: 'e.g. mariasantos@jdcgrocery.cashier.pro',
      color: '#E048DC'
    },
    customer: {
      title: 'Customer Login',
      subtitle: 'Shop Across All Stores',
      icon: '<img src="assets/Customer_Icon.png" alt="Customer" style="width:64px;height:64px;object-fit:contain;border-radius:16px;">',
      placeholder: 'your@gmail.com',
      hint: 'Global account — shop anywhere',
      color: '#ff4f6a'
    }
  };

  const cfg = configs[role];
  if (!cfg) return;

  screen.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <button class="auth-back-btn" onclick="backToSelector()">← Back</button>
        <div class="auth-icon">${cfg.icon}</div>
        <h2 class="auth-title">${cfg.title}</h2>
        <p class="auth-subtitle">${cfg.subtitle}</p>
        
        <div class="auth-form">
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Email / Username</label>
            <input class="form-input" id="authEmail" type="text" 
                   placeholder="${cfg.placeholder}" 
                   autocomplete="username"
                   onkeydown="if(event.key==='Enter')document.getElementById('authPassword').focus()" />
            <small style="color:var(--gray-400);font-family:var(--font-data);font-size:11px;margin-top:4px;display:block">${cfg.hint}</small>
          </div>
          <div class="form-group" style="margin-bottom:24px">
            <label class="form-label">Password</label>
            <div style="position:relative">
              <input class="form-input" id="authPassword" type="password" 
                     placeholder="Enter password"
                     autocomplete="current-password"
                     onkeydown="if(event.key==='Enter')attemptLogin('${role}')" />
              <button onclick="togglePasswordVisibility()" 
                      style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:16px"
                      title="Show/hide password">👁</button>
            </div>
          </div>
          
          ${role === 'customer' ? `
          <div style="text-align:center;margin-bottom:16px">
            <a href="#" onclick="showRegisterForm()" style="color:var(--blue-light);font-family:var(--font-data);font-size:12px">
              Don't have an account? Sign up
            </a>
          </div>` : ''}
          
          <button class="btn btn-primary w-full btn-lg" onclick="attemptLogin('${role}')" 
                  style="background:${cfg.color};color:#0a0a0f;border-color:${cfg.color}">
            Login as ${cfg.title.split(' ')[0]}
          </button>
          
          ${role === 'customer' ? `
          <div style="margin-top:12px">
            <button class="btn btn-ghost w-full" onclick="continueAsGuestFromAuth()">
              Continue as Guest
            </button>
          </div>` : ''}
        </div>

        <div class="auth-demo-accounts">
          <div class="demo-label">Demo Accounts</div>
          ${getDemoAccountsHTML(role)}
        </div>
      </div>
    </div>
  `;

  // Focus on email field
  setTimeout(() => document.getElementById('authEmail')?.focus(), 100);
}

function getDemoAccountsHTML(role) {
  if (role === 'client') {
    return `
      <div class="demo-account" onclick="fillDemo('jdcgrocery@astech.pro','jdcgrocery')">
        <span class="demo-store">🛒 JDC Grocery</span>
        <span class="demo-cred">jdcgrocery@astech.pro / jdcgrocery</span>
      </div>
      <div class="demo-account" onclick="fillDemo('toylandia@astech.pro','toylandia')">
        <span class="demo-store">🧸 Toylandia</span>
        <span class="demo-cred">toylandia@astech.pro / toylandia</span>
      </div>
      <div class="demo-account" onclick="fillDemo('hirayal@astech.premium',  'hirayal')">
        <span class="demo-store">📚 Hiraya Likhain</span>
        <span class="demo-cred">hirayal@astech.premium / hirayal</span>
      </div>
    `;
  }
  if (role === 'cashier') {
    return `
      <div class="demo-account" onclick="fillDemo('mariasantos@jdcgrocery.cashier.pro','maria333')">
        <span class="demo-store">🛒 JDC Grocery Cashier</span>
        <span class="demo-cred">mariasantos@jdcgrocery.cashier.pro / maria333</span>
      </div>
      <div class="demo-account" onclick="fillDemo('markreyes@toylandia.cashier.pro','markreyes')">
        <span class="demo-store">🧸 Toylandia Cashier</span>
        <span class="demo-cred">markreyes@toylandia.cashier.pro / markreyes</span>
      </div>
      <div class="demo-account" onclick="fillDemo('junecruz@hirayal.cashier.premium','junecruz123')">
        <span class="demo-store">📚 Hiraya Likhain Cashier</span>
        <span class="demo-cred">junecruz@hirayal.cashier.premium / junecruz123</span>
      </div>
    `;
  }
  if (role === 'customer') {
    return `
      <div class="demo-account" onclick="fillDemo('mark@gmail.com','mark123')">
        <span class="demo-store">👤 Mark Santos</span>
        <span class="demo-cred">mark@gmail.com / mark123</span>
      </div>
      <div class="demo-account" onclick="fillDemo('ana@gmail.com','ana123')">
        <span class="demo-store">👤 Ana Reyes</span>
        <span class="demo-cred">ana@gmail.com / ana123</span>
      </div>
    `;
  }
  return '';
}

function fillDemo(email, password) {
  const e = document.getElementById('authEmail');
  const p = document.getElementById('authPassword');
  if (e) e.value = email;
  if (p) p.value = password;
  toast('Demo credentials filled!', 'info');
}

function togglePasswordVisibility() {
  const pw = document.getElementById('authPassword');
  if (!pw) return;
  pw.type = pw.type === 'password' ? 'text' : 'password';
}

function backToSelector() {
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('view-selector')?.classList.remove('hidden');
}

function attemptLogin(role) {
  const email    = (document.getElementById('authEmail')?.value || '').trim().toLowerCase();
  const password = document.getElementById('authPassword')?.value || '';

  if (!email || !password) {
    toast('Please enter your credentials', 'warning');
    return;
  }

  if (role === 'client') {
    const account = AUTH_CONFIG.clients[email];
    if (account && account.password === password) {
      const store = STORE_DEFINITIONS[account.storeId];
      AuthState.set('client', { email, storeId: account.storeId, storeName: account.storeName, plan: account.plan, role: 'client' }, store);
      loginSuccess('client', account.storeId, account.storeName);
    } else {
      loginFail();
    }
  }
  else if (role === 'cashier') {
    const account = AUTH_CONFIG.cashiers[email];
    if (account && account.password === password) {
      // Hardcoded demo cashier login
      const store = STORE_DEFINITIONS[account.storeId];
      AuthState.set('cashier', { email, storeId: account.storeId, storeName: account.storeName, role: 'cashier' }, store);
      loginSuccess('cashier', account.storeId, account.storeName);
    } else {
      // Try localStorage custom cashiers (legacy fallback)
      let localMatch = null;
      try {
        const custom = JSON.parse(localStorage.getItem('sc_custom_cashiers') || '{}');
        if (custom[email] && custom[email].password === password) {
          localMatch = custom[email];
        }
      } catch(e) {}

      if (localMatch) {
        const store = STORE_DEFINITIONS[localMatch.storeId];
        AuthState.set('cashier', { email, storeId: localMatch.storeId, storeName: localMatch.storeName, role: 'cashier' }, store);
        loginSuccess('cashier', localMatch.storeId, localMatch.storeName);
      } else if (typeof DB !== 'undefined') {
        // Try Supabase for cashiers added via the client panel
        DB.loginCashier(email, password).then(cashier => {
          if (cashier && cashier.status !== 'suspended') {
            const storeId   = cashier.storeId || cashier.storeSlug;
            const storeName = cashier.storeName || storeId;
            const store     = STORE_DEFINITIONS[storeId] || null;
            AuthState.set('cashier', { email, storeId, storeName, name: cashier.name, role: 'cashier' }, store);
            loginSuccess('cashier', storeId, storeName);
          } else if (cashier && cashier.status === 'suspended') {
            toast('Your account is suspended. Contact your store manager.', 'error');
          } else {
            loginFail();
          }
        }).catch(() => loginFail());
      } else {
        loginFail();
      }
    }
  }
  else if (role === 'customer') {
    // Try Supabase first, fall back to localStorage (demo/offline)
    const _doCustomerLogin = (customer) => {
      if (customer) {
        // Update last_login in Supabase
        if (typeof DB !== 'undefined' && customer.id) {
          DB.updateCustomer(customer.id, { lastLogin: new Date().toISOString() }).catch(() => {});
        }
        AuthState.set('customer', { ...customer, role: 'customer' }, null);
        showStoreSelector(customer);
      } else {
        loginFail();
      }
    };

    if (typeof DB !== 'undefined') {
      DB.loginCustomer(email, password).then(customer => {
        if (customer) {
          _doCustomerLogin(customer);
        } else {
          // Fallback: localStorage (demo accounts seeded locally)
          const customers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
          const local = customers.find(c => c.email.toLowerCase() === email && c.password === password);
          _doCustomerLogin(local || null);
        }
      }).catch(() => {
        // Offline: use localStorage only
        const customers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
        const local = customers.find(c => c.email.toLowerCase() === email && c.password === password);
        _doCustomerLogin(local || null);
      });
    } else {
      const customers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
      const customer = customers.find(c => c.email.toLowerCase() === email && c.password === password);
      _doCustomerLogin(customer || null);
    }
  }
}

function loginFail() {
  const inp = document.getElementById('authPassword');
  if (inp) {
    inp.value = '';
    inp.classList.add('shake');
    setTimeout(() => inp.classList.remove('shake'), 600);
  }
  toast('Invalid credentials. Please try again.', 'error');
}

function loginSuccess(role, storeId, storeName) {
  document.getElementById('auth-screen')?.classList.add('hidden');

  const _afterInventoryLoad = () => {
    if (role === 'client') {
      updateStoreBadges(storeName, storeId);
      navigateTo('client');
      toast(`Welcome to ${storeName}! 🏪`, 'success');
    } else if (role === 'cashier') {
      updateStoreBadges(storeName, storeId);
      navigateTo('cashier');
      toast(`Cashier access granted — ${storeName} 🧾`, 'success');
    }
  };

  // Load local inventory first (instant), then sync from Supabase
  loadStoreInventory(storeId);
  _afterInventoryLoad();

  // Background sync: pull fresh inventory from Supabase and update cache
  if (storeId && typeof DB !== 'undefined') {
    DB.getInventory(storeId).then(items => {
      if (items && items.length) {
        MultiStore.saveInventory(storeId, items);
        Store.set('inventory_' + storeId, items);
        Store.set('inventory', items);
        // Re-render if inventory panel is visible
        if (typeof renderClientInventory  === 'function') renderClientInventory();
        if (typeof renderCashierInventory === 'function') renderCashierInventory();
        if (typeof renderClientDashboard  === 'function') renderClientDashboard();
        if (typeof renderCashierDashboard === 'function') renderCashierDashboard();
      }
    }).catch(e => console.warn('[loginSuccess] Supabase inventory sync failed:', e));
  }
}

/* ============================================================
   LOAD STORE-SPECIFIC INVENTORY
   ============================================================ */
function loadStoreInventory(storeId) {
  const inventory = MultiStore.getInventory(storeId);
  // Inject into the shared Inventory system
  Store.set('inventory', inventory);
  // Also update store-specific key
  MultiStore.saveInventory(storeId, inventory);
  // Patch Inventory.save to persist to store-specific key
  Inventory._storeId = storeId;
  const origSave = Inventory.save.bind(Inventory);
  Inventory.save = function(inv) {
    origSave(inv);
    MultiStore.saveInventory(storeId, inv);
  };
}

function updateStoreBadges(storeName, storeId) {
  const store = STORE_DEFINITIONS[storeId];
  // Update all store name display elements
  document.querySelectorAll('.current-store-name').forEach(el => {
    el.textContent = storeName;
  });
  document.querySelectorAll('.current-store-icon').forEach(el => {
    el.textContent = store?.icon || '🏪';
  });
  // Update sidebar role labels
  const clientRole = document.querySelector('#clientSidebar .logo-role');
  if (clientRole) clientRole.textContent = storeName;
  const cashierRole = document.querySelector('#cashierSidebar .logo-role');
  if (cashierRole) cashierRole.textContent = storeName;

  // Update page titles
  document.querySelectorAll('.store-name-display').forEach(el => {
    el.textContent = `${store?.icon || '🏪'} ${storeName}`;
  });
}

/* ============================================================
   STORE SELECTOR (for customers)
   ============================================================ */
function showStoreSelector(customer) {
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('store-selector-screen')?.classList.remove('hidden');

  const greeting = document.getElementById('storeSelectorGreeting');
  if (greeting) {
    greeting.innerHTML = `Welcome back, <strong>${customer.name}</strong>! Which store would you like to shop at?`;
  }
}

function selectStoreAndEnter(storeId) {
  const store = STORE_DEFINITIONS[storeId];
  if (!store) { toast('Store not found', 'error'); return; }

  AuthState.currentStore = store;
  try { sessionStorage.setItem('sc_selected_store', storeId); } catch(e) {}

  // Hide store selector, show a brief loading indicator
  document.getElementById('store-selector-screen')?.classList.add('hidden');

  // Inject a transitional loading overlay (removed once UI is ready)
  let loadingEl = document.getElementById('sc-store-loading');
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'sc-store-loading';
    loadingEl.style.cssText = [
      'position:fixed','inset:0','z-index:9999',
      'background:var(--dark,#0d0f1e)',
      'display:flex','flex-direction:column',
      'align-items:center','justify-content:center','gap:16px'
    ].join(';');
    loadingEl.innerHTML = `
      <div style="font-size:3rem">${store.icon}</div>
      <div style="font-family:var(--font-display,sans-serif);font-size:1.2rem;color:#fff;letter-spacing:0.05em">${store.name}</div>
      <div style="width:200px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden">
        <div id="sc-load-bar" style="height:100%;width:0;background:#1de98b;border-radius:2px;transition:width 0.5s ease"></div>
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);font-family:monospace">Loading inventory…</div>
    `;
    document.body.appendChild(loadingEl);
  }
  // Animate bar
  setTimeout(() => {
    const bar = document.getElementById('sc-load-bar');
    if (bar) bar.style.width = '60%';
  }, 50);

  // Load this store's inventory
  const storeInventory = MultiStore.getInventory(storeId);
  Store.set('inventory', storeInventory);

  // Load cart for this store
  try { cart = MultiStore.getCart(storeId); } catch(e) { cart = []; }

  // Navigate to customer view
  navigateTo('customer');

  // Restore terms acceptance & render UI
  const termsAcceptedSession = sessionStorage.getItem('sc_terms_accepted');

  // Slight delay to let the DOM settle, then render
  setTimeout(() => {
    try {
      // Complete load bar
      const bar = document.getElementById('sc-load-bar');
      if (bar) bar.style.width = '100%';

      if (termsAcceptedSession === '1') {
        termsAccepted = true;
        document.getElementById('termsGate')?.classList.add('hidden');
        const custAppEl = document.getElementById('custApp');
        if (custAppEl) custAppEl.classList.remove('hidden');

        // Update store display in customer header
        const storeHeader = document.getElementById('custStoreHeader');
        if (storeHeader) {
          storeHeader.innerHTML = `<span class="store-badge"><span>${store.icon}</span><span>${store.name}</span></span>`;
        }
        // Also update store info in any subtitle element
        document.querySelectorAll('.cust-store-label').forEach(el => {
          el.textContent = `${store.icon} ${store.name}`;
        });

        // Set current customer state
        if (AuthState.currentUser) {
          currentCustomer = { ...AuthState.currentUser };
          const custWel = document.getElementById('custWelcome');
          if (custWel) custWel.textContent = `👋 ${currentCustomer.name}`;
        }

        // Render all customer UI
        if (typeof renderShop    === 'function') renderShop();
        if (typeof renderCart    === 'function') renderCart();
        if (typeof renderLists   === 'function') renderLists();
        if (typeof renderRewards === 'function') renderRewards();
        if (typeof updateCartBadge === 'function') updateCartBadge();

        // Ensure shop tab is active
        const shopTab = document.querySelector('.cust-tab[data-tab="shop"]');
        if (shopTab && typeof custSwitchTab === 'function') {
          custSwitchTab('shop', shopTab);
        }
      } else {
        // First visit — show terms gate
        document.getElementById('termsGate')?.classList.remove('hidden');
        document.getElementById('custApp')?.classList.add('hidden');
      }

      // Remove loading overlay with fade
      setTimeout(() => {
        if (loadingEl) {
          loadingEl.style.transition = 'opacity 0.3s';
          loadingEl.style.opacity = '0';
          setTimeout(() => loadingEl.remove(), 350);
        }
      }, 200);

      toast(`Shopping at ${store.name} ${store.icon}`, 'success');
    } catch(err) {
      console.error('selectStoreAndEnter render error:', err);
      if (loadingEl) loadingEl.remove();
      toast('Store loaded — if screen is blank, refresh.', 'warning');
    }
  }, 350);
}

function switchStore() {
  // Save current cart before switching
  if (AuthState.currentStore) {
    MultiStore.saveCart(AuthState.currentStore.id, cart);
  }
  showStoreSelector(AuthState.currentUser || { name: 'Guest' });
}

/* ============================================================
   CUSTOMER REGISTRATION
   ============================================================ */
function showRegisterForm() {
  const screen = document.getElementById('auth-screen');
  if (!screen) return;

  screen.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <button class="auth-back-btn" onclick="showAuthScreen('customer')">← Back to Login</button>
        <div class="auth-icon">👤</div>
        <h2 class="auth-title">Create Account</h2>
        <p class="auth-subtitle">Shop across all stores with one account</p>
        
        <div class="auth-form">
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Full Name *</label>
            <input class="form-input" id="regFullName" placeholder="Juan Dela Cruz" />
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Gmail Address *</label>
            <input class="form-input" id="regGmail" type="email" placeholder="juan@gmail.com" />
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Password *</label>
            <input class="form-input" id="regPass" type="password" placeholder="Create a password" />
          </div>
          <div class="form-group" style="margin-bottom:24px">
            <label class="form-label">Phone Number</label>
            <input class="form-input" id="regPhone2" placeholder="09XXXXXXXXX" />
          </div>
          <button class="btn btn-primary w-full btn-lg" onclick="registerCustomerAccount()">
            Create My Account
          </button>
        </div>
      </div>
    </div>
  `;
}

function registerCustomerAccount() {
  const name  = document.getElementById('regFullName')?.value.trim();
  const email = document.getElementById('regGmail')?.value.trim().toLowerCase();
  const pass  = document.getElementById('regPass')?.value;
  const phone = document.getElementById('regPhone2')?.value.trim();

  if (!name || !email || !pass) {
    toast('Name, email, and password are required', 'warning');
    return;
  }
  if (!email.includes('@')) {
    toast('Please enter a valid email address', 'warning');
    return;
  }

  const newCustomer = {
    id: 'GC' + Date.now().toString().slice(-6),
    name, email, password: pass, phone,
    joined: new Date().toISOString().slice(0, 10),
    totalOrders: 0,
    points: 0
  };

  // Register in Supabase (primary) + localStorage (local cache / offline fallback)
  const _finishRegistration = (customer) => {
    // Also mirror to localStorage so demo fallback login still works
    try {
      const existing = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
      if (existing.find(c => c.email === customer.email)) {
        toast('An account with this email already exists', 'error');
        return;
      }
      existing.push(customer);
      localStorage.setItem('sc_global_customers', JSON.stringify(existing));
    } catch(e) {}
    AuthState.set('customer', { ...customer, role: 'customer' }, null);
    toast(`Account created! Welcome, ${customer.name}! 🎉`, 'success');
    showStoreSelector(customer);
  };

  if (typeof DB !== 'undefined') {
    // Check for duplicate email in Supabase first
    DB.loginCustomer(email, pass).then(exists => {
      if (exists) {
        toast('An account with this email already exists', 'error');
        return;
      }
      DB.registerCustomer(newCustomer).then(created => {
        _finishRegistration(created || newCustomer);
      }).catch(() => {
        // Supabase failed — save locally only
        const customers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
        if (customers.find(c => c.email === email)) { toast('An account with this email already exists', 'error'); return; }
        _finishRegistration(newCustomer);
      });
    }).catch(() => {
      // Offline: check localStorage and save locally
      const customers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
      if (customers.find(c => c.email === email)) { toast('An account with this email already exists', 'error'); return; }
      _finishRegistration(newCustomer);
    });
  } else {
    const customers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
    if (customers.find(c => c.email === email)) { toast('An account with this email already exists', 'error'); return; }
    _finishRegistration(newCustomer);
  }
}

function continueAsGuestFromAuth() {
  AuthState.set('customer', { id: null, name: 'Guest', email: '', role: 'customer' }, null);
  showStoreSelector({ name: 'Guest' });
}

/* ============================================================
   LOGOUT
   ============================================================ */
function logout() {
  // Save cart if in customer mode
  if (AuthState.currentStore && AuthState.currentRole === 'customer') {
    MultiStore.saveCart(AuthState.currentStore.id, cart);
  }
  AuthState.clear();
  cart = [];
  currentCustomer = null;
  try { sessionStorage.removeItem('sc_cart'); } catch(e) {}

  // Hide all panels
  ['view-dev','view-client','view-cashier','view-customer',
   'auth-screen','store-selector-screen'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  navigateTo('selector');
  toast('Logged out successfully', 'info');
}

/* ============================================================
   DEVELOPER ENHANCED LOGIN
   ============================================================ */
function showDevLogin() {
  document.getElementById('view-selector')?.classList.add('hidden');
  document.getElementById('auth-screen')?.classList.remove('hidden');

  const screen = document.getElementById('auth-screen');
  screen.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <button class="auth-back-btn" onclick="backToSelector()">← Back</button>
        <div class="auth-icon"><img src="assets/Developer_Icon.png" alt="Developer" style="width:64px;height:64px;object-fit:contain;border-radius:16px;"></div>
        <h2 class="auth-title">Developer Access</h2>
        <p class="auth-subtitle">Platform monitoring & system administration</p>
        
        <div class="auth-form">
          <div class="form-group" style="margin-bottom:24px">
            <label class="form-label">Developer PIN</label>
            <input class="form-input pin-input" id="devPinInput" type="password" 
                   placeholder="······" maxlength="6"
                   style="text-align:center;letter-spacing:0.3em;font-family:var(--font-digital);font-size:1.4rem"
                   onkeydown="if(event.key==='Enter')attemptDevLogin()" 
                   autocomplete="off" />
          </div>
          <button class="btn btn-primary w-full btn-lg" onclick="attemptDevLogin()"
                  style="background:#1b2475;border-color:#1b2475">
            🔐 Enter Developer Panel
          </button>
        </div>

        <div class="auth-demo-accounts">
          <div class="demo-label">Demo PIN</div>
          <div class="demo-account" onclick="document.getElementById('devPinInput').value='363738'">
            <span class="demo-store"><img src="assets/Developer_Icon.png" alt="Developer" style="width:16px;height:16px;object-fit:contain;border-radius:4px;vertical-align:middle;"> Developer</span>
            <span class="demo-cred">PIN: 363738</span>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('devPinInput')?.focus(), 100);
}

function attemptDevLogin() {
  const pin = document.getElementById('devPinInput')?.value;
  if (pin === AUTH_CONFIG.developer.pin) {
    document.getElementById('auth-screen')?.classList.add('hidden');
    AuthState.set('developer', { role: 'developer' }, null);
    showView('dev');
    renderDevDashboard();
    renderRetailers();
    renderPlans();
    toast('Developer panel unlocked 🛡️', 'success');
  } else {
    const inp = document.getElementById('devPinInput');
    if (inp) { inp.value = ''; inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 600); }
    toast('Incorrect PIN', 'error');
  }
}

/* ============================================================
   OVERRIDE enterDev to use new login screen
   ============================================================ */
function enterDev() {
  showDevLogin();
}

/* ============================================================
   PATCH navigateTo for auth-aware routing
   ============================================================ */
const _originalNavigateTo = window.navigateTo;
window.navigateTo = function(view) {
  if (view === 'client' || view === 'cashier') {
    if (!AuthState.isAuthenticated || (AuthState.currentRole !== view && AuthState.currentRole !== 'developer')) {
      showAuthScreen(view);
      return;
    }
  }
  if (view === 'customer') {
    // Allow through if auth already set
  }
  if (typeof _originalNavigateTo === 'function') {
    _originalNavigateTo(view);
  } else {
    showView(view);
  }
};

/* ============================================================
   DEVELOPER PANEL — ENHANCED STORE MONITORING
   ============================================================ */
function renderDevStoreMonitor() {
  const container = document.getElementById('devStoreMonitor');
  if (!container) return;

  const stores = MultiStore.getAllStores();
  container.innerHTML = stores.map(store => {
    const inventory = MultiStore.getInventory(store.id);
    const orders    = MultiStore.getOrders(store.id);
    const lowStock  = inventory.filter(p => p.stock <= (p.lowStockAt || 10) && p.stock > 0).length;
    const outStock  = inventory.filter(p => p.stock === 0).length;
    const revenue   = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    return `
      <div class="dev-store-card" style="border-color:${store.color}20">
        <div class="dev-store-header">
          <div class="dev-store-icon" style="background:${store.color}20;color:${store.color}">${store.icon}</div>
          <div>
            <div class="dev-store-name">${store.name}</div>
            <div class="dev-store-desc">${store.description}</div>
          </div>
          <span class="badge badge-green">Active</span>
        </div>
        <div class="dev-store-stats">
          <div class="dev-store-stat">
            <span class="dev-stat-val">${inventory.length}</span>
            <span class="dev-stat-lbl">Products</span>
          </div>
          <div class="dev-store-stat">
            <span class="dev-stat-val" style="color:var(--yellow)">${lowStock}</span>
            <span class="dev-stat-lbl">Low Stock</span>
          </div>
          <div class="dev-store-stat">
            <span class="dev-stat-val" style="color:var(--red)">${outStock}</span>
            <span class="dev-stat-lbl">Out of Stock</span>
          </div>
          <div class="dev-store-stat">
            <span class="dev-stat-val" style="color:var(--green)">${orders.length}</span>
            <span class="dev-stat-lbl">Orders</span>
          </div>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">
          <div style="font-family:var(--font-data);font-size:11px;color:var(--gray-400)">Categories:</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
            ${store.categories.map(c => `<span class="badge badge-blue" style="font-size:10px">${c}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  seedMultiStoreData();

  // Restore auth state
  if (AuthState.restore()) {
    const role = AuthState.currentRole;
    const user = AuthState.currentUser;
    if (role === 'developer') {
      // Stay at selector; dev needs to re-authenticate for security
      AuthState.clear();
    } else if (role === 'client' || role === 'cashier') {
      if (user.storeId) {
        loadStoreInventory(user.storeId);
        updateStoreBadges(user.storeName, user.storeId);
      }
    } else if (role === 'customer') {
      currentCustomer = { ...user };
      const selectedStore = sessionStorage.getItem('sc_selected_store');
      if (selectedStore) {
        AuthState.currentStore = STORE_DEFINITIONS[selectedStore] || null;
        if (AuthState.currentStore) {
          cart = MultiStore.getCart(selectedStore);
          updateCartBadge && updateCartBadge();
        }
      }
    }
  }

  // Add store-switch button to customer panel
  setTimeout(() => {
    const custHeader = document.querySelector('.cust-header .header-actions') ||
                       document.querySelector('#custApp .cust-top-right');
    if (custHeader && !document.getElementById('storeSwitchBtn')) {
      const btn = document.createElement('button');
      btn.id = 'storeSwitchBtn';
      btn.className = 'btn btn-ghost btn-sm';
      btn.innerHTML = '🏪 Switch Store';
      btn.onclick = switchStore;
      custHeader.prepend(btn);
    }
  }, 500);
});

/* ============================================================
   PATCH: Save cart to store-specific key in customer.js
   ============================================================ */
function patchCustomerCartSave() {
  const origRenderCart = window.renderCart;
  if (origRenderCart) {
    window.renderCart = function() {
      origRenderCart.apply(this, arguments);
      if (AuthState.currentStore) {
        MultiStore.saveCart(AuthState.currentStore.id, cart);
      }
    };
  }
}
document.addEventListener('DOMContentLoaded', () => setTimeout(patchCustomerCartSave, 100));
