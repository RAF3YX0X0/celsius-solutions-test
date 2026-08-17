/**
 * Customer Portal View Component
 * Provides self-service Customer Order History, Live Cold-Chain Tracker, and Profile Overview
 */

const CustomerPortalView = {
  activeEmail: 'marcus.vance@techcorp.io',
  activeName: 'Marcus Vance',
  orders: [],

  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1 class="view-title">Customer Portal & Live Cold-Chain Tracker</h1>
          <p class="view-subtitle">Self-service dashboard for store customers to review order history, delivery status, and cold-chain temperature logs across Shopify & WooCommerce.</p>
        </div>
        <div class="view-actions">
          <button class="btn btn-outline btn-sm" id="btn-portal-refresh">
            ${Icons.refresh} Refresh Tracker
          </button>
        </div>
      </div>

      <!-- Customer Switcher & Login Box -->
      <div class="card mb-4" style="border: 1px solid var(--border-color); background: var(--bg-card);">
        <div class="card-body" style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: #2d5a27; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;" id="portal-avatar">
              M
            </div>
            <div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);" id="portal-user-name">Marcus Vance</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);" id="portal-user-email">marcus.vance@techcorp.io</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Demo Customers:</span>
            <button class="btn btn-ghost btn-xs demo-cust-btn" data-email="marcus.vance@techcorp.io" data-name="Marcus Vance">Marcus Vance</button>
            <button class="btn btn-ghost btn-xs demo-cust-btn" data-email="elena.rostova@designstudio.com" data-name="Elena Rostova">Elena Rostova</button>
            <button class="btn btn-ghost btn-xs demo-cust-btn" data-email="david.chen@ventures.co" data-name="David Chen">David Chen</button>
            
            <div style="display: flex; gap: 6px; margin-left: 6px;">
              <input type="email" id="portal-custom-email" placeholder="Enter customer email..." style="padding: 5px 10px; font-size: 0.82rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-main); width: 180px;">
              <button class="btn btn-primary btn-xs" id="btn-portal-custom-login">Log In</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Cold Chain Tracker Widget -->
      <div class="card mb-4" id="portal-active-tracker" style="border: 2px solid #2d5a27; background: var(--bg-card); box-shadow: 0 4px 20px rgba(45, 90, 39, 0.1);">
        <div class="card-body" style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
            <div>
              <span class="badge" style="background: #2d5a27; color: #fff; font-weight: 800; text-transform: uppercase; font-size: 0.75rem;">Active Cold-Chain Dispatch</span>
              <h2 style="margin: 8px 0 2px 0; font-size: 1.3rem; font-weight: 800;" id="portal-track-order-id">Loading Order...</h2>
              <div style="font-size: 0.82rem; color: var(--text-muted);" id="portal-track-date">--</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.85rem; font-weight: 700; color: #2d5a27;">
                🌡️ Sensor Temp: <span id="portal-track-temp">36.4°F (Safe & Optimal)</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                Carrier: <strong id="portal-track-carrier">St. Benoit Cold-Chain Express</strong>
              </div>
              <div style="font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); margin-top: 2px;" id="portal-track-code">
                STB-TRACK-889102
              </div>
            </div>
          </div>

          <!-- Stepper Progress UI -->
          <div id="portal-stepper-container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 24px 0; text-align: center;">
            <!-- Injected via JavaScript -->
          </div>
        </div>
      </div>

      <!-- Customer Past Orders Table -->
      <div class="card" style="border: 1px solid var(--border-color); background: var(--bg-card);">
        <div class="card-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; text-transform: uppercase;">Past Orders & Invoices</h3>
          <span class="badge badge-subtle" id="portal-order-count">0 Orders</span>
        </div>
        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); background: var(--bg-alt); text-align: left; font-size: 0.8rem; text-transform: uppercase;">
                <th style="padding: 12px 16px;">Order Ref</th>
                <th style="padding: 12px 16px;">Source</th>
                <th style="padding: 12px 16px;">Date</th>
                <th style="padding: 12px 16px;">Items Summary</th>
                <th style="padding: 12px 16px;">Status</th>
                <th style="padding: 12px 16px;">Total</th>
                <th style="padding: 12px 16px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="portal-orders-tbody">
              <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                  Loading customer orders...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents(container);
    await this.fetchCustomerOrders(this.activeEmail, this.activeName);
  },

  bindEvents(container) {
    // Quick Demo Customer Switch Buttons
    container.querySelectorAll('.demo-cust-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email');
        const name = btn.getAttribute('data-name');
        this.fetchCustomerOrders(email, name);
      });
    });

    // Custom email login
    document.getElementById('btn-portal-custom-login')?.addEventListener('click', () => {
      const emailInput = document.getElementById('portal-custom-email');
      const email = emailInput?.value.trim();
      if (email) {
        this.fetchCustomerOrders(email, email.split('@')[0]);
      }
    });

    // Refresh button
    document.getElementById('btn-portal-refresh')?.addEventListener('click', () => {
      this.fetchCustomerOrders(this.activeEmail, this.activeName);
      Toast.success('Tracking data refreshed live.', 'Tracker Updated');
    });
  },

  async fetchCustomerOrders(email, name) {
    this.activeEmail = email;
    this.activeName = name || email;

    document.getElementById('portal-user-name').textContent = this.activeName;
    document.getElementById('portal-user-email').textContent = this.activeEmail;
    document.getElementById('portal-avatar').textContent = this.activeName[0].toUpperCase();

    const tbody = document.getElementById('portal-orders-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">Fetching live orders for ${email}...</td></tr>`;
    }

    try {
      const res = await fetch(`/api/orders/track/lookup?query=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!data.success || !data.orders || data.orders.length === 0) {
        document.getElementById('portal-order-count').textContent = '0 Orders';
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No orders found for <strong>${email}</strong>. Place an order on the Shopify or WooCommerce storefront to see it here live!</td></tr>`;
        document.getElementById('portal-active-tracker').style.display = 'none';
        return;
      }

      this.orders = data.orders;
      document.getElementById('portal-order-count').textContent = `${data.orders.length} Orders`;
      this.renderOrdersTable(data.orders);
      this.renderActiveTracker(data.orders[0]);
    } catch (err) {
      console.error('[CustomerPortal] Fetch error:', err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--color-danger);">Failed to load orders: ${err.message}</td></tr>`;
      }
    }
  },

  renderActiveTracker(order) {
    const trackerCard = document.getElementById('portal-active-tracker');
    if (!trackerCard || !order) return;
    trackerCard.style.display = 'block';

    document.getElementById('portal-track-order-id').textContent = `${order.order_number || order.external_order_id} (${order.source.toUpperCase()})`;
    document.getElementById('portal-track-date').textContent = `Placed on ${new Date(order.created_at).toLocaleString()}`;
    document.getElementById('portal-track-temp').textContent = order.tracking?.temperature || '36.4°F (Safe & Optimal)';
    document.getElementById('portal-track-carrier').textContent = order.tracking?.carrier || 'St. Benoit Cold-Chain Express';
    document.getElementById('portal-track-code').textContent = order.tracking?.trackingCode || `STB-TRACK-${order.id.slice(0, 8).toUpperCase()}`;

    const stepper = document.getElementById('portal-stepper-container');
    const steps = order.tracking?.steps || [
      { label: 'Order Confirmed', completed: true, note: 'Payment captured' },
      { label: 'Cold-Chain Packed', completed: true, note: 'Packed at 34-38°F' },
      { label: 'Out for Delivery', completed: false, note: 'Dispatched via refrigerated truck' },
      { label: 'Delivered', completed: false, note: 'Doorstep arrival' }
    ];

    stepper.innerHTML = steps.map((s, i) => `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <div style="width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem; background: ${s.completed ? '#2d5a27' : 'var(--bg-alt)'}; color: ${s.completed ? '#fff' : 'var(--text-muted)'}; border: 2px solid ${s.completed ? '#2d5a27' : 'var(--border-color)'};">
          ${s.completed ? '✓' : (i + 1)}
        </div>
        <div style="font-size: 0.85rem; font-weight: 700; color: ${s.completed ? '#2d5a27' : 'var(--text-muted)'};">${s.label}</div>
        ${s.note ? `<div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.3;">${s.note}</div>` : ''}
      </div>
    `).join('');
  },

  renderOrdersTable(orders) {
    const tbody = document.getElementById('portal-orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map((o, idx) => {
      const itemsSummary = (o.items || []).map(i => `${i.quantity}x ${i.title || i.name || 'Milk Bottle'}`).join(', ') || 'Organic Dairy Items';
      const isShopify = o.source === 'shopify';

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 14px 16px; font-weight: 700;">${o.order_number || o.external_order_id}</td>
          <td style="padding: 14px 16px;">
            <span class="badge ${isShopify ? 'badge-shopify' : 'badge-woocommerce'}" style="text-transform: uppercase;">
              ${o.source}
            </span>
          </td>
          <td style="padding: 14px 16px; font-size: 0.85rem; color: var(--text-muted);">
            ${new Date(o.created_at).toLocaleDateString()}
          </td>
          <td style="padding: 14px 16px; font-size: 0.85rem; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemsSummary}">
            ${itemsSummary}
          </td>
          <td style="padding: 14px 16px;">
            <span class="badge badge-status-${o.status}" style="text-transform: capitalize;">
              ${o.status}
            </span>
          </td>
          <td style="padding: 14px 16px; font-weight: 800; color: var(--text-main);">
            $${parseFloat(o.total || 0).toFixed(2)}
          </td>
          <td style="padding: 14px 16px; text-align: right;">
            <button class="btn btn-primary btn-xs select-track-btn" data-idx="${idx}">
              Track 🚚
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.select-track-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (this.orders[idx]) {
          this.renderActiveTracker(this.orders[idx]);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }
};

window.CustomerPortalView = CustomerPortalView;
