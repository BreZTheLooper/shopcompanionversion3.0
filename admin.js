/**
 * SHOP COMPANION v2.0 — Admin Panel Logic
 * Covers: Developer Panel, Client (Retailer) Panel, Cashier Panel
 * Handles: Retailers, Subscriptions, Inventory CRUD, Barcode Scanner,
 *          QR Checkout, Customer Management, Orders, Receipts
 */

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  seedData();
});

/* ============================================================
   SIDEBAR TOGGLES
   ============================================================ */
function toggleDevSidebar() {
  document.getElementById('devSidebar')?.classList.toggle('collapsed');
  document.getElementById('devMain')?.classList.toggle('expanded');
}
function toggleClientSidebar() {
  document.getElementById('clientSidebar')?.classList.toggle('collapsed');
  document.getElementById('clientMain')?.classList.toggle('expanded');
}
function toggleCashierSidebar() {
  document.getElementById('cashierSidebar')?.classList.toggle('collapsed');
  document.getElementById('cashierMain')?.classList.toggle('expanded');
}

/* ============================================================
   TAB NAVIGATION — Generic helper
   ============================================================ */
function switchPanelTab(prefix, tab, el) {
  document.querySelectorAll(`#view-${prefix} .tab-panel`)
    .forEach(p => p.classList.add('hidden'));
  document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
  document.querySelectorAll(`#view-${prefix} .nav-item`)
    .forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
}

function devSwitchTab(tab, el) {
  switchPanelTab('dev', tab, el);
  if (tab === 'dev-retailers')     renderRetailers();
  if (tab === 'dev-subscriptions') renderPlans();
  if (tab === 'dev-customers')     renderDevCustomers();
  if (tab === 'dev-stores')        { renderDevStoreMonitor && renderDevStoreMonitor(); renderDevInventoryTable && renderDevInventoryTable(); }
}

function clientSwitchTab(tab, el) {
  switchPanelTab('client', tab, el);
  if (tab === 'client-dashboard') renderClientDashboard();
  if (tab === 'client-inventory') renderClientInventory();
  if (tab === 'client-orders')    renderOrders();
  if (tab !== 'cashier-checkout') stopCheckoutScanner();
}

function cashierSwitchTab(tab, el) {
  switchPanelTab('cashier', tab, el);
  if (tab === 'cashier-dashboard') renderCashierDashboard();
  if (tab === 'cashier-inventory') renderCashierInventory();
  if (tab !== 'cashier-checkout')  stopCheckoutScanner();
}

/* ============================================================
   ██████╗ ███████╗██╗   ██╗
   ██╔══██╗██╔════╝██║   ██║
   ██║  ██║█████╗  ██║   ██║
   ██║  ██║██╔══╝  ╚██╗ ██╔╝
   ██████╔╝███████╗ ╚████╔╝
   ╚═════╝ ╚══════╝  ╚═══╝
   DEVELOPER PANEL
   ============================================================ */

/* ── Dev Dashboard ── */
function renderDevDashboard() {
  const retailers  = Retailers.getAll();
  const plans      = Store.get('subscription_plans') || [];
  const active     = retailers.filter(r => Retailers.isActive(r));
  const expired    = retailers.filter(r => !Retailers.isActive(r));
  const monthlyRev = Retailers.monthlySubscriptionRevenue();

  // Stats
  document.getElementById('devStatsGrid').innerHTML = `
    ${devStatCard('🏪', 'Total Retailers', retailers.length, 'blue')}
    ${devStatCard('✅', 'Active',           active.length, 'green')}
    ${devStatCard('⚠️', 'Expired',          expired.length, 'yellow')}
    ${devStatCard('💰', 'Monthly Revenue',  formatPHP(monthlyRev), 'blue')}
  `;

  // Quick retailer list
  const qEl = document.getElementById('devRetailerQuick');
  if (!active.length) {
    qEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🏪</div><p>No active retailers</p></div>`;
  } else {
    qEl.innerHTML = active.slice(0, 6).map(r => {
      const plan = plans.find(p => p.id === r.plan);
      return `<div class="recent-order-item">
        <div>
          <div style="font-weight:600;font-family:var(--font-subhead)">${r.storeName}</div>
          <div style="font-size:12px;color:var(--gray-400);font-family:var(--font-data)">${r.clientName} · ${r.location || '—'}</div>
        </div>
        <span class="badge badge-green">${plan?.name || '—'}</span>
      </div>`;
    }).join('');
  }

  // Revenue overview by plan
  const rEl = document.getElementById('devRevenueOverview');
  rEl.innerHTML = plans.map(plan => {
    const count  = retailers.filter(r => r.plan === plan.id && Retailers.isActive(r)).length;
    const rev    = count * plan.price;
    return `<div class="totals-row">
      <span style="font-family:var(--font-subhead)">${plan.name}</span>
      <span style="font-family:var(--font-data);color:var(--gray-400)">${count} × ${formatPHP(plan.price)}</span>
      <span class="recent-order-amount">${formatPHP(rev)}</span>
    </div>`;
  }).join('') + `<div class="totals-row total">
    <span>Total Monthly</span><span></span>
    <span>${formatPHP(monthlyRev)}</span>
  </div>`;
}

/* ── Developer Customers Tab ── */
let _devCustData = [];

function renderDevCustomers() {
  const tbody = document.getElementById('devCustomersBody');
  if (!tbody) return;

  // Gather from global customer store (auth system) + legacy customers
  const globalCustomers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
  const legacyCustomers = (Store.get('customers') || []).map(c => ({
    id: c.id,
    name: c.name,
    email: c.email || '',
    joined: c.joined || '—',
    lastLogin: '—',
    totalOrders: c.totalOrders || 0,
    source: 'legacy'
  }));

  const globalFormatted = globalCustomers.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email || '',
    joined: c.joined || '—',
    lastLogin: c.lastLogin || '—',
    totalOrders: c.totalOrders || 0,
    source: 'registered'
  }));

  // Merge, deduplicate by email
  const seen = new Set();
  _devCustData = [...globalFormatted, ...legacyCustomers].filter(c => {
    if (!c.email || seen.has(c.email)) return false;
    seen.add(c.email); return true;
  });

  // Demo fallback if empty
  if (!_devCustData.length) {
    _devCustData = [
      { id: 'GC001', name: 'Mark Santos',  email: 'mark@gmail.com',  joined: '2025-01-10', lastLogin: '2025-05-14', totalOrders: 5,  source: 'registered' },
      { id: 'GC002', name: 'Ana Reyes',    email: 'ana@gmail.com',   joined: '2025-02-03', lastLogin: '2025-05-10', totalOrders: 3,  source: 'registered' },
      { id: 'C001',  name: 'Maria Santos', email: 'maria@email.com', joined: '2024-01-15', lastLogin: '—',          totalOrders: 12, source: 'legacy'     },
      { id: 'C002',  name: 'Jose Reyes',   email: 'jose@email.com',  joined: '2024-02-20', lastLogin: '—',          totalOrders: 8,  source: 'legacy'     },
      { id: 'C003',  name: 'Ana Cruz',     email: 'ana@email.com',   joined: '2024-03-10', lastLogin: '—',          totalOrders: 5,  source: 'legacy'     },
    ];
  }

  _renderDevCustomersTable(_devCustData);
}

function _renderDevCustomersTable(data) {
  const tbody = document.getElementById('devCustomersBody');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray-400);font-family:var(--font-body)">No customers registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr>
      <td style="font-family:var(--font-data);color:var(--blue-light)">${c.email || '—'}</td>
      <td style="font-weight:600">${c.name || '—'}</td>
      <td style="font-family:var(--font-data);color:var(--gray-400)">${c.joined || '—'}</td>
      <td style="font-family:var(--font-data);color:var(--gray-400)">${c.lastLogin || '—'}</td>
      <td style="font-family:var(--font-digital);color:var(--green)">${c.totalOrders ?? 0}</td>
      <td><span class="badge ${c.source === 'registered' ? 'badge-green' : 'badge-blue'}">${c.source === 'registered' ? 'Registered' : 'Legacy'}</span></td>
    </tr>
  `).join('');
}

function filterDevCustomers() {
  const q = (document.getElementById('devCustSearch')?.value || '').toLowerCase();
  if (!q) { _renderDevCustomersTable(_devCustData); return; }
  const filtered = _devCustData.filter(c =>
    (c.email || '').toLowerCase().includes(q) ||
    (c.name  || '').toLowerCase().includes(q)
  );
  _renderDevCustomersTable(filtered);
}

function devStatCard(icon, label, value, color) {
  return `<div class="stat-card">
    <div class="stat-icon ${color}">${icon}</div>
    <div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  </div>`;
}

/* ── Retailers ── */
function renderRetailers(data) {
  const plans     = Store.get('subscription_plans') || [];
  const retailers = data || Retailers.getAll();
  const grid      = document.getElementById('retailersGrid');

  if (!retailers.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏪</div><p>No retailers yet. Add one to get started.</p></div>`;
    return;
  }

  grid.innerHTML = retailers.map(r => {
    const plan     = plans.find(p => p.id === r.plan);
    const isActive = Retailers.isActive(r);
    const days     = daysUntil(r.subscriptionEnd);
    const pct      = calcSubPercent(r.subscriptionStart, r.subscriptionEnd);
    const barClass = !isActive ? 'expired' : days <= 14 ? 'expiring' : 'active';
    const statusBadge = isActive
      ? `<span class="badge badge-green"><span class="status-dot active"></span>Active</span>`
      : `<span class="badge badge-red"><span class="status-dot expired"></span>Expired</span>`;

    // Mini revenue sparkline
    const rev = r.monthlyRevenue || [];
    const maxRev = Math.max(...rev, 1);
    const bars   = rev.map(v => `<div class="mini-bar" style="height:${Math.max(10, (v/maxRev)*100)}%" title="${formatPHP(v)}"></div>`).join('');

    return `<div class="retailer-card">
      <div class="retailer-header">
        <div>
          <div class="retailer-name">${r.storeName}</div>
          <div class="retailer-meta">${r.clientName}</div>
        </div>
        ${statusBadge}
      </div>
      <div class="retailer-info">
        <div class="retailer-info-item"><span class="retailer-info-label">📍 Location</span>${r.location || '—'}</div>
        <div class="retailer-info-item"><span class="retailer-info-label">📧 Gmail</span>${r.email || '—'}</div>
        <div class="retailer-info-item"><span class="retailer-info-label">📞 Phone</span>${r.phone || '—'}</div>
        <div class="retailer-info-item"><span class="retailer-info-label">💳 Plan</span>${plan?.name || '—'}</div>
      </div>
      <div style="margin:10px 0">
        <span class="access-code">${r.accessCode || '—'}</span>
      </div>
      <div class="subscription-bar">
        <div class="sub-bar-label">
          <span>Sub expires: ${formatDateShort(r.subscriptionEnd)}</span>
          <span class="${!isActive ? 'expiry-critical' : days <= 14 ? 'expiry-warn' : 'expiry-ok'}">${!isActive ? 'Expired' : `${days}d left`}</span>
        </div>
        <div class="sub-bar-track"><div class="sub-bar-fill ${barClass}" style="width:${pct}%"></div></div>
      </div>
      <div>
        <div style="font-family:var(--font-data);font-size:10px;color:var(--gray-400);margin:10px 0 4px;text-transform:uppercase;letter-spacing:0.06em">6-Month Revenue</div>
        <div class="mini-chart">${bars}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-ghost btn-sm" onclick="openEditRetailerModal('${r.id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRetailer('${r.id}')">🗑️ Delete</button>
      </div>
    </div>`;
  }).join('');
}

function calcSubPercent(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = Date.now();
  if (n >= e) return 100;
  return Math.min(100, Math.round(((n - s) / (e - s)) * 100));
}

function filterRetailers() {
  const q      = document.getElementById('retailerSearch').value.toLowerCase();
  const status = document.getElementById('retailerStatusFilter').value;
  const plan   = document.getElementById('retailerPlanFilter').value;
  let list     = Retailers.getAll();

  if (q)      list = list.filter(r => r.storeName.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q));
  if (status) list = list.filter(r => status === 'active' ? Retailers.isActive(r) : !Retailers.isActive(r));
  if (plan)   list = list.filter(r => r.plan === plan);
  renderRetailers(list);
}

function openAddRetailerModal() {
  document.getElementById('retailerModalTitle').textContent = 'Add Retailer';
  document.getElementById('rEditId').value      = '';
  document.getElementById('rClientName').value  = '';
  document.getElementById('rStoreName').value   = '';
  document.getElementById('rEmail').value       = '';
  document.getElementById('rPhone').value       = '';
  document.getElementById('rLocation').value    = '';
  document.getElementById('rPlan').value        = 'PLAN_BASIC';
  document.getElementById('rAccessCode').value  = '';
  // Default end date: 30 days from now
  const end = new Date(); end.setDate(end.getDate() + 30);
  document.getElementById('rSubEnd').value = end.toISOString().slice(0, 10);
  openModal('modal-retailer');
}

function openEditRetailerModal(id) {
  const r = Retailers.findById(id);
  if (!r) return;
  document.getElementById('retailerModalTitle').textContent = 'Edit Retailer';
  document.getElementById('rEditId').value      = r.id;
  document.getElementById('rClientName').value  = r.clientName;
  document.getElementById('rStoreName').value   = r.storeName;
  document.getElementById('rEmail').value       = r.email || '';
  document.getElementById('rPhone').value       = r.phone || '';
  document.getElementById('rLocation').value    = r.location || '';
  document.getElementById('rPlan').value        = r.plan || 'PLAN_BASIC';
  document.getElementById('rAccessCode').value  = r.accessCode || '';
  document.getElementById('rSubEnd').value      = r.subscriptionEnd || '';
  openModal('modal-retailer');
}

function saveRetailer() {
  const editId = document.getElementById('rEditId').value;
  const data = {
    clientName:       document.getElementById('rClientName').value.trim(),
    storeName:        document.getElementById('rStoreName').value.trim(),
    email:            document.getElementById('rEmail').value.trim(),
    phone:            document.getElementById('rPhone').value.trim(),
    location:         document.getElementById('rLocation').value.trim(),
    plan:             document.getElementById('rPlan').value,
    accessCode:       document.getElementById('rAccessCode').value.trim() || uid() + '-' + document.getElementById('rPlan').value.replace('PLAN_',''),
    subscriptionEnd:  document.getElementById('rSubEnd').value,
    subscriptionStart: editId ? undefined : new Date().toISOString().slice(0,10),
    status: 'active',
  };
  if (!data.clientName || !data.storeName) { toast('Client and store name required', 'warning'); return; }

  if (editId) {
    Retailers.update(editId, data);
    toast('Retailer updated ✅', 'success');
  } else {
    Retailers.add(data);
    toast('Retailer added ✅', 'success');
  }
  closeModal('modal-retailer');
  renderRetailers();
  renderDevDashboard();
}

function deleteRetailer(id) {
  const r = Retailers.findById(id);
  if (!r || !confirm(`Remove retailer "${r.storeName}"?`)) return;
  Retailers.delete(id);
  toast('Retailer removed', 'warning');
  renderRetailers();
  renderDevDashboard();
}

/* ── Subscription Plans ── */
function renderPlans() {
  const plans     = Store.get('subscription_plans') || [];
  const retailers = Retailers.getAll();
  const grid      = document.getElementById('plansGrid');

  grid.innerHTML = plans.map((plan, i) => {
    const count = retailers.filter(r => r.plan === plan.id && Retailers.isActive(r)).length;
    return `<div class="plan-card ${i === 1 ? 'featured' : ''}">
      <div style="font-family:var(--font-display);font-size:1.3rem">${plan.name}</div>
      <div class="plan-price">${formatPHP(plan.price)}<span style="font-size:0.7rem;font-family:var(--font-body);color:var(--gray-400)">/mo</span></div>
      <div style="font-family:var(--font-data);font-size:12px;color:var(--blue-light);margin-bottom:12px">${count} active subscriber${count !== 1 ? 's' : ''}</div>
      <div style="font-family:var(--font-body);font-size:13px;color:var(--gray-400);text-align:left">
        ${plan.features.map(f => `<div style="padding:3px 0">✓ ${f}</div>`).join('')}
      </div>
    </div>`;
  }).join('');

  // Overview table
  const tableEl = document.getElementById('subOverviewTable');
  tableEl.innerHTML = `<div class="table-wrapper"><table>
    <thead><tr><th>Plan</th><th>Price/mo</th><th>Active Subs</th><th>Monthly Revenue</th></tr></thead>
    <tbody>
      ${plans.map(plan => {
        const count = retailers.filter(r => r.plan === plan.id && Retailers.isActive(r)).length;
        return `<tr>
          <td><strong>${plan.name}</strong></td>
          <td class="digital">${formatPHP(plan.price)}</td>
          <td>${count}</td>
          <td class="digital" style="color:var(--green)">${formatPHP(count * plan.price)}</td>
        </tr>`;
      }).join('')}
      <tr style="font-weight:700;border-top:2px solid rgba(255,255,255,0.1)">
        <td colspan="3" style="font-family:var(--font-subhead)">Total</td>
        <td class="digital" style="color:var(--green)">${formatPHP(Retailers.monthlySubscriptionRevenue())}</td>
      </tr>
    </tbody>
  </table></div>`;
}

/* ============================================================
   ██████╗██╗     ██╗███████╗███╗   ██╗████████╗
  ██╔════╝██║     ██║██╔════╝████╗  ██║╚══██╔══╝
  ██║     ██║     ██║█████╗  ██╔██╗ ██║   ██║
  ██║     ██║     ██║██╔══╝  ██║╚██╗██║   ██║
  ╚██████╗███████╗██║███████╗██║ ╚████║   ██║
   ╚═════╝╚══════╝╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝
   CLIENT PANEL
   ============================================================ */

function renderClientDashboard() {
  const inv       = Inventory.getAll();
  const customers = Customers.getAll();
  const orders    = Orders.getAll();
  const todayRev  = Orders.todayRevenue();
  const totalRev  = Orders.totalRevenue();
  const lowStock  = inv.filter(p => Inventory.isLowStock(p));

  document.getElementById('clientStatsGrid').innerHTML = `
    ${devStatCard('💰', "Today's Revenue",  formatPHP(todayRev),     'blue')}
    ${devStatCard('📊', 'Total Revenue',    formatPHP(totalRev),     'green')}
    ${devStatCard('📋', 'Total Orders',     orders.length,            'blue')}
    ${devStatCard('📦', 'Total Products',   inv.length,               'blue')}
    ${devStatCard('👥', 'Customers',         customers.length,         'green')}
    ${devStatCard('⚠️', 'Low Stock',         lowStock.length,          'yellow')}
  `;

  // Low stock
  const lsEl = document.getElementById('clientLowStock');
  if (!lowStock.length) {
    lsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>All items well stocked</p></div>`;
  } else {
    lsEl.innerHTML = lowStock.slice(0,8).map(p => `
      <div class="low-stock-item">
        <div class="low-stock-name"><span>${p.image||'📦'}</span>${p.name}</div>
        <span class="badge ${p.stock === 0 ? 'badge-red' : 'badge-yellow'}">${p.stock === 0 ? 'OUT' : p.stock + ' left'}</span>
      </div>`).join('');
  }

  // Recent orders
  const roEl = document.getElementById('clientRecentOrders');
  if (!orders.length) {
    roEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No orders yet</p></div>`;
  } else {
    roEl.innerHTML = orders.slice(0,6).map(o => `
      <div class="recent-order-item">
        <div>
          <div class="recent-order-id">${o.id}</div>
          <div style="color:var(--gray-400);font-size:12px;font-family:var(--font-body)">${o.customerName||'Walk-in'} · ${formatDate(o.date)}</div>
        </div>
        <span class="recent-order-amount">${formatPHP(o.total||0)}</span>
      </div>`).join('');
  }
}

/* ── Client Inventory ── */
function renderClientInventory(data) {
  const items = data || Inventory.getAll();

  // Populate category filter
  const catEl = document.getElementById('clientInvCat');
  if (catEl) {
    const curCat = catEl.value;
    catEl.innerHTML = '<option value="">All Categories</option>' +
      Inventory.categories().map(c => `<option value="${c}" ${c===curCat?'selected':''}>${c}</option>`).join('');
  }

  const tbody = document.getElementById('clientInvBody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📦</div><p>No products found</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = [...items]
    .sort((a,b) => a.name.localeCompare(b.name))
    .map(p => {
      const stockBadge = stockStatusBadge(p);
      const expiryHtml = expiryDisplay(p);
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:8px"><span>${p.image||'📦'}</span><strong style="font-family:var(--font-body)">${p.name}</strong></div></td>
        <td class="barcode-text">${p.barcode||'—'}</td>
        <td>${p.category||'—'}</td>
        <td style="font-family:var(--font-data);font-size:12px;color:var(--gray-400)">${p.type||'—'}</td>
        <td class="digital">${formatPHP(p.price)}</td>
        <td class="digital">${p.stock}</td>
        <td>${expiryHtml}</td>
        <td>${stockBadge}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="openEditProductModal('${p.id}','client')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
}

function filterClientInventory() {
  const q      = document.getElementById('clientInvSearch').value.toLowerCase();
  const cat    = document.getElementById('clientInvCat').value;
  const sort   = document.getElementById('clientInvSort').value;
  const status = document.getElementById('clientInvStatus').value;
  let items    = Inventory.getAll()
    .filter(p => (!q || p.name.toLowerCase().includes(q) || (p.barcode||'').includes(q)) && (!cat || p.category === cat));

  if (status === 'low') items = items.filter(p => Inventory.isLowStock(p));
  if (status === 'out') items = items.filter(p => p.stock === 0);
  if (status === 'ok')  items = items.filter(p => p.stock > (p.lowStockAt||10));

  if (sort === 'name')       items.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === 'stock-asc')  items.sort((a,b) => a.stock - b.stock);
  if (sort === 'stock-desc') items.sort((a,b) => b.stock - a.stock);
  if (sort === 'expiry')     items.sort((a,b) => new Date(a.expiry||'9999') - new Date(b.expiry||'9999'));
  if (sort === 'price-asc')  items.sort((a,b) => a.price - b.price);

  renderClientInventory(items);
}

/* ── Stock status badge ── */
function stockStatusBadge(p) {
  if (p.stock === 0) return `<span class="badge stock-badge-out">Out of Stock</span>`;
  if (Inventory.isLowStock(p)) return `<span class="badge stock-badge-low">Low Stock</span>`;
  return `<span class="badge stock-badge-in">In Stock</span>`;
}

/* ── Expiry display ── */
function expiryDisplay(p) {
  if (!p.expiry) return '<span style="color:var(--gray-400);font-family:var(--font-data)">—</span>';
  const days = daysUntil(p.expiry);
  if (days === null) return '—';
  if (days < 0) return `<span class="expiry-critical" style="font-family:var(--font-data);font-size:12px">EXPIRED</span>`;
  if (days <= 7) return `<span class="expiry-warn" style="font-family:var(--font-data);font-size:12px">${p.expiry} <em>(${days}d)</em></span>`;
  return `<span style="font-family:var(--font-data);font-size:12px;color:var(--gray-400)">${p.expiry}</span>`;
}

/* ── Add / Edit Product Modal ── */
function openAddProductModal(panel = 'client') {
  const suffix = panel === 'cashier' ? 'Cashier' : '';
  document.getElementById(`prodModalTitle${suffix === '' ? '' : ''}`);
  if (panel === 'cashier') {
    // Fill cashier modal
    document.getElementById('prodEditIdCashier').value = '';
    ['pNameC','pImageC','pBarcodeC','pCategoryC','pTypeC','pUnitC','pPriceC','pStockC','pExpiryC'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('pLowAtC').value = '10';
    openModal('modal-product-cashier');
  } else {
    document.getElementById('prodEditId').value = '';
    ['pName','pImage','pBarcode','pCategory','pType','pUnit','pPrice','pStock','pExpiry'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('pLowAt').value = '10';
    document.getElementById('prodModalTitle').textContent = 'Add Product';
    openModal('modal-product-client');
  }
}

function openEditProductModal(id, panel = 'client') {
  const p = Inventory.findById(id);
  if (!p) return;
  if (panel === 'cashier') {
    document.getElementById('prodEditIdCashier').value = p.id;
    document.getElementById('pNameC').value      = p.name;
    document.getElementById('pImageC').value     = p.image||'';
    document.getElementById('pBarcodeC').value   = p.barcode||'';
    document.getElementById('pCategoryC').value  = p.category||'';
    document.getElementById('pTypeC').value      = p.type||'';
    document.getElementById('pUnitC').value      = p.unit||'';
    document.getElementById('pPriceC').value     = p.price||'';
    document.getElementById('pStockC').value     = p.stock||'';
    document.getElementById('pLowAtC').value     = p.lowStockAt||10;
    document.getElementById('pExpiryC').value    = p.expiry||'';
    openModal('modal-product-cashier');
  } else {
    document.getElementById('prodEditId').value      = p.id;
    document.getElementById('pName').value           = p.name;
    document.getElementById('pImage').value          = p.image||'';
    document.getElementById('pBarcode').value        = p.barcode||'';
    document.getElementById('pCategory').value       = p.category||'';
    document.getElementById('pType').value           = p.type||'';
    document.getElementById('pUnit').value           = p.unit||'';
    document.getElementById('pPrice').value          = p.price||'';
    document.getElementById('pStock').value          = p.stock||'';
    document.getElementById('pLowAt').value          = p.lowStockAt||10;
    document.getElementById('pExpiry').value         = p.expiry||'';
    document.getElementById('prodModalTitle').textContent = 'Edit Product';
    openModal('modal-product-client');
  }
}

function saveProduct(panel = 'client') {
  const isCashier = panel === 'cashier';
  const suffix    = isCashier ? 'C' : '';
  const editId    = document.getElementById(isCashier ? 'prodEditIdCashier' : 'prodEditId').value;

  const data = {
    name:      document.getElementById('pName' + suffix).value.trim(),
    image:     document.getElementById('pImage' + suffix).value.trim() || '📦',
    barcode:   document.getElementById('pBarcode' + suffix).value.trim(),
    category:  document.getElementById('pCategory' + suffix).value.trim(),
    type:      document.getElementById('pType' + suffix).value.trim(),
    unit:      document.getElementById('pUnit' + suffix).value.trim() || 'unit',
    price:     parseFloat(document.getElementById('pPrice' + suffix).value) || 0,
    stock:     parseInt(document.getElementById('pStock' + suffix).value) || 0,
    lowStockAt:parseInt(document.getElementById('pLowAt' + suffix).value) || 10,
    expiry:    document.getElementById('pExpiry' + suffix).value,
  };

  if (!data.name) { toast('Product name is required', 'warning'); return; }

  if (editId) {
    Inventory.update(editId, data);
    toast('Product updated ✅', 'success');
  } else {
    Inventory.add(data);
    toast('Product added ✅', 'success');
  }

  closeModal(isCashier ? 'modal-product-cashier' : 'modal-product-client');
  renderClientInventory();
  renderCashierInventory();
  renderClientDashboard();
  renderCashierDashboard();
}

function deleteProduct(id) {
  const p = Inventory.findById(id);
  if (!p || !confirm(`Delete "${p.name}"?`)) return;
  Inventory.delete(id);
  toast('Product deleted', 'warning');
  renderClientInventory();
  renderCashierInventory();
}

/* ── Barcode scan to fill field ── */
let _fieldScanTarget = null;
function scanBarcodeForField(fieldId) {
  _fieldScanTarget = fieldId;
  openScannerModal('field-scan');
}

/* ── Customers ── */
function renderCustomers(data) {
  const customers = data || Customers.getAll();
  const tbody     = document.getElementById('customersBody');
  if (!customers.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">👥</div><p>No customers yet</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = customers.map(c => `
    <tr>
      <td class="barcode-text">${c.id}</td>
      <td><strong style="font-family:var(--font-body)">${c.name}</strong></td>
      <td style="font-family:var(--font-data);font-size:12px">${c.email||'—'}</td>
      <td style="font-family:var(--font-data);font-size:12px">${c.phone||'—'}</td>
      <td style="font-family:var(--font-data);font-size:12px">${c.joined||'—'}</td>
      <td class="digital" style="color:var(--green)">${c.points||0} pts</td>
      <td><span class="badge badge-blue">${c.totalOrders||0} orders</span></td>
      <td><span class="access-code">${c.regCode||'—'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="openEditCustomerModal('${c.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function filterCustomers() {
  const q = document.getElementById('custSearch').value.toLowerCase();
  renderCustomers(Customers.getAll().filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.email||'').toLowerCase().includes(q) ||
    (c.phone||'').includes(q) ||
    (c.regCode||'').toLowerCase().includes(q)
  ));
}

function openAddCustomerModal() {
  document.getElementById('custModalTitle').textContent = 'Add Customer';
  document.getElementById('cEditId').value   = '';
  document.getElementById('cName').value     = '';
  document.getElementById('cEmail').value    = '';
  document.getElementById('cPhone').value    = '';
  document.getElementById('cRegCode').value  = '';
  openModal('modal-customer');
}

function openEditCustomerModal(id) {
  const c = Customers.findById(id);
  if (!c) return;
  document.getElementById('custModalTitle').textContent = 'Edit Customer';
  document.getElementById('cEditId').value   = c.id;
  document.getElementById('cName').value     = c.name;
  document.getElementById('cEmail').value    = c.email||'';
  document.getElementById('cPhone').value    = c.phone||'';
  document.getElementById('cRegCode').value  = c.regCode||'';
  openModal('modal-customer');
}

function saveCustomer(e) {
  if (e) e.preventDefault();
  const editId = document.getElementById('cEditId').value;
  const data   = {
    name:    document.getElementById('cName').value.trim(),
    email:   document.getElementById('cEmail').value.trim(),
    phone:   document.getElementById('cPhone').value.trim(),
    regCode: document.getElementById('cRegCode').value.trim() || undefined,
  };
  if (!data.name) { toast('Name required', 'warning'); return; }
  if (editId) {
    Customers.update(editId, data);
    toast('Customer updated ✅', 'success');
  } else {
    Customers.add(data);
    toast('Customer added ✅', 'success');
  }
  closeModal('modal-customer');
  renderCustomers();
  renderClientDashboard();
}

function deleteCustomer(id) {
  const c = Customers.findById(id);
  if (!c || !confirm(`Remove customer "${c.name}"?`)) return;
  Customers.delete(id);
  toast('Customer removed', 'warning');
  renderCustomers();
  renderClientDashboard();
}

/* ── Orders ── */
function renderOrders() {
  const orders = Orders.getAll();
  const tbody  = document.getElementById('ordersBody');
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><p>No orders yet</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td class="barcode-text">${o.id}</td>
      <td><strong style="font-family:var(--font-body)">${o.customerName||'Walk-in'}</strong></td>
      <td style="font-family:var(--font-data);font-size:12px">${formatDate(o.date)}</td>
      <td>${o.items?.length||0} items</td>
      <td class="digital" style="color:var(--green)">${formatPHP(o.total||0)}</td>
      <td><span class="badge badge-green">${o.status||'completed'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="viewOrderReceipt('${o.id}')">🧾</button></td>
    </tr>`).join('');
}

/* ============================================================
   ██████╗ █████╗ ███████╗██╗  ██╗██╗███████╗██████╗
  ██╔════╝██╔══██╗██╔════╝██║  ██║██║██╔════╝██╔══██╗
  ██║     ███████║███████╗███████║██║█████╗  ██████╔╝
  ██║     ██╔══██║╚════██║██╔══██║██║██╔══╝  ██╔══██╗
  ╚██████╗██║  ██║███████║██║  ██║██║███████╗██║  ██║
   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝
   CASHIER PANEL
   ============================================================ */

function renderCashierDashboard() {
  const inv      = Inventory.getAll();
  const lowStock = inv.filter(p => Inventory.isLowStock(p) || p.stock === 0);
  const todayRev = Orders.todayRevenue();
  const todayCnt = Orders.todayCount();
  const todayOrders = Orders.getAll().filter(o => o.date && o.date.slice(0,10) === new Date().toISOString().slice(0,10));

  document.getElementById('cashierStatsGrid').innerHTML = `
    ${devStatCard('💰', "Today's Revenue", formatPHP(todayRev), 'green')}
    ${devStatCard('📋', "Today's Orders",  todayCnt,             'blue')}
    ${devStatCard('📦', 'Total Products',  inv.length,            'blue')}
    ${devStatCard('⚠️', 'Low Stock Items', lowStock.length,       'yellow')}
  `;

  // Low stock list
  const lsEl = document.getElementById('cashierLowStock');
  if (!lowStock.length) {
    lsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>All items well stocked</p></div>`;
  } else {
    lsEl.innerHTML = lowStock.slice(0,8).map(p => `
      <div class="low-stock-item">
        <div class="low-stock-name"><span>${p.image||'📦'}</span>${p.name}</div>
        <span class="badge ${p.stock===0?'badge-red':'badge-yellow'}">${p.stock===0?'OUT':p.stock+' left'}</span>
      </div>`).join('');
  }

  // Today's orders
  const toEl = document.getElementById('cashierTodayOrders');
  if (!todayOrders.length) {
    toEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><p>No orders today yet</p></div>`;
  } else {
    toEl.innerHTML = todayOrders.slice(0,6).map(o => `
      <div class="recent-order-item">
        <div>
          <div class="recent-order-id">${o.id}</div>
          <div style="color:var(--gray-400);font-size:12px;font-family:var(--font-body)">${o.customerName||'Walk-in'}</div>
        </div>
        <span class="recent-order-amount">${formatPHP(o.total||0)}</span>
      </div>`).join('');
  }
}

/* ── Cashier Inventory ── */
function renderCashierInventory(data) {
  const items = data || Inventory.getAll();

  const catEl = document.getElementById('cashierInvCat');
  if (catEl) {
    const cur = catEl.value;
    catEl.innerHTML = '<option value="">All Categories</option>' +
      Inventory.categories().map(c => `<option value="${c}" ${c===cur?'selected':''}>${c}</option>`).join('');
  }

  const tbody = document.getElementById('cashierInvBody');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📦</div><p>No products</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = [...items]
    .sort((a,b) => a.name.localeCompare(b.name))
    .map(p => `<tr>
      <td><div style="display:flex;align-items:center;gap:8px"><span>${p.image||'📦'}</span><strong style="font-family:var(--font-body)">${p.name}</strong></div></td>
      <td>${p.category||'—'}</td>
      <td style="font-family:var(--font-data);font-size:12px;color:var(--gray-400)">${p.type||'—'}</td>
      <td class="digital">${formatPHP(p.price)}</td>
      <td class="digital">${p.stock}</td>
      <td>${expiryDisplay(p)}</td>
      <td>${stockStatusBadge(p)}</td>
      <td>
        <div class="stock-edit">
          <input id="stockEdit_${p.id}" type="number" value="${p.stock}" min="0" style="width:64px" onkeydown="if(event.key==='Enter')saveStockEdit('${p.id}')" />
          <button class="btn btn-ghost btn-sm" onclick="saveStockEdit('${p.id}')">✔</button>
        </div>
      </td>
    </tr>`).join('');
}

function filterCashierInventory() {
  const q    = document.getElementById('cashierInvSearch').value.toLowerCase();
  const cat  = document.getElementById('cashierInvCat').value;
  const sort = document.getElementById('cashierInvSort').value;
  let items  = Inventory.getAll().filter(p =>
    (!q || p.name.toLowerCase().includes(q) || (p.barcode||'').includes(q)) &&
    (!cat || p.category === cat)
  );
  if (sort === 'name')      items.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === 'stock-asc') items.sort((a,b) => a.stock - b.stock);
  if (sort === 'expiry')    items.sort((a,b) => new Date(a.expiry||'9999') - new Date(b.expiry||'9999'));
  renderCashierInventory(items);
}

function saveStockEdit(id) {
  const input = document.getElementById('stockEdit_' + id);
  if (!input) return;
  const val = parseInt(input.value);
  if (isNaN(val) || val < 0) { toast('Invalid stock value', 'warning'); return; }
  Inventory.update(id, { stock: val });
  toast('Stock updated', 'success');
  renderCashierInventory();
  renderCashierDashboard();
}

/* ── CHECKOUT SCANNER ── */
let checkoutScanner = null;

async function startCheckoutScanner() {
  const video   = document.getElementById('checkoutScanVideo');
  const statusEl = document.getElementById('checkoutScanStatus');
  if (statusEl) statusEl.textContent = '🔄 Starting camera…';

  await Scanner.start(video, (code) => {
    handleCheckoutQR(code);
  }, { statusEl });

  if (statusEl && Scanner.active) statusEl.textContent = '📷 Point camera at customer QR code';
}

async function stopCheckoutScanner() {
  await Scanner.stop();
  const statusEl = document.getElementById('checkoutScanStatus');
  if (statusEl) statusEl.textContent = '📷 Camera inactive';
}

function manualQREntry() {
  const raw = prompt('Paste QR data or JSON order payload:');
  if (raw && raw.trim()) handleCheckoutQR(raw.trim());
}

function handleCheckoutQR(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch(e) {
    toast('Invalid QR data — cannot parse order', 'error');
    return;
  }

  if (!data.items || !Array.isArray(data.items) || !data.items.length) {
    toast('QR does not contain valid order items', 'error');
    return;
  }

  stopCheckoutScanner();
  renderCheckoutOrder(data);
}

function renderCheckoutOrder(data) {
  const items  = data.items;
  const totals = calcTotals(items, data.discount || 0);
  const el     = document.getElementById('checkoutOrderContent');

  const itemsHtml = items.map(i => {
    const product = Inventory.findById(i.id);
    return `<div class="order-item-row">
      <span class="order-item-icon">${product?.image || '📦'}</span>
      <span class="order-item-name">${i.name}</span>
      <span class="order-item-qty">×${i.qty}</span>
      <span class="order-item-price">${formatPHP(i.price * i.qty)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="margin-bottom:12px">
      <strong style="font-family:var(--font-subhead)">${data.customerName || 'Guest'}</strong>
      ${data.listName ? `<span style="font-family:var(--font-data);font-size:12px;color:var(--gray-400);margin-left:8px">${data.listName}</span>` : ''}
    </div>
    <div class="order-summary-items">${itemsHtml}</div>
    <div class="order-totals">
      <div class="totals-row"><span>Subtotal</span><span>${formatPHP(totals.subtotal)}</span></div>
      ${totals.discount > 0 ? `<div class="totals-row" style="color:var(--green)"><span>Discount</span><span>-${formatPHP(totals.discount)}</span></div>` : ''}
      <div class="totals-row"><span>VAT (12%)</span><span>${formatPHP(totals.tax)}</span></div>
      <div class="totals-row total"><span>TOTAL</span><span>${formatPHP(totals.total)}</span></div>
    </div>
    <button class="btn btn-success btn-lg w-full" style="margin-top:20px"
      onclick='completeCheckout(${JSON.stringify(data).replace(/'/g,"&#39;")})'>
      ✅ Complete Checkout
    </button>`;
}

function completeCheckout(data) {
  // Deduct inventory stock
  Inventory.deductStock(data.items.map(i => ({ id: i.id, qty: i.qty })));

  // Save order record
  const order = Orders.add({
    customerId:   data.customerId,
    customerName: data.customerName || 'Walk-in',
    listName:     data.listName,
    items:        data.items,
    subtotal:     data.subtotal,
    discount:     data.discount || 0,
    tax:          data.tax,
    total:        data.total,
    status:       'completed'
  });

  // Update customer points & order count
  if (data.customerId) {
    const cust = Customers.findById(data.customerId);
    if (cust) {
      const pts = Customers.addPoints(data.customerId, data.total);
      Customers.update(data.customerId, { totalOrders: (cust.totalOrders||0) + 1 });
      toast(`+${pts} reward points for ${cust.name} 🌟`, 'success');
    }
  }

  toast('Checkout complete! 🎉', 'success');
  showReceiptCashier(order);
  document.getElementById('checkoutOrderContent').innerHTML =
    `<div class="empty-state"><div class="empty-icon">✅</div><p>Order completed! Scan next customer.</p></div>`;
  renderCashierDashboard();
  renderCashierInventory();
  renderClientDashboard();
  renderOrders();
}

/* ── Receipt (Cashier) ── */
function showReceiptCashier(order) {
  const now = new Date();
  let html = `
    <div class="receipt">
      <div class="receipt-title">🛒 SHOP COMPANION</div>
      <div style="text-align:center;font-family:var(--font-data);color:var(--gray-400);font-size:11px;margin-bottom:8px">OFFICIAL RECEIPT</div>
      <hr class="receipt-divider" />
      <div class="receipt-row"><span>Order:</span><span>${order.id}</span></div>
      <div class="receipt-row"><span>Customer:</span><span>${order.customerName}</span></div>
      <div class="receipt-row"><span>Date:</span><span>${now.toLocaleDateString('en-PH')}</span></div>
      <div class="receipt-row"><span>Time:</span><span>${now.toLocaleTimeString('en-PH')}</span></div>
      <hr class="receipt-divider" />`;

  order.items.forEach(i => {
    html += `<div class="receipt-row">
      <span>${i.name} ×${i.qty}</span>
      <span>${formatPHP(i.price * i.qty)}</span>
    </div>`;
  });

  html += `
      <hr class="receipt-divider" />
      <div class="receipt-row"><span>Subtotal:</span><span>${formatPHP(order.subtotal)}</span></div>
      ${order.discount ? `<div class="receipt-row" style="color:var(--green)"><span>Discount:</span><span>-${formatPHP(order.discount)}</span></div>` : ''}
      <div class="receipt-row"><span>VAT 12%:</span><span>${formatPHP(order.tax)}</span></div>
      <hr class="receipt-divider" />
      <div class="receipt-row receipt-total"><span>TOTAL:</span><span>${formatPHP(order.total)}</span></div>
      <hr class="receipt-divider" />
      <div style="text-align:center;margin-top:8px;font-family:var(--font-body);color:var(--gray-400);font-size:12px">Thank you for shopping! 💙</div>
    </div>`;

  document.getElementById('receiptContentCashier').innerHTML = html;
  openModal('modal-receipt-cashier');
}

/* Also used from client orders tab */
function viewOrderReceipt(orderId) {
  const order = Orders.getAll().find(o => o.id === orderId);
  if (!order) return;
  showReceiptCashier(order);
}

function printReceiptCashier() {
  const content = document.getElementById('receiptContentCashier').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Receipt</title>
    <style>body{font-family:'Courier New',monospace;padding:20px;max-width:380px;margin:auto}.receipt-row{display:flex;justify-content:space-between}</style>
    </head><body>${content}</body></html>`);
  win.document.close();
  win.print();
}

function printReceipt() { printReceiptCashier(); } // alias for client panel

/* ── Customer Access (Cashier) ── */
function renderCustomerAccess() {
  const listEl = document.getElementById('caList');
  if (!listEl) return;
  const tokens = getCustomerAccessTokens();
  if (!tokens.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔐</div><p>No active tokens</p></div>`;
    return;
  }
  listEl.innerHTML = tokens.map(t => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.03);margin-bottom:6px">
      <span style="font-family:var(--font-data);font-size:13px">${t.token}</span>
      <span style="font-family:var(--font-data);font-size:11px;color:var(--gray-400)">Exp: ${new Date(t.expires).toLocaleTimeString()}</span>
      <button class="btn btn-danger btn-sm" onclick="revokeCustomerAccess('${t.token}')">Revoke</button>
    </div>`).join('');
}

function generateCustomerAccess() {
  const minutes = parseInt(document.getElementById('caExpiry')?.value || '10', 10);
  const item    = createCustomerAccessToken(minutes);
  const base    = window.location.href.split('#')[0];
  const url     = `${base}#customer?access=${item.token}&exp=${item.expires}`;
  const out     = document.getElementById('caOutput');
  out.innerHTML = '';

  const container = document.createElement('div');
  container.style.cssText = 'display:flex;gap:16px;align-items:center;flex-wrap:wrap';

  const qrWrap = document.createElement('div');
  qrWrap.className = 'qr-wrapper';
  generatePlainQR(qrWrap, url, 200);
  container.appendChild(qrWrap);

  const info = document.createElement('div');
  info.innerHTML = `
    <div style="font-family:var(--font-subhead);font-weight:600;margin-bottom:8px">One-Time Access QR</div>
    <div style="font-family:var(--font-data);font-size:11px;word-break:break-all;color:var(--blue-light);margin-bottom:10px">${url}</div>
    <div style="font-family:var(--font-body);font-size:13px;color:var(--gray-400)">Expires in <strong>${minutes} min</strong></div>`;
  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-ghost btn-sm';
  copyBtn.textContent = '📋 Copy URL';
  copyBtn.style.marginTop = '10px';
  copyBtn.onclick = () => {
    try { navigator.clipboard.writeText(url); toast('URL copied!', 'success'); }
    catch(e) { prompt('Copy URL:', url); }
  };
  info.appendChild(copyBtn);
  container.appendChild(info);
  out.appendChild(container);
  renderCustomerAccess();
}

function revokeCustomerAccess(token) {
  if (!confirm('Revoke this access token?')) return;
  revokeCustomerAccessToken(token);
  renderCustomerAccess();
  toast('Token revoked', 'warning');
}

/* ── Inventory Barcode Scanner Modal (for adding products) ── */
let _barcodeInvPanel = 'client';

function openScannerModal(context) {
  _barcodeInvPanel = context === 'barcode-inv-cashier' ? 'cashier' : 'client';
  _fieldScanTarget  = context === 'field-scan' ? _fieldScanTarget : null;
  openModal('modal-barcode-inv');
  const video    = document.getElementById('barcodeInvVideo');
  const statusEl = document.getElementById('barcodeInvStatus');
  Scanner.start(video, (code) => {
    handleBarcodeInvScan(code);
  }, { statusEl });
}

function closeBarcodeInvScanner() {
  Scanner.stop();
  closeModal('modal-barcode-inv');
}

function handleBarcodeInvScan(code) {
  // If scanning for a specific field (e.g., barcode input)
  if (_fieldScanTarget) {
    const el = document.getElementById(_fieldScanTarget);
    if (el) el.value = code;
    closeBarcodeInvScanner();
    toast(`Barcode captured: ${code}`, 'success');
    return;
  }

  // Otherwise look up product
  const product = Inventory.findByBarcode(code);
  closeBarcodeInvScanner();
  if (product) {
    openEditProductModal(product.id, _barcodeInvPanel);
    toast(`Found: ${product.name}`, 'success');
  } else {
    // Pre-fill barcode field in add product modal
    openAddProductModal(_barcodeInvPanel);
    const suffix = _barcodeInvPanel === 'cashier' ? 'C' : '';
    const el = document.getElementById('pBarcode' + suffix);
    if (el) el.value = code;
    toast(`Barcode ${code} — new product. Fill in details.`, 'info');
  }
}

function handleBarcodeInvManual(code) {
  handleBarcodeInvScan(code);
}
