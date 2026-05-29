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
      { id: 'JDC001', name: 'Washed Sugar (500g)',         barcode: '4806535970056',  category: 'Sweetener',        type: 'Sugar',            price: 50,  stock: 10, unit: 'Pack',   image: '🥃', expiry: '2028-04-17', lowStockAt: 5, weightGrams: 530  },
      { id: 'JDC002', name: 'Vinegar (350 ml)',            barcode: '4806501953113',  category: 'Condiment',        type: 'Vinegar',          price: 20,  stock: 15, unit: 'Bottle', image: '🏺', expiry: '2027-06-05', lowStockAt: 5, weightGrams: 400  },
      { id: 'JDC003', name: 'Soy Sauce (350 ml)',          barcode: '4800405123467',  category: 'Condiment',        type: 'Sauce',            price: 27,  stock: 15, unit: 'Bottle', image: '🍶', expiry: '2028-06-01', lowStockAt: 5, weightGrams: 390  },
      { id: 'JDC004', name: 'Cup Noodles (40g)',           barcode: '4800016551857',  category: 'Instant Food',     type: 'Noodles',          price: 28,  stock: 10, unit: 'Cup',    image: '🍜', expiry: '2026-11-28', lowStockAt: 5, weightGrams: 75   },
      { id: 'JDC005', name: 'Sardines (155g)',             barcode: '4800163443036',  category: 'Canned Good',      type: 'Sardines',         price: 30,  stock: 20, unit: 'Can',    image: '🥫', expiry: '2028-07-09', lowStockAt: 5, weightGrams: 200  },
      { id: 'JDC006', name: 'Corned Beef (150g)',          barcode: '748485800431',   category: 'Canned Good',      type: 'Corned Beef',      price: 40,  stock: 20, unit: 'Can',    image: '🥫', expiry: '2028-11-15', lowStockAt: 5, weightGrams: 195  },
      { id: 'JDC007', name: '555 Tuna (155g)',             barcode: '748485700021',   category: 'Canned Good',      type: 'Tuna',             price: 35,  stock: 20, unit: 'Can',    image: '🥫', expiry: '2029-05-20', lowStockAt: 5, weightGrams: 200  },
      { id: 'JDC008', name: 'Fresh Gata',                  barcode: '748485150079',   category: 'Canned Good',      type: 'Coconut Milk',     price: 40,  stock: 10, unit: 'Pack',   image: '🥥', expiry: '2027-05-21', lowStockAt: 5, weightGrams: 200  },
      { id: 'JDC009', name: 'Fish Sauce',                  barcode: '4801668600542',  category: 'Condiment',        type: 'Sauce',            price: 19,  stock: 10, unit: 'Pack',   image: '🐟', expiry: '2028-11-20', lowStockAt: 5, weightGrams: 130  },
      { id: 'JDC010', name: 'Coffee Powder (40g)',         barcode: '4800016012273',  category: 'Beverage',         type: 'Instant Coffee',   price: 57,  stock: 10, unit: 'Pack',   image: '☕', expiry: '2027-05-12', lowStockAt: 5, weightGrams: 55   },
      { id: 'JDC011', name: 'Potato Chips (45g)',          barcode: '4800016644801',  category: 'Snack',            type: 'Chips',            price: 20,  stock: 15, unit: 'Pack',   image: '🥡', expiry: '2026-12-21', lowStockAt: 5, weightGrams: 55   },
      { id: 'JDC012', name: 'Mixed Nuts (30g)',            barcode: '4800092331732',  category: 'Snack',            type: 'Mixed Nuts',       price: 25,  stock: 15, unit: 'Pack',   image: '🥜', expiry: '2027-02-21', lowStockAt: 5, weightGrams: 40   },
      { id: 'JDC013', name: 'Royal (250 ml)',              barcode: '4801981118519',  category: 'Beverage',         type: 'Soft Drink',       price: 25,  stock: 20, unit: 'Bottle', image: '🥤', expiry: '2026-09-21', lowStockAt: 5, weightGrams: 290  },
      { id: 'JDC014', name: 'Coca-Cola (1.5L)',            barcode: '4801981116072',  category: 'Beverage',         type: 'Soft Drink',       price: 85,  stock: 10, unit: 'Box',    image: '🥤', expiry: '2027-01-25', lowStockAt: 5, weightGrams: 1580 },
      { id: 'JDC015', name: 'Body Soap (55g)',             barcode: '4902430951357',  category: 'Personal Care',    type: 'Soap',             price: 25,  stock: 20, unit: 'Pieces', image: '🧼', expiry: '2029-01-25', lowStockAt: 5, weightGrams: 60   },
      { id: 'JDC016', name: 'Shampoo (15 ml)',             barcode: '4800888169716',  category: 'Personal Care',    type: 'Hair Shampoo',     price: 10,  stock: 12, unit: 'String', image: '🧴', expiry: '2028-02-18', lowStockAt: 5, weightGrams: 20   },
      { id: 'JDC017', name: 'Hair Conditioner (20g)',      barcode: '4806515161504',  category: 'Personal Care',    type: 'Hair Conditioner', price: 11,  stock: 12, unit: 'String', image: '🧴', expiry: '2028-04-05', lowStockAt: 5, weightGrams: 25   },
      { id: 'JDC018', name: 'Fabric Conditioner (24 ml)', barcode: '4902430846448',  category: 'Cleaning Supplies',type: 'FabCon',           price: 10,  stock: 12, unit: 'String', image: '🌸', expiry: '2027-03-14', lowStockAt: 5, weightGrams: 30   },
      { id: 'JDC019', name: 'Toothpaste (20g)',            barcode: '88550006325230', category: 'Personal Care',    type: 'Toothpaste',       price: 15,  stock: 15, unit: 'Sachet', image: '🦷', expiry: '2028-08-12', lowStockAt: 5, weightGrams: 25   },
      { id: 'JDC020', name: 'Toothbrush (Soft)',           barcode: '4902430349062',  category: 'Personal Care',    type: 'Toothbrush',       price: 25,  stock: 20, unit: 'Pieces', image: '🪥', expiry: '2027-12-30', lowStockAt: 5, weightGrams: 30   },
      { id: 'JDC021', name: 'Face Powder (25g)',           barcode: '48040693',       category: 'Personal Care',    type: 'Powder',           price: 20,  stock: 15, unit: 'Pieces', image: '🧏‍♀️', expiry: '2028-11-30', lowStockAt: 5, weightGrams: 35 },
      { id: 'JDC022', name: 'Zonrox (250 ml)',             barcode: '4800047840036',  category: 'Cleaning Supplies',type: 'Zonrox',           price: 20,  stock: 15, unit: 'Bottle', image: '🧽', expiry: '2026-12-08', lowStockAt: 5, weightGrams: 290  },
      { id: 'JDC023', name: 'Laundry Detergent (69g)',     barcode: '4902430884020',  category: 'Cleaning Supplies',type: 'Powder Detergent', price: 20,  stock: 10, unit: 'String', image: '👕', expiry: '2027-07-22', lowStockAt: 5, weightGrams: 80   },
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
      { id: 'TL001', name: 'MLP Stackable Lap Tray',  barcode: '2068102893966', category: 'Arts & Crafts',   type: 'Arts & Crafts',   price: 399,   stock: 10, unit: 'Pieces', image: '🎨', expiry: null, lowStockAt: 5, weightGrams: 450  },
      { id: 'TL002', name: 'Football Game',            barcode: '2068103476915', category: 'Outdoor Toy',     type: 'Sports Toy',      price: 100,   stock: 11, unit: 'Pieces', image: '⚽', expiry: null, lowStockAt: 5, weightGrams: 320  },
      { id: 'TL003', name: 'Dream Jewelry',            barcode: '2068103367206', category: 'Accessories',     type: 'Jewelry Toy',     price: 100,   stock: 8,  unit: 'Set',    image: '💍', expiry: null, lowStockAt: 3, weightGrams: 180  },
      { id: 'TL004', name: 'Archery Set',              barcode: '2068103498542', category: 'Outdoor Toy',     type: 'Sports Toy',      price: 100,   stock: 9,  unit: 'Set',    image: '🏹', expiry: null, lowStockAt: 3, weightGrams: 550  },
      { id: 'TL005', name: 'Bday Cake Keychain',       barcode: '2023203151483', category: 'Accessories',     type: 'Keychain',        price: 199,   stock: 10, unit: 'Pieces', image: '🎂', expiry: null, lowStockAt: 5, weightGrams: 35   },
      { id: 'TL006', name: 'PlayDoh Airplane',         barcode: '2068391082645', category: 'Arts & Crafts',   type: 'Clay',            price: 400,   stock: 12, unit: 'Kit',    image: '✈️', expiry: null, lowStockAt: 5, weightGrams: 500  },
      { id: 'TL007', name: 'Woodlets',                 barcode: '2068391080900', category: 'Educational Toy', type: 'Interactive Toy', price: 719,   stock: 10, unit: 'Box',    image: '🪵', expiry: null, lowStockAt: 5, weightGrams: 620  },
      { id: 'TL008', name: 'Play Doh Marvels',         barcode: '2068391146101', category: 'Arts & Crafts',   type: 'Clay',            price: 649,   stock: 10, unit: 'Kit',    image: '🦸', expiry: null, lowStockAt: 5, weightGrams: 480  },
      { id: 'TL009', name: 'Pingao Blocks Ferrari',    barcode: '2069391599839', category: 'Building Toy',    type: 'Lego Car',        price: 4999,  stock: 5,  unit: 'Set',    image: '🏎️', expiry: null, lowStockAt: 5, weightGrams: 850  },
      { id: 'TL010', name: 'Bliizz Spaceship Set',     barcode: '2068391284117', category: 'Building Toy',    type: 'Bliz Set',        price: 1299,  stock: 10, unit: 'Set',    image: '🚀', expiry: null, lowStockAt: 5, weightGrams: 700  },
      { id: 'TL011', name: 'My Little Pony',           barcode: '2068103484972', category: 'Stuffed Toy',     type: 'Stuffed Toy',     price: 3999,  stock: 4,  unit: 'Pieces', image: '🦄', expiry: null, lowStockAt: 3, weightGrams: 380  },
      { id: 'TL012', name: 'Doll House',               barcode: '206891131077',  category: 'Pretend Play',    type: 'Interactive Toy', price: 1199,  stock: 9,  unit: 'Set',    image: '🏠', expiry: null, lowStockAt: 5, weightGrams: 1800 },
      { id: 'TL013', name: 'Kkup Deluxe Vendie',       barcode: '2068391460382', category: 'Pretend Play',    type: 'Interactive Toy', price: 11399, stock: 10, unit: 'Set',    image: '🛒', expiry: null, lowStockAt: 5, weightGrams: 2500 },
      { id: 'TL014', name: "Gabby's Dollhouse",        barcode: '2068391084298', category: 'Pretend Play',    type: 'Interactive Toy', price: 4999,  stock: 4,  unit: 'Pieces', image: '🏡', expiry: null, lowStockAt: 5, weightGrams: 950  },
      { id: 'TL015', name: 'Unicorn Fluffy',           barcode: '9781837712151', category: 'Stuffed Toy',     type: 'Interactive Toy', price: 2999,  stock: 5,  unit: 'Pieces', image: '🦄', expiry: null, lowStockAt: 5, weightGrams: 420  },
      { id: 'TL016', name: 'Doodle Board',             barcode: '4800692185661', category: 'Arts & Crafts',   type: 'Art Toy',         price: 1099,  stock: 10, unit: 'Kit',    image: '🖍️', expiry: null, lowStockAt: 5, weightGrams: 550  },
      { id: 'TL017', name: 'Basketball Set',           barcode: '6941055133470', category: 'Outdoor Toy',     type: 'Hoop Toy',        price: 2999,  stock: 5,  unit: 'Set',    image: '🏀', expiry: null, lowStockAt: 5, weightGrams: 1200 },
      { id: 'TL018', name: 'Topple Game',              barcode: '6931604309029', category: 'Board Game',      type: 'Table Top Game',  price: 1999,  stock: 4,  unit: 'Box',    image: '🎲', expiry: null, lowStockAt: 5, weightGrams: 750  },
      { id: 'TL019', name: 'Disney Stitch',            barcode: '6391604385436', category: 'Board Game',      type: 'Puzzle',          price: 500,   stock: 9,  unit: 'Box',    image: '🧩', expiry: null, lowStockAt: 5, weightGrams: 600  },
      { id: 'TL020', name: 'Sitting Piglet Plush',     barcode: '6941501522636', category: 'Stuffed Toy',     type: 'Stuffed Toy',     price: 5999,  stock: 5,  unit: 'Pieces', image: '🐷', expiry: null, lowStockAt: 5, weightGrams: 500  },
      { id: 'TL021', name: 'Bracelet Making',          barcode: '6942083595230', category: 'Accessories',     type: 'Jewelry Toy',     price: 499,   stock: 10, unit: 'Kit',    image: '📿', expiry: null, lowStockAt: 5, weightGrams: 150  },
      { id: 'TL022', name: 'Barbie Princess',          barcode: '6942083587068', category: 'Fashion Doll',    type: 'Barbie',          price: 4999,  stock: 5,  unit: 'Pieces', image: '👑', expiry: null, lowStockAt: 5, weightGrams: 320  },
      { id: 'TL023', name: 'Rainbow Loom',             barcode: '2068102003860', category: 'Arts & Crafts',   type: 'Loom Bands',      price: 899.75,stock: 12, unit: 'Pack',   image: '🌈', expiry: null, lowStockAt: 5, weightGrams: 220  },
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
      { id: 'HL001', name: 'Glue Stick (8 pcs)',              barcode: '141100010693',  category: 'Arts and Crafts',        type: 'Glue',              price: 32,  stock: 25, unit: 'Pack',  image: '🖊️', expiry: null, lowStockAt: 5,  weightGrams: 110  },
      { id: 'HL002', name: 'Water Color',                     barcode: '4806021382462', category: 'Coloring Materials',     type: 'Paint',             price: 45,  stock: 15, unit: 'Set',   image: '🎨', expiry: null, lowStockAt: 5,  weightGrams: 160  },
      { id: 'HL003', name: 'Highlighter (Pastel)',            barcode: '4006381333634', category: 'School/Office Supplies', type: 'Highlighter',       price: 50,  stock: 50, unit: 'Piece', image: '🖍️', expiry: null, lowStockAt: 10, weightGrams: 15   },
      { id: 'HL004', name: 'Highlighter (Neon)',              barcode: '4006381333627', category: 'School/Office Supplies', type: 'Highlighter',       price: 45,  stock: 50, unit: 'Piece', image: '✏️', expiry: null, lowStockAt: 10, weightGrams: 15   },
      { id: 'HL005', name: 'Correction Tape',                 barcode: '6972004137119', category: 'School/Office Supplies', type: 'Eraser/Correction', price: 35,  stock: 20, unit: 'Piece', image: '📝', expiry: null, lowStockAt: 5,  weightGrams: 25   },
      { id: 'HL006', name: 'Flash Drive',                     barcode: '619659143480',  category: 'Computer Accessories',   type: 'Flash Drive',       price: 250, stock: 15, unit: 'Piece', image: '💾', expiry: null, lowStockAt: 5,  weightGrams: 12   },
      { id: 'HL007', name: 'A4 Paper (500 sheets)',           barcode: '8991389142578', category: 'School/Office Supplies', type: 'Paper',             price: 292, stock: 15, unit: 'Ream',  image: '📄', expiry: null, lowStockAt: 5,  weightGrams: 2400 },
      { id: 'HL008', name: 'Yellow Ruled Pad',                barcode: '4806502256220', category: 'School/Office Supplies', type: 'Paper',             price: 75,  stock: 20, unit: 'Pad',   image: '📒', expiry: null, lowStockAt: 5,  weightGrams: 280  },
      { id: 'HL009', name: 'Micro SD Card (32GB)',            barcode: '619659184162',  category: 'Computer Accessories',   type: 'SD card',           price: 945, stock: 10, unit: 'Piece', image: '💿', expiry: null, lowStockAt: 5,  weightGrams: 5    },
      { id: 'HL010', name: 'Multipurpose Wallet/Purse',       barcode: '4713008625156', category: 'Personal Accessories',   type: 'Purse/Wallet',      price: 75,  stock: 20, unit: 'Piece', image: '👛', expiry: null, lowStockAt: 5,  weightGrams: 80   },
      { id: 'HL011', name: 'Colored Paper A4 (250 sheets)',   barcode: '4800552051057', category: 'School/Office Supplies', type: 'Colored Paper',     price: 250, stock: 15, unit: 'Ream',  image: '📋', expiry: null, lowStockAt: 5,  weightGrams: 1200 },
      { id: 'HL012', name: 'Stainless Steel Metric Ruler',    barcode: '088359006218',  category: 'School/Office Supplies', type: 'Metric Ruler',      price: 30,  stock: 15, unit: 'Piece', image: '📏', expiry: null, lowStockAt: 5,  weightGrams: 55   },
      { id: 'HL013', name: 'Ballpoint Pen',                   barcode: '8935001882992', category: 'School/Office Supplies', type: 'Pen',               price: 86,  stock: 20, unit: 'Box',   image: '🖊️', expiry: null, lowStockAt: 5,  weightGrams: 260  },
      { id: 'HL014', name: 'Eraser (PVC Free)',               barcode: '9556089886406', category: 'School/Office Supplies', type: 'Eraser/Correction', price: 25,  stock: 20, unit: 'Piece', image: '🧹', expiry: null, lowStockAt: 5,  weightGrams: 20   },
      { id: 'HL015', name: 'Oil Pastels',                     barcode: '4710609401547', category: 'Coloring Materials',     type: 'Coloring',          price: 47,  stock: 15, unit: 'Box',   image: '🎨', expiry: null, lowStockAt: 5,  weightGrams: 190  },
      { id: 'HL016', name: 'Journal Ruled Paper',             barcode: '132734',        category: 'School Supplies',        type: 'Paper (Journal)',   price: 99,  stock: 15, unit: 'Piece', image: '📓', expiry: null, lowStockAt: 5,  weightGrams: 180  },
      { id: 'HL017', name: 'Floral Stem',                     barcode: '00722801',      category: 'Arts and Crafts',        type: 'Craft',             price: 40,  stock: 10, unit: 'Pack',  image: '🌸', expiry: null, lowStockAt: 5,  weightGrams: 90   },
      { id: 'HL018', name: 'Index Cards 9.1x5.5cm (100pcs)', barcode: '4971711040103', category: 'School Supplies',        type: 'Index Card/Paper',  price: 215, stock: 15, unit: 'Pack',  image: '🗂️', expiry: null, lowStockAt: 5,  weightGrams: 220  },
      { id: 'HL019', name: 'Push Pins (50 pcs)',              barcode: '6947860508335', category: 'School/Office Supplies', type: 'Pins',              price: 35,  stock: 15, unit: 'Box',   image: '📌', expiry: null, lowStockAt: 5,  weightGrams: 65   },
      { id: 'HL020', name: 'File Folder A4',                  barcode: '4954939022649', category: 'School/Office Supplies', type: 'Folder',            price: 15,  stock: 20, unit: 'Piece', image: '📁', expiry: null, lowStockAt: 5,  weightGrams: 35   },
      { id: 'HL021', name: 'Glossy Photo Paper (20 sheets)',  barcode: '010343819795',  category: 'School/Office Supplies', type: 'Photo Paper/Paper', price: 450, stock: 15, unit: 'Pack',  image: '🖼️', expiry: null, lowStockAt: 5,  weightGrams: 180  },
      { id: 'HL022', name: 'Crayons (24 pcs)',                barcode: '071662000240',  category: 'Coloring Materials',     type: 'Coloring',          price: 153, stock: 15, unit: 'Box',   image: '🖍️', expiry: null, lowStockAt: 5,  weightGrams: 210  },
      { id: 'HL023', name: 'Drawing Book',                    barcode: '4969757139523', category: 'Arts and Crafts',        type: 'Book',              price: 135, stock: 15, unit: 'Piece', image: '📔', expiry: null, lowStockAt: 5,  weightGrams: 310  },
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

  // Background sync: pull fresh inventory from Supabase and MERGE with local cache.
  // We never discard locally-added items (IDs like P123456) that may not be in Supabase yet.
  if (storeId && typeof DB !== 'undefined') {
    DB.getInventory(storeId).then(items => {
      if (items && items.length) {
        // Guard: reject only if Supabase has zero overlap with known seed IDs AND no user-added IDs.
        // User-added products have IDs starting with 'P' followed by digits (e.g. P123456).
        const seedIds   = new Set((STORE_DEFINITIONS[storeId]?.inventory || []).map(p => p.id));
        const hasSeeds  = items.some(p => seedIds.has(p.id));
        const hasCustom = items.some(p => /^P\d+$/.test(p.id));
        if (!hasSeeds && !hasCustom) {
          console.warn('[loginSuccess] Supabase inventory appears fully stale — skipping sync. Run seedSupabase() to update.');
          return;
        }
        // MERGE: overlay local-only items (just added, not yet in Supabase) on top of remote data.
        const local     = MultiStore.getInventory(storeId);
        const remoteMap = new Map(items.map(p => [p.id, p]));
        const localOnly = local.filter(p => !remoteMap.has(p.id));
        const merged    = [...items, ...localOnly];

        MultiStore.saveInventory(storeId, merged);
        Store.set('inventory_' + storeId, merged);
        Store.set('inventory', merged);
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

  // Load this store's inventory from local cache (instant)
  const storeInventory = MultiStore.getInventory(storeId);
  Store.set('inventory', storeInventory);
  Store.set('inventory_' + storeId, storeInventory);

  // Background sync from Supabase — merge so new products added by the client always appear
  if (typeof DB !== 'undefined') {
    DB.getInventory(storeId).then(items => {
      if (items && items.length) {
        const seedIds   = new Set((STORE_DEFINITIONS[storeId]?.inventory || []).map(p => p.id));
        const hasSeeds  = items.some(p => seedIds.has(p.id));
        const hasCustom = items.some(p => /^P\d+$/.test(p.id));
        if (!hasSeeds && !hasCustom) return; // fully stale Supabase data — ignore
        // Merge: keep local-only items not yet synced to Supabase
        const local     = MultiStore.getInventory(storeId);
        const remoteMap = new Map(items.map(p => [p.id, p]));
        const localOnly = local.filter(p => !remoteMap.has(p.id));
        const merged    = [...items, ...localOnly];
        MultiStore.saveInventory(storeId, merged);
        Store.set('inventory_' + storeId, merged);
        Store.set('inventory', merged);
        // Re-render shop if it's visible
        if (typeof renderShop === 'function') renderShop();
      }
    }).catch(() => {});
  }

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
