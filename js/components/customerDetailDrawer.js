/**
 * Customer Detail Drawer Component
 * Displays unified customer profile, lifetime value stats, and multi-store order history.
 */

const CustomerDetailDrawer = {
  drawerEl: null,
  currentCustomer: null,

  init() {
    if (!this.drawerEl) {
      this.drawerEl = document.createElement('div');
      this.drawerEl.id = 'customer-detail-drawer';
      this.drawerEl.className = 'drawer-overlay';
      document.body.appendChild(this.drawerEl);
    }
  },

  async open(customerId) {
    this.init();
    this.drawerEl.classList.add('drawer-open');
    this.drawerEl.innerHTML = `
      <div class="drawer-content">
        <div class="drawer-header">
          <div class="drawer-title-group">
            <span class="text-muted text-sm">Customer Intelligence</span>
            <h2 class="drawer-title">Loading Customer Profile...</h2>
          </div>
          <button class="drawer-close-btn" id="btn-close-cust-drawer">&times;</button>
        </div>
        <div class="drawer-body view-loading">
          <div class="spinner"></div>
          <p>Fetching unified customer profile...</p>
        </div>
      </div>
    `;

    this.drawerEl.querySelector('#btn-close-cust-drawer')?.addEventListener('click', () => this.close());
    this.drawerEl.addEventListener('click', (e) => {
      if (e.target === this.drawerEl) this.close();
    });

    try {
      const res = await API.getCustomer(customerId);
      this.currentCustomer = res.customer;
      this.renderContent();
    } catch (err) {
      this.drawerEl.querySelector('.drawer-body').innerHTML = `
        <div class="card error-card">
          <p>Failed to load customer: ${err.message}</p>
        </div>
      `;
    }
  },

  renderContent() {
    const c = this.currentCustomer;
    if (!c) return;

    this.drawerEl.innerHTML = `
      <div class="drawer-content">
        <!-- Header -->
        <div class="drawer-header">
          <div class="drawer-title-group">
            <div class="drawer-badges">
              <span class="badge badge-subtle">Unified Profile</span>
              ${c.sources.map(s => `
                <span class="badge badge-${s}">
                  ${s === 'shopify' ? Icons.shopify : Icons.woocommerce} ${s.toUpperCase()}
                </span>
              `).join('')}
            </div>
            <h2 class="drawer-title">${c.first_name || ''} ${c.last_name || 'Customer'}</h2>
            <div class="drawer-submeta">
              <span>${c.email}</span>
              ${c.phone ? `<span>• ${c.phone}</span>` : ''}
              <span>• Customer since: ${new Date(c.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button class="drawer-close-btn" id="btn-close-cust-drawer">&times;</button>
        </div>

        <!-- Body -->
        <div class="drawer-body">
          
          <!-- Lifetime Metrics Grid -->
          <div class="customer-stats-grid">
            <div class="stat-mini-card">
              <span class="stat-mini-label">Lifetime Spend</span>
              <span class="stat-mini-val">$${c.total_spend.toFixed(2)}</span>
            </div>
            <div class="stat-mini-card">
              <span class="stat-mini-label">Total Orders</span>
              <span class="stat-mini-val">${c.total_orders}</span>
            </div>
            <div class="stat-mini-card">
              <span class="stat-mini-label">Average Order</span>
              <span class="stat-mini-val">$${c.average_order_value.toFixed(2)}</span>
            </div>
          </div>

          <!-- Customer Deduplication Notice -->
          <div class="info-alert-box">
            <div class="info-icon">${Icons.shield}</div>
            <div>
              <strong>Multi-Store Deduplication Active</strong>
              <p class="text-sm">Orders placed on both Shopify and WooCommerce using <code>${c.email}</code> are automatically consolidated into this unified customer record.</p>
            </div>
          </div>

          <!-- Multi-Store Unified Order History -->
          <div class="drawer-section">
            <div class="drawer-section-title">
              <span>Order History Across All Stores (${c.orders ? c.orders.length : 0})</span>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${c.orders && c.orders.length > 0 ? c.orders.map(o => `
                    <tr class="clickable-row" data-order-id="${o.id}">
                      <td>
                        <span class="badge badge-${o.source}">
                          ${o.source === 'shopify' ? Icons.shopify : Icons.woocommerce}
                          ${o.source.toUpperCase()}
                        </span>
                      </td>
                      <td><strong>${o.order_number}</strong></td>
                      <td class="text-sm text-muted">${new Date(o.created_at).toLocaleDateString()}</td>
                      <td><span class="badge badge-subtle">${o.items_count} item${o.items_count !== 1 ? 's' : ''}</span></td>
                      <td><strong>$${o.total.toFixed(2)}</strong></td>
                      <td>
                        <span class="badge badge-status-${o.status}">
                          ${o.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-icon btn-xs btn-open-cust-order" data-order-id="${o.id}" title="Inspect Order">
                          ${Icons.externalLink}
                        </button>
                      </td>
                    </tr>
                  `).join('') : `
                    <tr><td colspan="7" class="text-center text-muted">No orders found for this customer.</td></tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="drawer-footer">
          <button class="btn btn-secondary" id="btn-close-cust-drawer-bottom">Close</button>
        </div>
      </div>
    `;

    // Bindings
    this.drawerEl.querySelector('#btn-close-cust-drawer')?.addEventListener('click', () => this.close());
    this.drawerEl.querySelector('#btn-close-cust-drawer-bottom')?.addEventListener('click', () => this.close());

    this.drawerEl.querySelectorAll('.clickable-row, .btn-open-cust-order').forEach(el => {
      el.addEventListener('click', () => {
        const orderId = el.getAttribute('data-order-id');
        if (orderId && typeof OrderDetailDrawer !== 'undefined') {
          this.close();
          OrderDetailDrawer.open(orderId);
        }
      });
    });
  },

  close() {
    if (this.drawerEl) {
      this.drawerEl.classList.remove('drawer-open');
    }
  }
};

window.CustomerDetailDrawer = CustomerDetailDrawer;
