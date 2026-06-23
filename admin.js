/**
 * DASH UP v2.0 — Admin Panel Logic
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
  if (tab === 'dev-retailers')     loadAndRenderRetailers();
  if (tab === 'dev-subscriptions') renderPlans();
  if (tab === 'dev-customers')     renderDevCustomers();
  if (tab === 'dev-stores')        { renderDevStoreMonitor && renderDevStoreMonitor(); renderDevInventoryTable && renderDevInventoryTable(); }
}

/* Pull retailers from Supabase and sync to localStorage before rendering */
function loadAndRenderRetailers() {
  if (typeof DB !== 'undefined') {
    DB.getRetailers().then(retailers => {
      if (retailers && retailers.length) {
        // Merge into localStorage: Supabase is source of truth for dev panel
        const existing = Retailers.getAll();
        const existingIds = new Set(existing.map(r => r.id));
        const merged = [...existing];
        retailers.forEach(r => {
          if (!existingIds.has(r.id)) merged.push(r);
          else {
            const idx = merged.findIndex(x => x.id === r.id);
            if (idx !== -1) merged[idx] = { ...merged[idx], ...r };
          }
        });
        Retailers.save(merged);
      }
      renderRetailers();
      renderDevDashboard();
    }).catch(() => renderRetailers());
  } else {
    renderRetailers();
  }
}

function clientSwitchTab(tab, el) {
  switchPanelTab('client', tab, el);
  if (tab === 'client-dashboard') renderClientDashboard();
  if (tab === 'client-inventory') renderClientInventory();
  if (tab === 'client-orders')    loadAndRenderOrders();
  if (tab === 'client-cashiers')  loadAndRenderCashiersTable();
  if (tab === 'client-reports')   setTimeout(renderClientReports, 0);
  if (tab !== 'cashier-checkout') stopCheckoutScanner();
}

/* Pull orders from Supabase into localStorage cache before rendering */
function loadAndRenderOrders() {
  const storeId = AuthState.currentUser?.storeId;
  if (storeId && typeof DB !== 'undefined') {
    DB.getOrders(storeId).then(orders => {
      if (orders && orders.length) {
        // Only merge orders that belong to this store (belt-and-suspenders guard)
        const storeOrders = orders.filter(o => !o.storeId || o.storeId === storeId);
        const local = Orders.getAll();
        const localIds = new Set(local.map(o => o.id));
        const newOrders = storeOrders.filter(o => !localIds.has(o.id));
        if (newOrders.length) {
          Orders.save([...newOrders, ...local]);
        }
      }
      renderOrders();
    }).catch(() => renderOrders());
  } else {
    renderOrders();
  }
}

/* Pull cashiers from Supabase into localStorage cache before rendering */
function loadAndRenderCashiersTable() {
  const user = AuthState.currentUser;
  if (user?.email && typeof DB !== 'undefined') {
    DB.getCashiers(user.email).then(cashiers => {
      if (cashiers && cashiers.length) {
        // Sync into MultiStore (localStorage) cache
        const existing = MultiStore.getCashiers(user.email);
        const existingIds = new Set(existing.map(c => c.id));
        const merged = [...existing];
        cashiers.forEach(c => {
          if (!existingIds.has(c.id)) merged.push(c);
          else {
            const idx = merged.findIndex(x => x.id === c.id);
            if (idx !== -1) merged[idx] = { ...merged[idx], ...c };
          }
        });
        MultiStore.saveCashiers(user.email, merged);
      }
      if (typeof renderCashiersTable === 'function') renderCashiersTable();
    }).catch(() => {
      if (typeof renderCashiersTable === 'function') renderCashiersTable();
    });
  } else {
    if (typeof renderCashiersTable === 'function') renderCashiersTable();
  }
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

  // Show loading state
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-3);font-family:var(--font-body)">Loading customers…</td></tr>`;

  // Helper: merge and display from an array of customers
  const _buildAndRender = (supabaseCustomers) => {
    const globalFormatted = supabaseCustomers.map(c => ({
      id:          c.id,
      name:        c.name,
      email:       c.email || '',
      joined:      c.joined || '—',
      lastLogin:   c.lastLogin || '—',
      totalOrders: c.totalOrders || 0,
      source:      'registered'
    }));

    // Also include localStorage legacy customers, de-duplicated by email
    const legacyCustomers = (Store.get('customers') || []).map(c => ({
      id: c.id, name: c.name, email: c.email || '',
      joined: c.joined || '—', lastLogin: '—',
      totalOrders: c.totalOrders || 0, source: 'legacy'
    }));

    const seen = new Set();
    _devCustData = [...globalFormatted, ...legacyCustomers].filter(c => {
      if (!c.email || seen.has(c.email)) return false;
      seen.add(c.email); return true;
    });

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
  };

  // Pull from Supabase; fall back to localStorage on error
  if (typeof DB !== 'undefined') {
    DB.getCustomers().then(customers => {
      _buildAndRender(customers || []);
    }).catch(() => {
      const localCustomers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
      _buildAndRender(localCustomers);
    });
  } else {
    const localCustomers = JSON.parse(localStorage.getItem('sc_global_customers') || '[]');
    _buildAndRender(localCustomers);
  }
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
    ['pNameC','pImageC','pBarcodeC','pCategoryC','pTypeC','pUnitC','pPriceC','pStockC','pExpiryC','pWeightC'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('pLowAtC').value = '10';
    openModal('modal-product-cashier');
  } else {
    document.getElementById('prodEditId').value = '';
    ['pName','pImage','pBarcode','pCategory','pType','pUnit','pPrice','pStock','pExpiry','pWeight'].forEach(id => {
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
    document.getElementById('pWeightC').value    = p.weightGrams||'';
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
    document.getElementById('pWeight').value         = p.weightGrams||'';
    document.getElementById('prodModalTitle').textContent = 'Edit Product';
    openModal('modal-product-client');
  }
}

function saveProduct(panel = 'client') {
  const isCashier = panel === 'cashier';
  const suffix    = isCashier ? 'C' : '';
  const editId    = document.getElementById(isCashier ? 'prodEditIdCashier' : 'prodEditId').value;

  const weightRaw = parseFloat(document.getElementById('pWeight' + suffix).value);

  const data = {
    name:        document.getElementById('pName' + suffix).value.trim(),
    image:       document.getElementById('pImage' + suffix).value.trim() || '📦',
    barcode:     document.getElementById('pBarcode' + suffix).value.trim(),
    category:    document.getElementById('pCategory' + suffix).value.trim(),
    type:        document.getElementById('pType' + suffix).value.trim(),
    unit:        document.getElementById('pUnit' + suffix).value.trim() || 'unit',
    price:       parseFloat(document.getElementById('pPrice' + suffix).value) || 0,
    stock:       parseInt(document.getElementById('pStock' + suffix).value) || 0,
    lowStockAt:  parseInt(document.getElementById('pLowAt' + suffix).value) || 10,
    expiry:      document.getElementById('pExpiry' + suffix).value,
    weightGrams: weightRaw,
  };

  if (!data.name) { toast('Product name is required', 'warning'); return; }
  if (!weightRaw || isNaN(weightRaw) || weightRaw <= 0) {
    toast('Weight (grams) is required — enter the real product weight', 'warning');
    document.getElementById('pWeight' + suffix)?.focus();
    return;
  }

  if (editId) {
    Inventory.update(editId, data);
    toast('Product updated ✅', 'success');
  } else {
    try {
      Inventory.add(data);
    } catch (e) {
      toast(e.message || 'Failed to add product', 'error');
      return;
    }
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

/* ── Reports ── */
function renderClientReports() {
  // Read plan from AuthState, or fall back to sessionStorage, then default to 'basic'
  let plan = 'basic';
  try {
    plan = (AuthState.currentUser?.plan ||
            JSON.parse(sessionStorage.getItem('sc_auth') || '{}')?.user?.plan ||
            'basic').toLowerCase();
  } catch(e) { plan = 'basic'; }
  const isAdvanced = (plan === 'pro' || plan === 'premium');
  const isPremium  = (plan === 'premium');

  // Update badge & subtitle
  const badge = document.getElementById('reportsPlanBadge');
  const subtitle = document.getElementById('reportsSubtitle');
  if (badge) {
    badge.textContent = plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
    badge.style.background = isPremium ? 'var(--yellow-pale)' : isAdvanced ? 'var(--blue-pale)' : 'var(--surface-2)';
    badge.style.color = isPremium ? 'var(--yellow)' : isAdvanced ? 'var(--blue)' : 'var(--text-3)';
    badge.style.border = `1px solid ${isPremium ? 'rgba(234,179,8,0.3)' : isAdvanced ? 'rgba(26,95,212,0.2)' : 'var(--border)'}`;
  }
  if (subtitle) subtitle.textContent = isAdvanced ? 'Advanced analytics & customer intelligence' : 'Sales summary & stock overview';

  // Show correct section
  const basicEl    = document.getElementById('basicReports');
  const advancedEl = document.getElementById('advancedReports');
  if (isAdvanced) {
    basicEl?.classList.add('hidden');
    advancedEl?.classList.remove('hidden');
    const premiumEl = document.getElementById('premiumOnly');
    if (premiumEl) isPremium ? premiumEl.classList.remove('hidden') : premiumEl.classList.add('hidden');
    try { _renderAdvancedReports(isPremium); } catch(e) { console.error('Reports render error:', e); }
  } else {
    basicEl?.classList.remove('hidden');
    advancedEl?.classList.add('hidden');
    try { _renderBasicReports(); } catch(e) { console.error('Reports render error:', e); }
  }
}

function _renderBasicReports() {
  const orders    = Orders.getAll();
  const inv       = Inventory.getAll();
  const totalRev  = Orders.totalRevenue();
  const todayRev  = Orders.todayRevenue();
  const avgOrder  = orders.length ? (totalRev / orders.length) : 0;

  // KPI stats
  const statsEl = document.getElementById('basicReportStats');
  if (statsEl) statsEl.innerHTML = `
    ${devStatCard('💰', 'Total Revenue',     formatPHP(totalRev),  'green')}
    ${devStatCard('📅', "Today's Sales",     formatPHP(todayRev),  'blue')}
    ${devStatCard('📋', 'Total Orders',       orders.length,        'blue')}
    ${devStatCard('🧾', 'Avg. Order Value',  formatPHP(avgOrder),  'green')}
  `;

  // ── SALES: Daily sales summary (last 7 days) ──
  const dailyEl = document.getElementById('basicDailySales');
  if (dailyEl) {
    const days = _getLast7Days();
    if (!days.some(d => d.revenue > 0)) {
      dailyEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>No sales data yet</p></div>`;
    } else {
      dailyEl.innerHTML = days.map(d => `
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">${d.label}</span>
          <span style="font-family:var(--font-mono);color:var(--text-3)">${d.count} orders</span>
          <span style="font-family:var(--font-mono);color:var(--green);font-weight:700">${formatPHP(d.revenue)}</span>
        </div>`).join('');
    }
  }

  // ── SALES: Top products ──
  const topEl = document.getElementById('basicTopProducts');
  if (topEl) {
    const top = _getTopProducts(orders, 6);
    if (!top.length) {
      topEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🏷️</div><p>No sales yet</p></div>`;
    } else {
      topEl.innerHTML = top.map((p, i) => `
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">${['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][i] || (i+1)+'.'} ${p.name}</span>
          <span style="font-family:var(--font-mono);color:var(--text-3)">${p.qty} sold</span>
          <span style="font-family:var(--font-mono);color:var(--green);font-weight:700">${formatPHP(p.revenue)}</span>
        </div>`).join('');
    }
  }

  // ── SALES: Cashier Performance ──
  const cashierEl = document.getElementById('basicCashierPerformance');
  if (cashierEl) {
    const cashierMap = {};
    orders.forEach(o => {
      const k = o.cashier || o.processedBy || 'POS System';
      if (!cashierMap[k]) cashierMap[k] = { name: k, orders: 0, total: 0 };
      cashierMap[k].orders++;
      cashierMap[k].total += (o.total || 0);
    });
    const cashiers = Object.values(cashierMap).sort((a, b) => b.total - a.total);
    if (!cashiers.length) {
      cashierEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🧑‍💼</div><p>No cashier data yet</p></div>`;
    } else {
      cashierEl.innerHTML = `
        <table style="width:100%;font-size:13px">
          <thead><tr style="color:var(--text-3);font-family:var(--font-body)">
            <th style="text-align:left;padding:6px 0">Cashier</th>
            <th style="text-align:center">Orders</th>
            <th style="text-align:right">Total Sales</th>
          </tr></thead>
          <tbody>${cashiers.map((c, i) => `<tr style="border-top:1px solid var(--border)">
            <td style="padding:7px 0;font-family:var(--font-body)">${['🥇','🥈','🥉'][i] || ''} ${c.name}</td>
            <td style="text-align:center;font-family:var(--font-mono);color:var(--text-3)">${c.orders}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--green);font-weight:700">${formatPHP(c.total)}</td>
          </tr>`).join('')}</tbody>
        </table>`;
    }
  }

  // ── INVENTORY: Low Stock Alerts ──
  const lowAlertEl = document.getElementById('basicLowStockAlert');
  if (lowAlertEl) {
    const lowItems = inv.filter(p => Inventory.isLowStock(p) || p.stock === 0).sort((a,b) => a.stock - b.stock);
    if (!lowItems.length) {
      lowAlertEl.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>All items are well-stocked</p></div>`;
    } else {
      lowAlertEl.innerHTML = lowItems.slice(0, 8).map(p => `
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">${p.image || '📦'} ${p.name}</span>
          <span class="badge ${p.stock === 0 ? 'stock-badge-out' : 'stock-badge-low'}">${p.stock === 0 ? 'Out' : p.stock + ' left'}</span>
        </div>`).join('');
    }
  }

  // ── INVENTORY: Expiry Monitoring ──
  const expiryEl = document.getElementById('basicExpiryMonitor');
  if (expiryEl) {
    const today = new Date();
    const in30  = new Date(); in30.setDate(in30.getDate() + 30);
    const expiring = inv.filter(p => p.expiry && new Date(p.expiry) <= in30).sort((a,b) => new Date(a.expiry) - new Date(b.expiry));
    if (!expiring.length) {
      expiryEl.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>No items expiring soon</p></div>`;
    } else {
      expiryEl.innerHTML = expiring.slice(0, 8).map(p => {
        const d = new Date(p.expiry);
        const daysLeft = Math.ceil((d - today) / 86400000);
        const cls = daysLeft < 0 ? 'expiry-critical' : daysLeft <= 7 ? 'expiry-critical' : daysLeft <= 14 ? 'expiry-warn' : 'expiry-ok';
        return `
          <div class="revenue-row">
            <span style="font-family:var(--font-body)">${p.image || '📦'} ${p.name}</span>
            <span class="${cls}" style="font-family:var(--font-mono);font-size:12px">${daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Today' : daysLeft + 'd left'}</span>
          </div>`;
      }).join('');
    }
  }

  // ── INVENTORY: Stock Level Overview & Movement Log ──
  const stockEl = document.getElementById('basicStockReport');
  if (stockEl) {
    const inStock  = inv.filter(p => !Inventory.isLowStock(p) && p.stock > 0).length;
    const lowStock = inv.filter(p => Inventory.isLowStock(p) && p.stock > 0).length;
    const outStock = inv.filter(p => p.stock === 0).length;
    stockEl.innerHTML = `
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">✅ In Stock</span>
        <span style="font-family:var(--font-mono);color:var(--green);font-weight:700">${inStock} products</span>
      </div>
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">⚠️ Low Stock</span>
        <span style="font-family:var(--font-mono);color:var(--yellow);font-weight:700">${lowStock} products</span>
      </div>
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">❌ Out of Stock</span>
        <span style="font-family:var(--font-mono);color:var(--red);font-weight:700">${outStock} products</span>
      </div>
      <div class="revenue-row" style="border-top:2px solid var(--border);margin-top:4px;padding-top:10px">
        <span style="font-family:var(--font-body);font-weight:600">Total Products</span>
        <span style="font-family:var(--font-mono);font-weight:700">${inv.length}</span>
      </div>`;
  }

  // ── CHECKOUT: Peak Hours ──
  const peakEl = document.getElementById('basicPeakHours');
  if (peakEl) {
    const hourMap = {};
    orders.forEach(o => {
      const hr = o.date ? new Date(o.date).getHours() : null;
      if (hr !== null) hourMap[hr] = (hourMap[hr] || 0) + 1;
    });
    const hourEntries = Object.entries(hourMap).sort((a,b) => b[1]-a[1]).slice(0,5);
    const maxH = Math.max(...hourEntries.map(h=>h[1]), 1);
    if (!hourEntries.length) {
      peakEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⏰</div><p>No order time data yet</p></div>`;
    } else {
      peakEl.innerHTML = hourEntries.map(([hr, cnt]) => {
        const label = `${(+hr % 12 || 12)}:00 ${+hr < 12 ? 'AM' : 'PM'}`;
        return `
          <div class="revenue-row" style="align-items:center;gap:12px">
            <span style="font-family:var(--font-mono);min-width:60px">${label}</span>
            <div style="flex:1;height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden">
              <div style="height:100%;width:${Math.max(4,Math.round((cnt/maxH)*100))}%;background:var(--yellow);border-radius:5px"></div>
            </div>
            <span style="font-family:var(--font-mono);color:var(--text-3);min-width:60px;text-align:right">${cnt} orders</span>
          </div>`;
      }).join('');
    }
  }

  // ── CHECKOUT: Recent Orders ──
  const recentEl = document.getElementById('basicRecentOrders');
  if (recentEl) {
    const recent = [...orders].sort((a,b) => new Date(b.date||0) - new Date(a.date||0)).slice(0, 6);
    if (!recent.length) {
      recentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No orders yet</p></div>`;
    } else {
      recentEl.innerHTML = recent.map(o => `
        <div class="revenue-row">
          <span class="recent-order-id">#${o.id || '—'}</span>
          <span style="font-family:var(--font-body);font-size:12px;color:var(--text-3)">${o.customerName || 'Walk-in'}</span>
          <span class="recent-order-amount">${formatPHP(o.total || 0)}</span>
        </div>`).join('');
    }
  }
}

function _renderAdvancedReports(isPremium) {
  const orders    = Orders.getAll();
  const inv       = Inventory.getAll();
  const customers = Customers.getAll();
  const totalRev  = Orders.totalRevenue();
  const todayRev  = Orders.todayRevenue();
  const avgOrder  = orders.length ? (totalRev / orders.length) : 0;
  const totalCust = customers.length;

  // KPI stats row
  const statsEl = document.getElementById('advReportStats');
  if (statsEl) statsEl.innerHTML = `
    ${devStatCard('💰', 'Total Revenue',     formatPHP(totalRev),  'green')}
    ${devStatCard('📅', "Today's Sales",     formatPHP(todayRev),  'blue')}
    ${devStatCard('📋', 'Total Orders',       orders.length,        'blue')}
    ${devStatCard('🧾', 'Avg. Order Value',  formatPHP(avgOrder),  'green')}
    ${devStatCard('👥', 'Total Customers',   totalCust,             'blue')}
    ${devStatCard('⭐', 'Loyalty Points Out', customers.reduce((s,c)=>s+(c.points||0),0), 'yellow')}
  `;

  // Daily sales trend
  const dailyEl = document.getElementById('advDailySales');
  if (dailyEl) {
    const days = _getLast7Days();
    const max  = Math.max(...days.map(d => d.revenue), 1);
    dailyEl.innerHTML = days.map(d => {
      const pct = Math.max(4, Math.round((d.revenue / max) * 100));
      return `
        <div class="revenue-row" style="align-items:center;gap:12px">
          <span style="font-family:var(--font-body);min-width:70px">${d.label}</span>
          <div style="flex:1;height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--blue);border-radius:5px;transition:width 0.5s"></div>
          </div>
          <span style="font-family:var(--font-mono);color:var(--green);min-width:80px;text-align:right">${formatPHP(d.revenue)}</span>
        </div>`;
    }).join('');
  }

  // Revenue by category
  const catEl = document.getElementById('advCategoryRevenue');
  if (catEl) {
    const catMap = {};
    orders.forEach(o => (o.items||[]).forEach(i => {
      const prod = inv.find(p => p.id === i.id);
      const cat  = prod?.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + (i.price * i.qty);
    }));
    const cats   = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
    const maxCat = Math.max(...cats.map(c=>c[1]), 1);
    catEl.innerHTML = cats.length ? cats.map(([cat, rev]) => `
      <div class="revenue-row" style="align-items:center;gap:12px">
        <span style="font-family:var(--font-body);min-width:100px;font-size:13px">${cat}</span>
        <div style="flex:1;height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${Math.max(4,Math.round((rev/maxCat)*100))}%;background:var(--green);border-radius:5px;transition:width 0.5s"></div>
        </div>
        <span style="font-family:var(--font-mono);color:var(--green);min-width:80px;text-align:right">${formatPHP(rev)}</span>
      </div>`).join('') : `<div class="empty-state"><div class="empty-icon">🗂️</div><p>No sales data yet</p></div>`;
  }

  // Customer Lifetime Value
  const clvEl = document.getElementById('advClvTable');
  if (clvEl) {
    const clvMap = {};
    orders.forEach(o => {
      const key = o.customerName || 'Walk-in';
      if (!clvMap[key]) clvMap[key] = { name: key, orders: 0, total: 0, lastOrder: o.date || '—' };
      clvMap[key].orders++;
      clvMap[key].total += (o.total || 0);
      if (o.date > clvMap[key].lastOrder) clvMap[key].lastOrder = o.date;
    });
    const clvList = Object.values(clvMap).sort((a,b) => b.total - a.total).slice(0, 8);
    clvEl.innerHTML = clvList.length ? `
      <table style="width:100%;font-size:13px">
        <thead><tr style="color:var(--text-3);font-family:var(--font-body)">
          <th style="text-align:left;padding:6px 0">Customer</th>
          <th style="text-align:center">Orders</th>
          <th style="text-align:right">Total Spend</th>
          <th style="text-align:right">Avg/Order</th>
        </tr></thead>
        <tbody>${clvList.map((c, i) => `<tr style="border-top:1px solid var(--border)">
          <td style="padding:7px 0;font-family:var(--font-body)">${['🥇','🥈','🥉'][i] || ''} ${c.name}</td>
          <td style="text-align:center;font-family:var(--font-mono);color:var(--text-3)">${c.orders}</td>
          <td style="text-align:right;font-family:var(--font-mono);color:var(--green);font-weight:700">${formatPHP(c.total)}</td>
          <td style="text-align:right;font-family:var(--font-mono);color:var(--blue)">${formatPHP(c.orders ? c.total/c.orders : 0)}</td>
        </tr>`).join('')}</tbody>
      </table>` : `<div class="empty-state"><div class="empty-icon">💎</div><p>No customer data yet</p></div>`;
  }

  // Top products
  const topEl = document.getElementById('advTopProducts');
  if (topEl) {
    const top = _getTopProducts(orders, 8);
    topEl.innerHTML = top.length ? top.map((p, i) => `
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">${['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'][i] || (i+1)+'.'} ${p.name}</span>
        <span style="font-family:var(--font-mono);color:var(--text-3)">${p.qty} sold</span>
        <span style="font-family:var(--font-mono);color:var(--green);font-weight:700">${formatPHP(p.revenue)}</span>
      </div>`).join('') : `<div class="empty-state"><div class="empty-icon">🏷️</div><p>No sales yet</p></div>`;
  }

  // Peak hours
  const hoursEl = document.getElementById('advPeakHours');
  if (hoursEl) {
    const hourMap = {};
    orders.forEach(o => {
      const hr = o.date ? new Date(o.date).getHours() : null;
      if (hr !== null) hourMap[hr] = (hourMap[hr] || 0) + 1;
    });
    const hourEntries = Object.entries(hourMap).sort((a,b) => b[1]-a[1]).slice(0,6);
    const maxH = Math.max(...hourEntries.map(h=>h[1]), 1);
    hoursEl.innerHTML = hourEntries.length ? hourEntries.map(([hr, cnt]) => {
      const label = `${(+hr % 12 || 12)}:00 ${+hr < 12 ? 'AM' : 'PM'}`;
      return `
        <div class="revenue-row" style="align-items:center;gap:12px">
          <span style="font-family:var(--font-mono);min-width:60px">${label}</span>
          <div style="flex:1;height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${Math.max(4,Math.round((cnt/maxH)*100))}%;background:var(--yellow);border-radius:5px"></div>
          </div>
          <span style="font-family:var(--font-mono);color:var(--text-3);min-width:60px;text-align:right">${cnt} orders</span>
        </div>`;
    }).join('') : `<div class="empty-state"><div class="empty-icon">⏰</div><p>No order time data yet</p></div>`;
  }

  // Repeat vs new customers
  const repeatEl = document.getElementById('advRepeatCustomers');
  if (repeatEl) {
    const custOrderCounts = {};
    orders.forEach(o => {
      const k = o.customerName || 'Walk-in';
      custOrderCounts[k] = (custOrderCounts[k] || 0) + 1;
    });
    const repeat = Object.values(custOrderCounts).filter(c => c > 1).length;
    const newC   = Object.values(custOrderCounts).filter(c => c === 1).length;
    const total  = repeat + newC;
    const repeatPct = total ? Math.round((repeat/total)*100) : 0;
    repeatEl.innerHTML = `
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">🔁 Repeat Customers</span>
        <span style="font-family:var(--font-mono);color:var(--green);font-weight:700">${repeat} (${repeatPct}%)</span>
      </div>
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">🆕 New Customers</span>
        <span style="font-family:var(--font-mono);color:var(--blue);font-weight:700">${newC} (${100-repeatPct}%)</span>
      </div>
      <div style="margin-top:14px">
        <div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden;display:flex">
          <div style="width:${repeatPct}%;background:var(--green);border-radius:6px 0 0 6px;transition:width 0.5s"></div>
          <div style="flex:1;background:var(--blue-pale)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--font-body);color:var(--text-3);margin-top:5px">
          <span style="color:var(--green)">■ Repeat ${repeatPct}%</span>
          <span style="color:var(--blue)">■ New ${100-repeatPct}%</span>
        </div>
      </div>`;
  }

  // ── Premium-only ──
  if (isPremium) {
    // Inventory Turnover Rate
    const turnEl = document.getElementById('advInventoryTurnover');
    if (turnEl) {
      const soldMap = {};
      orders.forEach(o => (o.items||[]).forEach(i => {
        soldMap[i.id] = (soldMap[i.id] || 0) + (i.qty || 1);
      }));
      const turnoverItems = inv.map(p => ({
        name: p.name, icon: p.image || '📦',
        sold: soldMap[p.id] || 0,
        stock: p.stock,
        rate: p.stock > 0 ? ((soldMap[p.id] || 0) / p.stock).toFixed(2) : 'N/A'
      })).sort((a,b) => (parseFloat(b.rate)||0) - (parseFloat(a.rate)||0)).slice(0,6);
      turnEl.innerHTML = `
        <table style="width:100%;font-size:13px">
          <thead><tr style="color:var(--text-3);font-family:var(--font-body)">
            <th style="text-align:left;padding:6px 0">Product</th>
            <th style="text-align:center">Sold</th>
            <th style="text-align:center">Stock</th>
            <th style="text-align:right">Turnover</th>
          </tr></thead>
          <tbody>${turnoverItems.map(p => `<tr style="border-top:1px solid var(--border)">
            <td style="padding:7px 0">${p.icon} ${p.name}</td>
            <td style="text-align:center;font-family:var(--font-mono);color:var(--text-3)">${p.sold}</td>
            <td style="text-align:center;font-family:var(--font-mono);color:var(--text-3)">${p.stock}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:${parseFloat(p.rate)>1?'var(--green)':parseFloat(p.rate)>0?'var(--yellow)':'var(--text-3)'};font-weight:700">${p.rate}×</td>
          </tr>`).join('')}</tbody>
        </table>`;
    }

    // Profit Margin per Product (simulated: margin = price × 0.35)
    const profitEl = document.getElementById('advProfitMargin');
    if (profitEl) {
      const profitItems = [...inv].sort((a,b) => b.price - a.price).slice(0,6).map(p => ({
        name: p.name, icon: p.image||'📦',
        price: p.price,
        estimatedCost: p.price * 0.65,
        margin: p.price * 0.35,
        marginPct: 35
      }));
      profitEl.innerHTML = `
        <div style="font-size:11px;color:var(--text-3);font-family:var(--font-body);margin-bottom:10px">Based on estimated 35% gross margin</div>
        <table style="width:100%;font-size:13px">
          <thead><tr style="color:var(--text-3);font-family:var(--font-body)">
            <th style="text-align:left;padding:6px 0">Product</th>
            <th style="text-align:right">Price</th>
            <th style="text-align:right">Margin</th>
          </tr></thead>
          <tbody>${profitItems.map(p => `<tr style="border-top:1px solid var(--border)">
            <td style="padding:7px 0">${p.icon} ${p.name}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--text-3)">${formatPHP(p.price)}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--yellow);font-weight:700">${formatPHP(p.margin)} (${p.marginPct}%)</td>
          </tr>`).join('')}</tbody>
        </table>`;
    }

    // Multi-Store Comparison
    const multiEl = document.getElementById('advMultiStore');
    if (multiEl) {
      const storeIds = ['grocery', 'toy', 'school'];
      const storeNames = { grocery: 'JDC Grocery', toy: 'Toylandia', school: 'Hiraya Likhain' };
      const storeStats = storeIds.map(sid => {
        const sOrders = JSON.parse(localStorage.getItem(`sc_orders_${sid}`) || '[]');
        return {
          name: storeNames[sid] || sid,
          orders: sOrders.length,
          revenue: sOrders.reduce((s, o) => s + (o.total || 0), 0)
        };
      }).sort((a,b) => b.revenue - a.revenue);
      const maxRev = Math.max(...storeStats.map(s => s.revenue), 1);
      multiEl.innerHTML = storeStats.map((s, i) => `
        <div class="revenue-row" style="align-items:center;gap:12px">
          <span style="font-family:var(--font-body);min-width:90px;font-size:13px">${['🥇','🥈','🥉'][i] || ''} ${s.name}</span>
          <div style="flex:1;height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${Math.max(4,Math.round((s.revenue/maxRev)*100))}%;background:var(--blue);border-radius:5px;transition:width 0.5s"></div>
          </div>
          <span style="font-family:var(--font-mono);color:var(--green);min-width:80px;text-align:right">${formatPHP(s.revenue)}</span>
        </div>`).join('');
    }

    // Customer Engagement
    const engEl = document.getElementById('advCustomerEngagement');
    if (engEl) {
      const totalCustOrders = Object.keys((() => { const m = {}; orders.forEach(o => { m[o.customerName || 'Walk-in'] = 1; }); return m; })()).length;
      const loyaltyPoints   = customers.reduce((s,c) => s + (c.points||0), 0);
      const avgPointsPerCust = customers.length ? Math.round(loyaltyPoints / customers.length) : 0;
      engEl.innerHTML = `
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">👥 Unique Customers Served</span>
          <span style="font-family:var(--font-mono);color:var(--blue);font-weight:700">${totalCustOrders}</span>
        </div>
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">⭐ Total Loyalty Points Issued</span>
          <span style="font-family:var(--font-mono);color:var(--yellow);font-weight:700">${loyaltyPoints.toLocaleString()}</span>
        </div>
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">📊 Avg Points per Customer</span>
          <span style="font-family:var(--font-mono);color:var(--green);font-weight:700">${avgPointsPerCust}</span>
        </div>
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">🛒 Avg Orders per Customer</span>
          <span style="font-family:var(--font-mono);color:var(--blue);font-weight:700">${customers.length ? (orders.length / customers.length).toFixed(1) : '—'}</span>
        </div>`;
    }
  }

  // ── Loyalty & Rewards Engagement (Pro + Premium) ──
  const loyaltyEl = document.getElementById('advLoyaltyEngagement');
  if (loyaltyEl) {
    const top = [...customers].sort((a,b) => (b.points||0) - (a.points||0)).slice(0, 6);
    const totalPoints = customers.reduce((s,c) => s + (c.points||0), 0);
    if (!top.length) {
      loyaltyEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⭐</div><p>No loyalty data yet</p></div>`;
    } else {
      loyaltyEl.innerHTML = `
        <div style="font-size:12px;color:var(--text-3);font-family:var(--font-body);margin-bottom:10px">Total points issued: <strong style="color:var(--yellow)">${totalPoints.toLocaleString()} pts</strong></div>
        ${top.map((c, i) => `
          <div class="revenue-row">
            <span style="font-family:var(--font-body)">${['🥇','🥈','🥉'][i] || ''} ${c.name}</span>
            <span style="font-family:var(--font-mono);color:var(--yellow);font-weight:700">${(c.points||0).toLocaleString()} pts</span>
          </div>`).join('')}`;
    }
  }

  // ── New vs Returning Customers (Pro + Premium) ──
  const newReturnEl = document.getElementById('advNewVsReturn');
  if (newReturnEl) {
    const custOrderCounts = {};
    orders.forEach(o => {
      const k = o.customerName || 'Walk-in';
      custOrderCounts[k] = (custOrderCounts[k] || 0) + 1;
    });
    const repeat = Object.values(custOrderCounts).filter(c => c > 1).length;
    const newC   = Object.values(custOrderCounts).filter(c => c === 1).length;
    const total  = repeat + newC;
    const repeatPct = total ? Math.round((repeat/total)*100) : 0;
    newReturnEl.innerHTML = `
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">🔁 Returning Customers</span>
        <span style="font-family:var(--font-mono);color:var(--green);font-weight:700">${repeat} (${repeatPct}%)</span>
      </div>
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">🆕 New Customers</span>
        <span style="font-family:var(--font-mono);color:var(--blue);font-weight:700">${newC} (${100-repeatPct}%)</span>
      </div>
      <div style="margin-top:14px">
        <div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden;display:flex">
          <div style="width:${repeatPct}%;background:var(--green);border-radius:6px 0 0 6px;transition:width 0.5s"></div>
          <div style="flex:1;background:var(--blue-pale)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--font-body);color:var(--text-3);margin-top:5px">
          <span style="color:var(--green)">■ Returning ${repeatPct}%</span>
          <span style="color:var(--blue)">■ New ${100-repeatPct}%</span>
        </div>
      </div>`;
  }

  // ── Basket Analysis (Pro + Premium) ──
  const basketEl = document.getElementById('advBasketAnalysis');
  if (basketEl) {
    const avgItems = orders.length ? (orders.reduce((s,o) => s + ((o.items||[]).reduce((ss,i)=>ss+(i.qty||1),0)), 0) / orders.length).toFixed(1) : 0;
    const avgVal   = orders.length ? (Orders.totalRevenue() / orders.length).toFixed(2) : 0;
    // Find most common item pair
    const pairMap  = {};
    orders.forEach(o => {
      const items = (o.items||[]).map(i => i.name || i.id);
      for (let a = 0; a < items.length; a++) {
        for (let b = a+1; b < items.length; b++) {
          const key = [items[a], items[b]].sort().join(' + ');
          pairMap[key] = (pairMap[key] || 0) + 1;
        }
      }
    });
    const topPair = Object.entries(pairMap).sort((a,b) => b[1]-a[1]).slice(0,3);
    basketEl.innerHTML = `
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">🛒 Avg Items per Basket</span>
        <span style="font-family:var(--font-mono);color:var(--blue);font-weight:700">${avgItems} items</span>
      </div>
      <div class="revenue-row">
        <span style="font-family:var(--font-body)">💰 Avg Basket Value</span>
        <span style="font-family:var(--font-mono);color:var(--green);font-weight:700">${formatPHP(parseFloat(avgVal))}</span>
      </div>
      ${topPair.length ? `<div style="margin-top:12px;font-size:12px;font-family:var(--font-body);color:var(--text-3);margin-bottom:6px">🔗 Frequently Bought Together</div>
        ${topPair.map(([pair, cnt]) => `
          <div class="revenue-row">
            <span style="font-family:var(--font-body);font-size:12px">${pair}</span>
            <span style="font-family:var(--font-mono);color:var(--text-3);font-size:12px">${cnt}×</span>
          </div>`).join('')}` : '<div style="font-size:12px;color:var(--text-3);font-family:var(--font-body);margin-top:10px">Not enough order data for pair analysis</div>'}`;
  }

  // ── Waste & Loss Report (Pro + Premium) ──
  const wasteEl = document.getElementById('advWasteLoss');
  if (wasteEl) {
    const today = new Date();
    const expired = inv.filter(p => p.expiry && new Date(p.expiry) < today);
    const outOfStock = inv.filter(p => p.stock === 0);
    const estimatedLoss = expired.reduce((s,p) => s + (p.price * Math.max(p.lowStockAt || 5, 1)), 0);
    if (!expired.length && !outOfStock.length) {
      wasteEl.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>No waste or loss recorded</p></div>`;
    } else {
      wasteEl.innerHTML = `
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">🗑️ Expired Products</span>
          <span style="font-family:var(--font-mono);color:var(--red);font-weight:700">${expired.length} items</span>
        </div>
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">📭 Stockout Events</span>
          <span style="font-family:var(--font-mono);color:var(--yellow);font-weight:700">${outOfStock.length} SKUs</span>
        </div>
        <div class="revenue-row">
          <span style="font-family:var(--font-body)">💸 Est. Loss from Expiry</span>
          <span style="font-family:var(--font-mono);color:var(--red);font-weight:700">${formatPHP(estimatedLoss)}</span>
        </div>
        ${expired.slice(0,4).map(p => `
          <div class="revenue-row" style="padding:4px 0">
            <span style="font-family:var(--font-body);font-size:12px">${p.image||'📦'} ${p.name}</span>
            <span class="expiry-critical" style="font-family:var(--font-mono);font-size:11px">Expired ${p.expiry}</span>
          </div>`).join('')}`;
    }
  }
}

function _getLast7Days() {
  const orders = Orders.getAll();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter(o => o.date && o.date.slice(0,10) === key);
    days.push({
      label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric'}),
      count: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0)
    });
  }
  return days;
}

function _getTopProducts(orders, limit = 6) {
  const map = {};
  orders.forEach(o => (o.items || []).forEach(i => {
    if (!map[i.name]) map[i.name] = { name: i.name, qty: 0, revenue: 0 };
    map[i.name].qty     += (i.qty || 1);
    map[i.name].revenue += (i.price * i.qty);
  }));
  return Object.values(map).sort((a,b) => b.revenue - a.revenue).slice(0, limit);
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
  // If a weight-blocked transaction is pending, log it as abandoned
  if (window._pendingCheckoutData && window._pendingCheckoutData._weightBlocked) {
    const abandoned = window._pendingCheckoutData;
    Orders.add({
      customerId:   abandoned.customerId,
      customerName: abandoned.customerName || 'Walk-in',
      listName:     abandoned.listName,
      items:        abandoned.items,
      subtotal:     abandoned.subtotal,
      discount:     abandoned.discount || 0,
      tax:          abandoned.tax,
      total:        abandoned.total,
      status:       'abandoned_weight_fail',
      weightCheck: {
        expectedGrams: abandoned.expectedWeight,
        actualGrams:   abandoned.lastWeighedGrams || null,
        result:        'abandoned',
        reweighCount:  abandoned.reweighCount || 0,
        timestamp:     new Date().toISOString(),
        cashier:       AuthState.currentUser?.name || sessionStorage.getItem('sc_cashier_name') || 'Cashier',
      }
    });
    window._pendingCheckoutData = null;
    toast('Abandoned transaction logged ⚠️', 'warning');
  }
  await Scanner.stop();
  const statusEl = document.getElementById('checkoutScanStatus');
  if (statusEl) statusEl.textContent = '📷 Camera inactive';
}

function manualQREntry() {
  // Kept as fallback for raw JSON paste (advanced use)
  const raw = prompt('Paste QR data or JSON order payload:');
  if (raw && raw.trim()) handleCheckoutQR(raw.trim());
}

/* ── Text-code lookup (cashier side) ── */
function loadOrderByTextCode() {
  const input = document.getElementById('checkoutTextCodeInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) { toast('Enter a code first', 'warning'); return; }
  if (!/^[A-Z0-9]{6}$/.test(code)) { toast('Code must be exactly 6 characters', 'warning'); return; }

  const TEXT_CODE_STORE_KEY = 'sc_text_codes';

  // ── Helper: dispatch a found payload ──
  function _dispatch(payloadObj) {
    // Normalise — payload might arrive as a JSON string from Supabase
    let p = payloadObj;
    if (typeof p === 'string') {
      try { p = JSON.parse(p); } catch(e) {
        toast('Corrupt code payload — ask customer to regenerate', 'error');
        return;
      }
    }
    if (!p || !Array.isArray(p.items) || !p.items.length) {
      toast('Code payload has no items — ask customer to regenerate', 'error');
      return;
    }
    if (p.ts && Date.now() - p.ts > 2 * 60 * 60 * 1000) {
      toast(`Code "${code}" has expired (codes last 2 hours)`, 'error');
      return;
    }
    input.value = '';
    toast(`Order loaded via code "${code}" ✅`, 'success');
    renderCheckoutOrder(p);   // call directly — skip handleCheckoutQR to avoid 6-char re-route
  }

  // ── Helper: mark error on input ──
  function _markError(msg) {
    toast(msg, 'error');
    input.classList.add('input-error');
    setTimeout(() => input.classList.remove('input-error'), 1500);
  }

  // ── 1. Check localStorage first (same-device — fastest) ──
  let store = {};
  try { store = JSON.parse(localStorage.getItem(TEXT_CODE_STORE_KEY) || '{}'); } catch(e) { store = {}; }

  if (store[code]) {
    const entry = store[code];
    // Consume (single-use)
    delete store[code];
    try { localStorage.setItem(TEXT_CODE_STORE_KEY, JSON.stringify(store)); } catch(e) {}
    _dispatch(entry);
    return;
  }

  // ── 2. Fallback to Supabase (cross-device: customer on phone, cashier on PC) ──
  const _sbLookup = (typeof DB !== 'undefined' && typeof DB.getCartCode === 'function')
    ? () => DB.getCartCode(code).then(row => {
        if (!row) return _markError(`Code "${code}" not found. Check the code and try again.`);
        DB.deleteCartCode(code).catch(() => {});
        _dispatch(row.payload);
      }).catch(err => _markError(`Lookup failed: ${err.message || 'network error'}`))
    : (typeof window._sc_supabase !== 'undefined')
    ? () => window._sc_supabase
        .from('cart_codes')
        .select('code, payload, created_at')
        .eq('code', code)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
              _markError(`Code "${code}" not found. (Run the cart_codes SQL in Supabase first — see README)`);
            } else {
              _markError(`Code "${code}" not found or expired`);
            }
            return;
          }
          if (!data) { _markError(`Code "${code}" not found. Check the code and try again.`); return; }
          window._sc_supabase.from('cart_codes').delete().eq('code', code).then(() => {});
          _dispatch(data.payload);
        })
        .catch(err => _markError(`Lookup failed: ${err.message || 'network error'}`))
    : null;

  if (_sbLookup) {
    toast('Looking up code…', 'info');
    _sbLookup();
  } else {
    _markError(`Code "${code}" not found — codes only work on the same device when offline`);
  }
}

function handleCheckoutQR(raw) {
  // If a weight-blocked transaction is pending, log it as abandoned first
  if (window._pendingCheckoutData && window._pendingCheckoutData._weightBlocked) {
    const abandoned = window._pendingCheckoutData;
    Orders.add({
      customerId:   abandoned.customerId,
      customerName: abandoned.customerName || 'Walk-in',
      listName:     abandoned.listName,
      items:        abandoned.items,
      subtotal:     abandoned.subtotal,
      discount:     abandoned.discount || 0,
      tax:          abandoned.tax,
      total:        abandoned.total,
      status:       'abandoned_weight_fail',
      weightCheck: {
        expectedGrams: abandoned.expectedWeight,
        actualGrams:   abandoned.lastWeighedGrams || null,
        result:        'abandoned',
        reweighCount:  abandoned.reweighCount || 0,
        timestamp:     new Date().toISOString(),
        cashier:       AuthState.currentUser?.name || sessionStorage.getItem('sc_cashier_name') || 'Cashier',
      }
    });
    window._pendingCheckoutData = null;
    toast('Previous blocked transaction logged as abandoned', 'warning');
  }

  // If the scanned value is a 6-char alphanumeric code (customer QR encodes the text code),
  // route it through the text-code lookup path.
  const trimmed = (typeof raw === 'string' ? raw : '').trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(trimmed)) {
    stopCheckoutScanner();
    // Populate the input field so the cashier can see what was scanned
    const inp = document.getElementById('checkoutTextCodeInput');
    if (inp) inp.value = trimmed;
    // Trigger the lookup directly
    loadOrderByTextCode();
    return;
  }

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

  // ── Compute expected weight from live inventory ──
  let expectedWeight = 0;
  items.forEach(i => {
    const product = Inventory.findById(i.id);
    expectedWeight += (product?.weightGrams || 0) * i.qty;
  });
  data.expectedWeight  = expectedWeight;
  data.tolerancePct    = 0.15;
  data.reweighCount    = data.reweighCount || 0;
  data.lastWeighedGrams = data.lastWeighedGrams || null;
  data._weightBlocked  = true; // mark as pending until weight passes

  // Store reference globally so abandoned-log can access it
  window._pendingCheckoutData = data;

  const lowerBound = Math.round(expectedWeight * (1 - data.tolerancePct));
  const upperBound = Math.round(expectedWeight * (1 + data.tolerancePct));

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

    <div id="weightBannerArea"></div>

    <!-- ══ ARDUINO SERIAL SCALE PANEL ══ -->
    <div class="scale-serial-panel" id="scaleSerialPanel">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:1.1rem">🔌</span>
        <strong style="font-family:var(--font-subhead);font-size:0.95rem">Arduino Scale (HX711)</strong>
        <span id="serialConnBadge" class="scale-serial-badge disconnected">DISCONNECTED</span>
      </div>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-2);margin-bottom:10px">
        Expected: <strong>${expectedWeight.toLocaleString()}g</strong>
        <span style="color:var(--text-3);margin-left:6px">(±15%: ${lowerBound.toLocaleString()}g – ${upperBound.toLocaleString()}g)</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <button class="btn btn-primary btn-sm" id="serialConnectBtn" onclick="serialScaleConnect()">
          🔌 Connect Scale
        </button>
        <button class="btn btn-ghost btn-sm hidden" id="serialDisconnectBtn" onclick="serialScaleDisconnect()">
          ⏹ Disconnect
        </button>
        <button class="btn btn-ghost btn-sm hidden" id="serialTareBtn" onclick="serialScaleTare()">
          ⚖️ Tare
        </button>
      </div>
      <div id="serialLiveReadout" class="scale-serial-readout">
        <span style="color:var(--text-3);font-size:13px">Connect the scale to see live readings.</span>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-success btn-sm hidden" id="serialWeighBtn"
          onclick="serialScaleWeighNow()">
          ✅ Use This Reading
        </button>
      </div>
      <div style="margin-top:8px;font-family:var(--font-body);font-size:11px;color:var(--text-3)">
        Requires Chrome / Edge · Arduino must run <em>DashUp_Scale.ino</em> at 115200 baud ·
        <strong style="color:var(--yellow)">Close Arduino IDE Serial Monitor before connecting</strong>
      </div>
    </div>

    <!-- ══ SIMULATOR PANEL (always available) ══ -->
    <div class="scale-sim-panel" id="scaleSimPanel">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:1.1rem">⚖️</span>
        <strong style="font-family:var(--font-subhead);font-size:0.95rem">Scale Simulator</strong>
        <span class="scale-demo-badge">DEMO MODE</span>
      </div>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-2);margin-bottom:14px">
        Expected: <strong>${expectedWeight.toLocaleString()}g</strong>
        <span style="color:var(--text-3);margin-left:6px">(±15%: ${lowerBound.toLocaleString()}g – ${upperBound.toLocaleString()}g)</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <input
          type="number"
          id="simWeightInput"
          class="form-input"
          value="${expectedWeight}"
          min="0"
          placeholder="grams"
          style="width:130px;font-family:var(--font-mono)"
          onkeydown="if(event.key==='Enter')runWeightCheck(null,+document.getElementById('simWeightInput').value)"
        />
        <span style="font-family:var(--font-mono);font-size:13px;color:var(--text-3)">g</span>
        <button class="btn btn-primary btn-sm" onclick="runWeightCheck(null,+document.getElementById('simWeightInput').value)">
          Weigh ▶
        </button>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-family:var(--font-body);font-size:13px;cursor:pointer;color:var(--text-2)">
        <input type="checkbox" id="simDisconnected"
          onchange="document.getElementById('scaleStatusBadge')&&(document.getElementById('scaleStatusBadge').textContent=this.checked?'⚖️ Scale Offline':'⚖️ Scale Disconnected',document.getElementById('scaleStatusBadge').className='scale-status-badge'+(this.checked?' offline':''))" />
        Simulate scale disconnected
      </label>
    </div>

    <div id="completeCheckoutArea"></div>`;

  // Update scale badge to default state
  const badge = document.getElementById('scaleStatusBadge');
  if (badge) {
    if (window._serialScale && window._serialScale.connected) {
      badge.textContent = '⚖️ Scale Connected'; badge.className = 'scale-status-badge verified';
    } else {
      badge.textContent = '⚖️ Scale Disconnected'; badge.className = 'scale-status-badge offline';
    }
  }

  // If Arduino scale is already connected from a previous order, re-attach the readout
  if (window._serialScale && window._serialScale.connected) {
    setTimeout(_serialScaleAttachReadout, 100);
  }
}

/* ============================================================
   ARDUINO SERIAL SCALE — Web Serial API (HX711 + Nano)
   Calibration factor: -106.0  |  Baud: 115200
   Tolerance: ±15%
   ============================================================ */

window._serialScale = window._serialScale || {
  port:       null,
  reader:     null,
  writer:     null,
  connected:  false,
  lastGrams:  null,
  _readLoop:  null,
  _lineBuffer: '',
};

async function serialScaleConnect() {
  if (!('serial' in navigator)) {
    toast('Web Serial not supported. Use Chrome or Edge on desktop.', 'error');
    return;
  }

  const ss = window._serialScale;

  // ── If a stale port object exists, tear it down cleanly first ──
  if (ss.port) {
    try { if (ss.reader) { await ss.reader.cancel().catch(() => {}); ss.reader = null; } } catch(_) {}
    try { await ss.port.close(); } catch(_) {}
    ss.port      = null;
    ss.connected = false;
    ss.lastGrams = null;
    // Small pause so the OS releases the port
    await new Promise(r => setTimeout(r, 300));
  }

  let port;
  try {
    port = await navigator.serial.requestPort();
  } catch (err) {
    // User cancelled the picker — silent
    if (err.name === 'NotFoundError' || err.name === 'AbortError') return;
    toast('Could not request serial port: ' + err.message, 'error');
    return;
  }

  try {
    // If the port is already open (e.g. left over from a previous session),
    // try to close it before re-opening.
    try { await port.close(); } catch(_) {}
    await new Promise(r => setTimeout(r, 200));

    await port.open({ baudRate: 115200 });
  } catch (err) {
    // "Failed to open serial port" usually means another app (Arduino IDE Serial
    // Monitor, another tab, etc.) has the port locked.
    if (err.message && err.message.toLowerCase().includes('failed to open')) {
      toast(
        'Port is in use by another app. Close Arduino IDE Serial Monitor (or other programs using this port), then try again.',
        'error'
      );
    } else {
      toast('Could not open serial port: ' + err.message, 'error');
    }
    return;
  }

  ss.port         = port;
  ss.connected    = true;
  ss._lineBuffer  = '';

  _serialScaleAttachReadout();
  _serialScaleStartRead();

  toast('Arduino scale connected ✅', 'success');
}

async function serialScaleDisconnect() {
  const ss = window._serialScale;
  ss.connected = false; // mark disconnected immediately so read loop exits
  try {
    if (ss.reader) {
      try { await ss.reader.cancel(); } catch(_) {}
      try { ss.reader.releaseLock(); } catch(_) {}
      ss.reader = null;
    }
  } catch(_) {}
  await new Promise(r => setTimeout(r, 150)); // let read loop unwind
  try {
    if (ss.port) { try { await ss.port.close(); } catch(_) {} ss.port = null; }
  } catch(_) {}
  ss.lastGrams = null;
  _serialScaleUpdateUI(false);
  toast('Scale disconnected', 'warning');
}

async function serialScaleTare() {
  const ss = window._serialScale;
  if (!ss.connected || !ss.port) { toast('Scale not connected', 'error'); return; }
  try {
    const encoder = new TextEncoder();
    const writer  = ss.port.writable.getWriter();
    await writer.write(encoder.encode('T\n'));
    writer.releaseLock();
    toast('Tare sent to scale ⚖️', 'info');
  } catch (err) {
    toast('Tare failed: ' + err.message, 'error');
  }
}

function _serialScaleAttachReadout() {
  const ss   = window._serialScale;
  const wrap  = document.getElementById('scaleSerialPanel');
  const badge = document.getElementById('serialConnBadge');
  const connBtn  = document.getElementById('serialConnectBtn');
  const discBtn  = document.getElementById('serialDisconnectBtn');
  const tareBtn  = document.getElementById('serialTareBtn');
  const weighBtn = document.getElementById('serialWeighBtn');

  if (!wrap) return; // panel not rendered yet

  if (ss.connected) {
    if (badge)   { badge.textContent = 'CONNECTED'; badge.className = 'scale-serial-badge connected'; }
    if (connBtn)  connBtn.classList.add('hidden');
    if (discBtn)  discBtn.classList.remove('hidden');
    if (tareBtn)  tareBtn.classList.remove('hidden');
    if (weighBtn) weighBtn.classList.remove('hidden');

    const globalBadge = document.getElementById('scaleStatusBadge');
    if (globalBadge) { globalBadge.textContent = '⚖️ Scale Connected'; globalBadge.className = 'scale-status-badge verified'; }
  } else {
    _serialScaleUpdateUI(false);
  }
}

function _serialScaleUpdateUI(connected) {
  const badge    = document.getElementById('serialConnBadge');
  const connBtn  = document.getElementById('serialConnectBtn');
  const discBtn  = document.getElementById('serialDisconnectBtn');
  const tareBtn  = document.getElementById('serialTareBtn');
  const weighBtn = document.getElementById('serialWeighBtn');
  const readout  = document.getElementById('serialLiveReadout');
  const globalBadge = document.getElementById('scaleStatusBadge');

  if (connected) {
    if (badge)   { badge.textContent = 'CONNECTED'; badge.className = 'scale-serial-badge connected'; }
    if (connBtn)  connBtn.classList.add('hidden');
    if (discBtn)  discBtn.classList.remove('hidden');
    if (tareBtn)  tareBtn.classList.remove('hidden');
    if (weighBtn) weighBtn.classList.remove('hidden');
    if (globalBadge) { globalBadge.textContent = '⚖️ Scale Connected'; globalBadge.className = 'scale-status-badge verified'; }
  } else {
    if (badge)   { badge.textContent = 'DISCONNECTED'; badge.className = 'scale-serial-badge disconnected'; }
    if (connBtn)  connBtn.classList.remove('hidden');
    if (discBtn)  discBtn.classList.add('hidden');
    if (tareBtn)  tareBtn.classList.add('hidden');
    if (weighBtn) weighBtn.classList.add('hidden');
    if (readout)  readout.innerHTML = '<span style="color:var(--text-3);font-size:13px">Connect the scale to see live readings.</span>';
    if (globalBadge) { globalBadge.textContent = '⚖️ Scale Disconnected'; globalBadge.className = 'scale-status-badge offline'; }
  }
}

async function _serialScaleStartRead() {
  const ss = window._serialScale;
  if (!ss.port || !ss.port.readable) return;

  const decoder = new TextDecoder();
  ss.reader = ss.port.readable.getReader();

  try {
    while (true) {
      // Exit if disconnect() was called
      if (!ss.connected) break;

      const { value, done } = await ss.reader.read();
      if (done) break;

      ss._lineBuffer += decoder.decode(value, { stream: true });

      // Process complete lines
      let nl;
      while ((nl = ss._lineBuffer.indexOf('\n')) !== -1) {
        const line = ss._lineBuffer.slice(0, nl).trim();
        ss._lineBuffer = ss._lineBuffer.slice(nl + 1);
        if (line) _serialScaleParseLine(line);
      }
    }
  } catch (err) {
    // Ignore cancel errors triggered by our own disconnect
    if (ss.connected && err.name !== 'AbortError') {
      toast('Scale disconnected unexpectedly', 'error');
      ss.connected = false;
      _serialScaleUpdateUI(false);
    }
  } finally {
    try { ss.reader.releaseLock(); } catch(_) {}
    ss.reader = null;
  }
}

/**
 * Parse a line from the Arduino sketch.
 * Expected format from DashUp_Scale.ino:
 *   WEIGHT:123.4
 *   TARE_OK
 *   STABLE:456.7
 */
function _serialScaleParseLine(line) {
  const ss = window._serialScale;
  const readout = document.getElementById('serialLiveReadout');

  if (line.startsWith('WEIGHT:') || line.startsWith('STABLE:')) {
    const raw = parseFloat(line.split(':')[1]);
    if (isNaN(raw)) return;

    const grams = Math.round(raw * 10) / 10;
    ss.lastGrams = grams;

    if (readout) {
      const data = window._pendingCheckoutData;
      let colorClass = '';
      let hint = '';
      if (data && data.expectedWeight > 0) {
        const lo = data.expectedWeight * 0.85;
        const hi = data.expectedWeight * 1.15;
        if (grams >= lo && grams <= hi) {
          colorClass = 'style="color:var(--green)"';
          hint = ' ✅';
        } else {
          colorClass = 'style="color:var(--red)"';
          hint = ' ⚠️';
        }
      }
      readout.innerHTML = `
        <div class="scale-serial-live" ${colorClass}>
          <span class="scale-serial-value">${grams.toLocaleString()}</span>
          <span class="scale-serial-unit">g${hint}</span>
        </div>`;
    }

  } else if (line === 'TARE_OK') {
    ss.lastGrams = 0;
    if (readout) readout.innerHTML = '<span style="color:var(--blue);font-size:13px;font-family:var(--font-mono)">Tare OK — 0.0 g</span>';
    toast('Scale tared ✅', 'success');
  }
}

function serialScaleWeighNow() {
  const ss   = window._serialScale;
  const data = window._pendingCheckoutData;

  if (!ss.connected) { toast('Scale not connected', 'error'); return; }
  if (ss.lastGrams === null) { toast('No reading yet — place basket on scale first', 'warning'); return; }
  if (!data) { toast('No pending order', 'error'); return; }

  runWeightCheck(data, ss.lastGrams);
}

/* ============================================================
   END ARDUINO SERIAL SCALE
   ============================================================ */

function runWeightCheck(dataOrNull, simulatedGrams) {
  // Always use the global reference — the onclick passes window._pendingCheckoutData
  // which may have been serialised as null in older HTML strings; fall back to global.
  const data = (dataOrNull && typeof dataOrNull === 'object')
    ? dataOrNull
    : window._pendingCheckoutData;

  const bannerArea  = document.getElementById('weightBannerArea');
  const simPanel    = document.getElementById('scaleSimPanel');
  const completeArea = document.getElementById('completeCheckoutArea');
  const badge       = document.getElementById('scaleStatusBadge');
  if (!bannerArea || !simPanel || !completeArea) return;
  if (!data) { console.error('[runWeightCheck] No pending checkout data'); return; }

  const isDisconnected = document.getElementById('simDisconnected')?.checked;

  data.lastWeighedGrams = isDisconnected ? null : simulatedGrams;

  // Track reweigh count (only increment after first attempt)
  if (data._hasWeighed) data.reweighCount = (data.reweighCount || 0) + 1;
  data._hasWeighed = true;

  const expected   = data.expectedWeight;
  const lowerBound = expected * (1 - data.tolerancePct);
  const upperBound = expected * (1 + data.tolerancePct);

  // Clear previous state
  bannerArea.innerHTML  = '';
  completeArea.innerHTML = '';

  if (isDisconnected) {
    bannerArea.innerHTML = `<div class="weight-banner fail">
      ⚖️ Scale not responding — cannot verify basket weight. Reconnect the scale to proceed.
    </div>`;
    completeArea.innerHTML = reweighBtn(data);
    simPanel.classList.add('hidden');
    if (badge) { badge.textContent = '⚖️ Scale Offline'; badge.className = 'scale-status-badge offline'; }
    data._weightBlocked = true;
    return;
  }

  if (simulatedGrams >= lowerBound && simulatedGrams <= upperBound) {
    // PASS
    const result = data.reweighCount > 0 ? 'passed_after_reweigh' : 'passed';
    data._weightResult  = result;
    data._weightBlocked = false;
    window._pendingCheckoutData = data; // keep reference for completeCheckout

    bannerArea.innerHTML = `<div class="weight-banner pass">
      ✅ Weight verified — basket matches the cart.
    </div>`;
    simPanel.classList.add('hidden');
    completeArea.innerHTML = `<button class="btn btn-success btn-lg w-full" style="margin-top:20px"
      onclick='completeCheckout(window._lastVerifiedData)'>
      ✅ Complete Checkout
    </button>`;
    window._lastVerifiedData = data;
    if (badge) { badge.textContent = '⚖️ Verified'; badge.className = 'scale-status-badge verified'; }
    setTimeout(() => {
      if (badge) {
        const ss = window._serialScale;
        if (ss && ss.connected) {
          badge.textContent = '⚖️ Scale Connected'; badge.className = 'scale-status-badge verified';
        } else {
          badge.textContent = '⚖️ Scale Disconnected'; badge.className = 'scale-status-badge offline';
        }
      }
    }, 4000);
  } else if (simulatedGrams > upperBound) {
    bannerArea.innerHTML = `<div class="weight-banner fail">
      ⚠️ Weight mismatch — basket is heavier than the cart. Transaction cannot proceed. Please resolve before continuing.
    </div>`;
    completeArea.innerHTML = reweighBtn(data);
    simPanel.classList.add('hidden');
    if (badge) { badge.textContent = '⚖️ Weight Mismatch'; badge.className = 'scale-status-badge offline'; }
    data._weightBlocked = true;
  } else {
    bannerArea.innerHTML = `<div class="weight-banner fail">
      ⚠️ Weight mismatch — basket is lighter than the cart. Items may be missing. Transaction cannot proceed.
    </div>`;
    completeArea.innerHTML = reweighBtn(data);
    simPanel.classList.add('hidden');
    if (badge) { badge.textContent = '⚖️ Weight Mismatch'; badge.className = 'scale-status-badge offline'; }
    data._weightBlocked = true;
  }
}

function reweighBtn(data) {
  // Always keep data reference alive so the Weigh button never receives null
  window._pendingCheckoutData = data;
  return `<button class="btn btn-ghost w-full" style="margin-top:12px"
    onclick="
      var sp=document.getElementById('scaleSerialPanel');
      var sim=document.getElementById('scaleSimPanel');
      if(sp)sp.classList.remove('hidden');
      if(sim)sim.classList.remove('hidden');
      document.getElementById('weightBannerArea').innerHTML='';
      document.getElementById('completeCheckoutArea').innerHTML='';
    ">
    🔄 Re-weigh
  </button>`;
}

function completeCheckout(data) {
  // Deduct inventory stock
  Inventory.deductStock(data.items.map(i => ({ id: i.id, qty: i.qty })));

  // Track sold items for Top Sellers (localStorage + Supabase)
  if (typeof window.trackOrderItems === 'function') {
    window.trackOrderItems(data.items);
  } else if (typeof DB !== 'undefined') {
    // Direct DB fallback if customer.js not in scope
    const _sid = sessionStorage.getItem('sc_selected_store') || 'grocery';
    DB.incrementTopSellerBatch(_sid, data.items).catch(() => {});
  }

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
    status:       'completed',
    cashier:      AuthState.currentUser?.name || sessionStorage.getItem('sc_cashier_name') || 'Cashier',
    weightCheck: {
      expectedGrams: data.expectedWeight,
      actualGrams:   data.lastWeighedGrams,
      result:        data._weightResult || 'passed',
      reweighCount:  data.reweighCount || 0,
      timestamp:     new Date().toISOString(),
      cashier:       AuthState.currentUser?.name || sessionStorage.getItem('sc_cashier_name') || 'Cashier',
    }
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
      <div class="receipt-title">🛒 DASH UP</div>
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
