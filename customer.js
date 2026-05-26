/**
 * SHOP COMPANION v2.0 — Customer Panel Logic
 * Handles: Terms gate, Product browsing, Barcode scanning, Cart,
 *          Shopping Lists, QR generation, Rewards, Vouchers
 */

/* ─── STATE ─── */
let currentCustomer    = null;
let cart               = [];
let activeCategoryFilter = '';
let appliedVoucher     = null; // { code, discount, type }
let termsAccepted      = false;

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  seedData();

  // Restore last customer from session
  const saved = sessionStorage.getItem('sc_current_customer');
  if (saved) {
    try { currentCustomer = JSON.parse(saved); } catch {}
  }

  // Restore cart
  const savedCart = sessionStorage.getItem('sc_cart');
  if (savedCart) {
    try { cart = JSON.parse(savedCart); } catch {}
  }
  updateCartBadge();
});

/* ============================================================
   TERMS GATE
   ============================================================ */
function acceptTerms() {
  const checked = document.getElementById('termsCheck');
  if (!checked || !checked.checked) {
    toast('Please check the box to accept the Terms & Conditions', 'warning');
    return;
  }
  termsAccepted = true;
  sessionStorage.setItem('sc_terms_accepted', '1');

  document.getElementById('termsGate').classList.add('hidden');
  document.getElementById('custApp').classList.remove('hidden');

  // Initialize all customer views
  renderShop();
  renderCart();
  renderLists();
  renderRewards();
  // don't load the login/register modal after terms — proceed without interrupting the flow

  // Temporary UI safety fix: ensure customer app elements are visible and readable.
  (function ensureCustomerVisible(){
    try {
      if (document.getElementById('cust-visibility-fix')) return;
      const s = document.createElement('style');
      s.id = 'cust-visibility-fix';
      s.textContent = `
        /* Splash overlay hidden after entry */
        .splash-overlay { display: none !important; opacity: 0 !important; pointer-events: none !important; }
      `;
      document.head.appendChild(s);
    } catch (e) { console.warn('ensureCustomerVisible failed', e); }
  })();

  // If there's no current customer, continue as Guest (do not show login/register modal)
  if (!currentCustomer) {
    continueAsGuest();
  } else {
    const custWel = document.getElementById('custWelcome');
    if (custWel) custWel.textContent = `👋 ${currentCustomer.name}`;
  }
}

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
function custSwitchTab(tab, el) {
  document.querySelectorAll('.cust-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('cpanel-' + tab)?.classList.remove('hidden');
  document.querySelectorAll('.cust-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  // Stop scanner when leaving scan tab
  if (tab !== 'scan') stopShopScanner();

  if (tab === 'qr')      renderQRCode();
  if (tab === 'cart')    renderCart();
  if (tab === 'rewards') renderRewards();
  if (tab === 'shop')    renderShop();
}

/* ============================================================
   CUSTOMER AUTH
   ============================================================ */
function setCurrentCustomer(customer) {
  currentCustomer = customer;
  sessionStorage.setItem('sc_current_customer', JSON.stringify(customer));
  const custWel = document.getElementById('custWelcome');
  if (custWel) custWel.textContent = `👋 ${customer.name}`;
  renderRewards();
  toast(`Welcome, ${customer.name}! 🎉`, 'success');
}

function continueAsGuest() {
  currentCustomer = { id: null, name: 'Guest', email: '', phone: '' };
  const custWel = document.getElementById('custWelcome');
  if (custWel) custWel.textContent = `👋 Guest`;
}

function loadLoginModal() {
  const customers = Customers.getAll();
  const el = document.getElementById('customerList');
  if (!el) return;
  if (!customers.length) {
    el.innerHTML = `<p style="font-family:var(--font-body);font-style:italic;color:var(--gray-400);font-size:13px">No registered customers yet.</p>`;
    return;
  }
  el.innerHTML = customers.map(c => `
    <div class="customer-select-item" onclick='setCurrentCustomer(${JSON.stringify(c).replace(/'/g, "&#39;")})'>
      <div class="csi-avatar">${c.name.charAt(0)}</div>
      <div>
        <div class="csi-name">${c.name}</div>
        <div class="csi-email">${c.email || c.phone || 'No contact'}</div>
      </div>
    </div>`).join('');
}

function switchLoginTab(tab, el) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  const tabBtns = document.querySelectorAll('#modal-login .tab-btn');
  if (tabBtns && tabBtns.length) tabBtns.forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'login') loadLoginModal();
}

function registerCustomer() {
  const name    = document.getElementById('regName').value.trim();
  const email   = document.getElementById('regEmail').value.trim();
  const phone   = document.getElementById('regPhone').value.trim();
  const regCode = document.getElementById('regRegCode').value.trim();
  if (!name) { toast('Name is required', 'warning'); return; }

  // If reg code provided, validate against existing customers
  if (regCode) {
    const match = Customers.findByRegCode(regCode);
    if (match) {
      setCurrentCustomer(match);
      return;
    }
  }

  const _clearFields = () => {
    ['regName','regEmail','regPhone','regRegCode'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  };

  // Build new customer object
  const base = { name, email, phone };

  if (email && typeof DB !== 'undefined') {
    // Register in Supabase so the customer can log in globally
    const supabaseCustomer = {
      id:          'GC' + Date.now().toString().slice(-6),
      name, email, phone,
      password:    '', // no password set via this legacy form
      joined:      new Date().toISOString().slice(0,10),
      totalOrders: 0,
      points:      0
    };
    DB.registerCustomer(supabaseCustomer).then(created => {
      // Sync back to localStorage cache
      try {
        const sc = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
        if (!sc.find(c => c.email === email)) {
          sc.push(created || supabaseCustomer);
          localStorage.setItem('sc_global_customers', JSON.stringify(sc));
        }
      } catch(e) {}
      // Also add to local Customers store (for in-panel display)
      const newCust = Customers.add({ ...base, id: (created || supabaseCustomer).id });
      setCurrentCustomer(newCust);
      _clearFields();
    }).catch(() => {
      const newCust = Customers.add(base);
      setCurrentCustomer(newCust);
      _clearFields();
    });
  } else {
    const newCust = Customers.add(base);
    setCurrentCustomer(newCust);
    _clearFields();
  }
}

/* ============================================================
   SHOP / PRODUCT BROWSER
   ============================================================ */
const shopQtyMap = {}; // qty selected per product card (before adding to cart)

function renderShop(data) {
  const inv  = data || Inventory.getAll();

  // Category pills
  const cats = ['All', ...Inventory.categories()];
  const pillEl = document.getElementById('categoryPills');
  if (pillEl) {
    pillEl.innerHTML = cats.map(c => `
      <button class="pill ${(c === 'All' && !activeCategoryFilter) || c === activeCategoryFilter ? 'active' : ''}"
        onclick="setCategory('${c}')">${c}
      </button>`).join('');
  }

  // Populate category dropdown
  const catSel = document.getElementById('shopCategory');
  if (catSel) {
    const cur = catSel.value;
    catSel.innerHTML = '<option value="">All Categories</option>' +
      Inventory.categories().map(c => `<option value="${c}" ${c===cur?'selected':''}>${c}</option>`).join('');
  }

  // Product cards
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const available = inv.filter(p => p.stock >= 0);
  if (!available.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>No products found</p></div>`;
    return;
  }

  grid.innerHTML = available.map(p => {
    const cartQty    = (cart.find(i => i.id === p.id) || { qty: 0 }).qty;
    const outOfStock = p.stock === 0;
    const days       = daysUntil(p.expiry);
    let expiryBadge  = '';
    if (days !== null && days < 0) {
      expiryBadge = `<div class="product-expiry expiry-past">⚠ Expired</div>`;
    } else if (days !== null && days <= 7) {
      expiryBadge = `<div class="product-expiry expiry-soon">⏰ Exp in ${days}d</div>`;
    }

    return `
      <div class="product-card ${outOfStock ? 'out-of-stock' : ''}">
        <span class="product-emoji">${p.image || '📦'}</span>
        <div>
          <div class="product-name">${p.name}</div>
          <div class="product-type">${p.type || ''}</div>
          <div class="product-meta">${p.category} · per ${p.unit || 'unit'}</div>
          ${expiryBadge}
          <div class="product-meta" style="margin-top:4px">
            ${p.stock > 0 ? `<span style="color:var(--green)">✔ ${p.stock} in stock</span>` : '<span style="color:var(--red)">Out of stock</span>'}
            ${Inventory.isLowStock(p) && p.stock > 0 ? `<span style="color:var(--yellow);margin-left:6px">⚠ Low</span>` : ''}
          </div>
        </div>
        <div class="product-price">${formatPHP(p.price)}</div>
        <div class="product-actions">
          <div class="qty-control">
            <button class="qty-btn" onclick="changeShopQty('${p.id}',-1)">−</button>
            <span class="qty-val" id="shopqty_${p.id}">${shopQtyMap[p.id] || 1}</span>
            <button class="qty-btn" onclick="changeShopQty('${p.id}',1)">+</button>
          </div>
          <button class="add-cart-btn" onclick="addToCart('${p.id}')">🛒 Add</button>
          <button class="add-list-btn" title="Save to list" onclick="openAddToListModal('${p.id}')">📝</button>
        </div>
        ${outOfStock ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--red);background:rgba(0,0,0,0.55);border-radius:var(--radius-lg)">OUT OF STOCK</div>' : ''}
      </div>`;
  }).join('');
}

function filterShop() {
  const query = document.getElementById('shopSearch')?.value.toLowerCase().trim() || '';
  const cat   = document.getElementById('shopCategory')?.value || '';
  const sort  = document.getElementById('shopSort')?.value || 'name';

  activeCategoryFilter = cat;

  let items = Inventory.getAll().filter(p =>
    (!query || p.name.toLowerCase().includes(query) || (p.barcode||'').includes(query) || (p.type||'').toLowerCase().includes(query)) &&
    (!cat   || p.category === cat)
  );

  if (sort === 'name')       items.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === 'category')   items.sort((a,b) => a.category.localeCompare(b.category));
  if (sort === 'price-asc')  items.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') items.sort((a,b) => b.price - a.price);
  if (sort === 'stock-desc') items.sort((a,b) => b.stock - a.stock);
  if (sort === 'expiry')     items.sort((a,b) => new Date(a.expiry||'9999') - new Date(b.expiry||'9999'));

  renderShop(items);
}

function setCategory(cat) {
  activeCategoryFilter = cat === 'All' ? '' : cat;
  const catSel = document.getElementById('shopCategory');
  if (catSel) catSel.value = activeCategoryFilter;
  filterShop();
}

function changeShopQty(id, delta) {
  shopQtyMap[id] = Math.max(1, (shopQtyMap[id] || 1) + delta);
  const el = document.getElementById('shopqty_' + id);
  if (el) el.textContent = shopQtyMap[id];
}

/* ============================================================
   BARCODE SCANNING (SHOP TAB)
   ============================================================ */
function startShopScanner() {
  const video    = document.getElementById('shopScanVideo');
  const statusEl = document.getElementById('shopScanStatus');
  if (statusEl) statusEl.textContent = '🔄 Starting camera…';
  Scanner.start(video, (code) => {
    handleShopBarcode(code);
  }, { statusEl });
  if (statusEl && Scanner.active) statusEl.textContent = '📷 Point at a product barcode';
}

function stopShopScanner() {
  Scanner.stop();
  const statusEl = document.getElementById('shopScanStatus');
  if (statusEl) statusEl.textContent = '📷 Camera inactive';
}

function handleShopBarcode(code) {
  const product = Inventory.findByBarcode(code);
  const resultEl = document.getElementById('shopScanResult');
  if (product) {
    addProductToCart(product, 1);
    toast(`Added to cart: ${product.name} 🛒`, 'success');
    if (resultEl) resultEl.innerHTML = `
      <div class="card" style="display:flex;align-items:center;gap:12px;max-width:400px">
        <span style="font-size:2rem">${product.image||'📦'}</span>
        <div>
          <div style="font-family:var(--font-subhead);font-weight:600">${product.name}</div>
          <div class="digital" style="color:var(--green)">${formatPHP(product.price)}</div>
          <div style="font-family:var(--font-data);font-size:11px;color:var(--gray-400);margin-top:2px">Added to cart ✅</div>
        </div>
      </div>`;
  } else {
    toast(`Barcode not found: ${code}`, 'error');
    if (resultEl) resultEl.innerHTML = `<div style="font-family:var(--font-data);color:var(--red);font-size:13px">❌ Barcode not found: ${code}</div>`;
  }
}

function handleShopBarcodeManual(code) {
  handleShopBarcode(code);
}

/* ============================================================
   CART
   ============================================================ */
function addToCart(productId) {
  const product = Inventory.findById(productId);
  if (!product) return;
  const qty = shopQtyMap[productId] || 1;
  addProductToCart(product, qty);
  toast(`${product.name} added to cart`, 'success');
}

function addProductToCart(product, qty = 1) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id:    product.id,
      name:  product.name,
      price: product.price,
      qty,
      unit:  product.unit || 'unit',
      image: product.image || '📦'
    });
  }
  persistCart();
  updateCartBadge();
  renderCart();
}

function persistCart() {
  sessionStorage.setItem('sc_cart', JSON.stringify(cart));
}

function updateCartBadge() {
  const total = cart.reduce((s,i) => s + i.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = total;
}

function clearCart() {
  if (!cart.length) return;
  if (!confirm('Clear all cart items?')) return;
  cart = [];
  appliedVoucher = null;
  persistCart();
  updateCartBadge();
  renderCart();
  toast('Cart cleared', 'info');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  persistCart();
  updateCartBadge();
  renderCart();
}

function changeCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  persistCart();
  updateCartBadge();
  renderCart();
}

function renderCart() {
  const el = document.getElementById('cartItems');
  if (!el) return;

  if (!cart.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><p>Your cart is empty. Start shopping!</p></div>`;
    document.getElementById('cartSummary').innerHTML = '';
    return;
  }

  el.innerHTML = cart.map(i => `
    <div class="cart-item">
      <span class="cart-item-emoji">${i.image}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-unit">per ${i.unit}</div>
        <div class="cart-item-price">${formatPHP(i.price)}</div>
      </div>
      <div class="cart-item-right">
        <span class="cart-item-subtotal">${formatPHP(i.price * i.qty)}</span>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeCartQty('${i.id}',-1)">−</button>
          <span class="qty-val">${i.qty}</span>
          <button class="qty-btn" onclick="changeCartQty('${i.id}',1)">+</button>
        </div>
        <button class="cart-remove" onclick="removeFromCart('${i.id}')">🗑</button>
      </div>
    </div>`).join('');

  renderCartSummary();
}

function renderCartSummary() {
  const discAmt  = appliedVoucher?.discountAmt || 0;
  const { subtotal, discount, discounted, tax, total } = calcTotals(cart, discAmt);
  const el = document.getElementById('cartSummary');
  if (!el) return;
  el.innerHTML = `
    <div class="summary-row"><span>Items (${cart.reduce((s,i)=>s+i.qty,0)})</span><span class="digital">${formatPHP(subtotal)}</span></div>
    ${discount > 0 ? `<div class="summary-row" style="color:var(--green)"><span>Discount</span><span class="digital">-${formatPHP(discount)}</span></div>` : ''}
    <div class="summary-row"><span>VAT (12%)</span><span class="digital">${formatPHP(tax)}</span></div>
    <div class="summary-total"><span>Total</span><span>${formatPHP(total)}</span></div>`;
}

/* ── Voucher ── */
function applyVoucher() {
  const code = document.getElementById('voucherInput')?.value.trim().toUpperCase();
  const msgEl = document.getElementById('voucherMsg');
  if (!code) return;

  const { subtotal } = calcTotals(cart, 0);
  const result = Vouchers.applyDiscount(code, subtotal);
  if (!result.valid) {
    if (msgEl) msgEl.innerHTML = `<span style="color:var(--red)">${result.msg}</span>`;
    return;
  }

  appliedVoucher = { code, discountAmt: result.discount };
  if (msgEl) msgEl.innerHTML = `<span style="color:var(--green)">✅ ${result.msg}</span>`;
  renderCartSummary();
  toast(result.msg, 'success');
}

/* ============================================================
   SHOPPING LISTS
   ============================================================ */
function getLists()       { return Store.get('cust_lists') || []; }
function saveLists(lists) { Store.set('cust_lists', lists); }

function renderLists() {
  const lists = getLists();
  const el    = document.getElementById('listsContainer');
  if (!el) return;

  if (!lists.length) {
    el.innerHTML = `<div class="empty-state" style="padding-top:60px">
      <div class="empty-icon">📝</div>
      <p>No shopping lists yet. Create one from your cart or click "New List".</p>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="lists-grid">` + lists.map((list, idx) => {
    const { total } = calcTotals(list.items);
    return `
      <div class="list-card">
        <div class="list-card-header">
          <div>
            <div class="list-name">${list.name}</div>
            <div style="font-family:var(--font-data);font-size:12px;color:var(--gray-400);margin-top:3px">${list.items.length} items · <span class="digital">${formatPHP(total)}</span></div>
          </div>
          <span class="badge badge-blue">${formatDateShort(list.created)}</span>
        </div>
        ${list.items.slice(0,4).map(i => `
          <div class="list-item-preview">
            <span>${i.image||'📦'} ${i.name}</span>
            <span>×${i.qty} · ${formatPHP(i.price*i.qty)}</span>
          </div>`).join('')}
        ${list.items.length > 4 ? `<div style="font-family:var(--font-data);font-size:11px;color:var(--gray-400);margin-top:6px">+ ${list.items.length-4} more items</div>` : ''}
        <div class="list-actions">
          <button class="btn btn-primary btn-sm" onclick="loadListToCart(${idx})">🛒 Load to Cart</button>
          <button class="btn btn-ghost btn-sm"   onclick="viewListQR(${idx})">📱 QR</button>
          <button class="btn btn-danger btn-sm"  onclick="deleteList(${idx})">🗑️</button>
        </div>
      </div>`;
  }).join('') + '</div>';
}

function openNewListModal() {
  const el = document.getElementById('newListNameModal');
  if (el) el.value = '';
  openModal('modal-new-list');
}

function createNewList() {
  const name = document.getElementById('newListNameModal')?.value.trim();
  if (!name) { toast('Enter a list name', 'warning'); return; }
  const lists = getLists();
  lists.push({ name, items: [], created: new Date().toISOString() });
  saveLists(lists);
  closeModal('modal-new-list');
  renderLists();
  toast(`List "${name}" created`, 'success');
}

function saveCartAsList() {
  if (!cart.length) { toast('Cart is empty', 'warning'); return; }
  const name = document.getElementById('newListName')?.value.trim();
  if (!name) { toast('Enter a list name', 'warning'); return; }
  const lists = getLists();
  lists.push({ name, items: [...cart], created: new Date().toISOString() });
  saveLists(lists);
  document.getElementById('newListName').value = '';
  toast(`Saved as "${name}" ✅`, 'success');
  renderLists();
}

function loadListToCart(idx) {
  const list = getLists()[idx];
  if (!list) return;
  cart = list.items.map(i => ({ ...i }));
  appliedVoucher = null;
  persistCart();
  updateCartBadge();
  renderCart();
  custSwitchTab('cart', document.querySelector('[data-tab=cart]'));
  toast(`"${list.name}" loaded to cart`, 'success');
}

function deleteList(idx) {
  const lists = getLists();
  if (!confirm(`Delete "${lists[idx]?.name}"?`)) return;
  lists.splice(idx, 1);
  saveLists(lists);
  renderLists();
  toast('List deleted', 'warning');
}

function viewListQR(idx) {
  const list = getLists()[idx];
  if (!list) return;
  cart = list.items.map(i => ({ ...i }));
  persistCart();
  updateCartBadge();
  custSwitchTab('qr', document.querySelector('[data-tab=qr]'));
  toast(`QR for "${list.name}"`, 'info');
}

/* ── Add product to existing list ── */
let _addToListProductId = null;

function openAddToListModal(productId) {
  _addToListProductId = productId;
  const product = Inventory.findById(productId);
  const nameEl  = document.getElementById('addToListProductName');
  if (nameEl) nameEl.textContent = `Adding: ${product?.name}`;

  const lists = getLists();
  const el    = document.getElementById('addToListOptions');
  if (!lists.length) {
    el.innerHTML = `<p style="font-family:var(--font-body);font-style:italic;color:var(--gray-400);font-size:13px">No lists yet.</p>
      <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="closeModal('modal-add-to-list');openNewListModal()">Create a List</button>`;
  } else {
    el.innerHTML = lists.map((list, idx) => `
      <div class="customer-select-item" onclick="addProductToList(${idx})">
        <span style="font-size:20px">📝</span>
        <div>
          <div class="csi-name">${list.name}</div>
          <div class="csi-email">${list.items.length} items</div>
        </div>
      </div>`).join('');
  }
  openModal('modal-add-to-list');
}

function addProductToList(listIdx) {
  if (!_addToListProductId) return;
  const product = Inventory.findById(_addToListProductId);
  if (!product) return;

  const lists    = getLists();
  const list     = lists[listIdx];
  const existing = list.items.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    list.items.push({
      id:    product.id,
      name:  product.name,
      price: product.price,
      qty:   1,
      unit:  product.unit || 'unit',
      image: product.image || '📦'
    });
  }
  saveLists(lists);
  closeModal('modal-add-to-list');
  renderLists();
  toast(`Added to "${list.name}" ✅`, 'success');
}

/* ============================================================
   QR CODE GENERATION
   ============================================================ */
function renderQRCode() {
  const qrEl  = document.getElementById('qrOutput');
  const sumEl = document.getElementById('qrCartSummary');
  if (!qrEl) return;

  if (!cart.length) {
    qrEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><p>Add items to your cart first</p></div>`;
    if (sumEl) sumEl.innerHTML = '';
    return;
  }

  const discAmt = appliedVoucher?.discountAmt || 0;
  const { subtotal, discount, tax, total } = calcTotals(cart, discAmt);

  // Compact payload — use short keys to reduce QR density for faster scanning
  const payload = {
    customerId:   currentCustomer?.id   || null,
    customerName: currentCustomer?.name || 'Guest',
    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
    subtotal: +subtotal.toFixed(2),
    discount: +discount.toFixed(2),
    tax:      +tax.toFixed(2),
    total:    +total.toFixed(2),
    ts:       Date.now()
  };

  // Generate / store a short text code for cashier manual entry
  const textCode = generateCartTextCode(payload);

  // Render in a white wrapper for maximum scanner readability
  qrEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'qr-wrapper';
  generatePlainQR(wrap, payload, 240);
  qrEl.appendChild(wrap);

  // Text-code fallback block (shown below the QR)
  const codeEl = document.getElementById('qrTextCode');
  if (codeEl) {
    codeEl.innerHTML = `
      <div style="margin-top:18px;padding:14px 18px;background:var(--surface-2);border:1.5px dashed var(--border-strong);border-radius:var(--radius-md);text-align:center">
        <div style="font-family:var(--font-body);font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">
          Can't scan? Give this code to the cashier
        </div>
        <div id="qrTextCodeValue" style="font-family:var(--font-mono);font-size:1.6rem;font-weight:800;letter-spacing:0.18em;color:var(--blue);user-select:all">${textCode}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="copyTextCode('${textCode}')">📋 Copy Code</button>
      </div>`;
  }

  // Cart summary preview
  if (sumEl) {
    sumEl.innerHTML = `
      <div class="qr-cart-preview" style="margin-top:16px">
        <strong style="font-family:var(--font-subhead)">Order for: ${currentCustomer?.name || 'Guest'}</strong>
        <div style="margin:10px 0">
          ${cart.map(i => `
            <div class="qr-item-line">
              <span>${i.image} ${i.name} ×${i.qty}</span>
              <span class="digital">${formatPHP(i.price * i.qty)}</span>
            </div>`).join('')}
        </div>
        ${discount > 0 ? `<div class="qr-item-line" style="color:var(--green)"><span>Voucher discount</span><span class="digital">-${formatPHP(discount)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding-top:8px;font-family:var(--font-digital);font-size:1rem;color:var(--green)">
          <span>Total (incl. VAT):</span><span>${formatPHP(total)}</span>
        </div>
      </div>`;
  }
}

/* ── Text-code helpers ── */
const TEXT_CODE_STORE_KEY = 'sc_text_codes';

function generateCartTextCode(payload) {
  // Produce a 6-character alphanumeric code, store payload against it
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const store = JSON.parse(localStorage.getItem(TEXT_CODE_STORE_KEY) || '{}');

  // Purge codes older than 2 hours to keep storage lean
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  Object.keys(store).forEach(k => { if ((store[k].ts || 0) < cutoff) delete store[k]; });

  store[code] = { ...payload, ts: Date.now() };
  localStorage.setItem(TEXT_CODE_STORE_KEY, JSON.stringify(store));
  return code;
}

function copyTextCode(code) {
  try { navigator.clipboard.writeText(code); } catch(e) {}
  toast(`Code "${code}" copied!`, 'success');
}

function regenerateQR() {
  const qrEl = document.getElementById('qrOutput');
  if (qrEl) qrEl.innerHTML = '';
  renderQRCode();
  toast('QR code refreshed', 'info');
}

/* ============================================================
   REWARDS
   ============================================================ */
function renderRewards() {
  const ptsEl = document.getElementById('rewardsPoints');
  const vEl   = document.getElementById('rewardsVouchers');
  if (!ptsEl || !vEl) return;

  // Read local points first (instant), then refresh from Supabase
  const localPts = currentCustomer?.id ? (Customers.findById(currentCustomer.id)?.points || 0) : 0;
  ptsEl.textContent = localPts;

  if (currentCustomer?.id && typeof DB !== 'undefined') {
    /* FIX: use getCustomerById — avoids fetching every customer
       just to refresh one person's points balance               */
    DB.getCustomerById(currentCustomer.id).then(fresh => {
      if (fresh) {
        ptsEl.textContent = fresh.points || 0;
        // Sync local cache
        currentCustomer.points = fresh.points || 0;
        try {
          sessionStorage.setItem('sc_current_customer', JSON.stringify(currentCustomer));
        } catch(e) {}
      }
    }).catch(() => {}); // silently keep local value on error
  }

  const vouchers = Vouchers.getAll();
  if (!vouchers.length) {
    vEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🎫</div><p>No vouchers available</p></div>`;
    return;
  }

  vEl.innerHTML = vouchers.map(v => {
    const discText = v.type === 'percent' ? `${v.discount}% off` : `₱${v.discount} off`;
    return `<div class="voucher-card ${v.active ? 'available' : ''}">
      <div class="voucher-code">${v.code}</div>
      <div style="font-family:var(--font-subhead);font-weight:600;font-size:1.1rem;color:var(--green)">${discText}</div>
      <div class="voucher-detail">Min. order: ₱${v.minOrder}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        ${v.active
          ? `<span class="badge badge-green">Available</span>
             <button class="btn btn-ghost btn-sm" onclick="copyVoucherCode('${v.code}')">📋 Copy</button>`
          : `<span class="badge badge-gray">Unavailable</span><span></span>`
        }
      </div>
    </div>`;
  }).join('');
}

function copyVoucherCode(code) {
  const el = document.getElementById('voucherInput');
  if (el) el.value = code;
  try { navigator.clipboard.writeText(code); } catch(e) {}
  toast(`Code "${code}" copied — apply it in your cart 🎫`, 'success');
  // Switch to cart tab
  custSwitchTab('cart', document.querySelector('[data-tab=cart]'));
}
