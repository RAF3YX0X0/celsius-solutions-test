/**
 * Order Detail Drawer Component
 * Slides in from the right to show comprehensive order details, financial breakdown,
 * two-way status updating, raw webhook inspector, and audit history.
 */

const OrderDetailDrawer = {
  drawerEl: null,
  currentOrder: null,

  init() {
    if (!this.drawerEl) {
      this.drawerEl = document.createElement('div');
      this.drawerEl.id = 'order-detail-drawer';
      this.drawerEl.className = 'drawer-overlay';
      document.body.appendChild(this.drawerEl);
    }
  },

  async open(orderId) {
    this.init();
    this.drawerEl.classList.add('drawer-open');
    this.drawerEl.innerHTML = `
      <div class="drawer-content">
        <div class="drawer-header">
          <div class="drawer-title-group">
            <span class="text-muted text-sm">Order Inspection</span>
            <h2 class="drawer-title">Loading Order...</h2>
          </div>
          <button class="drawer-close-btn" id="btn-close-drawer">&times;</button>
        </div>
        <div class="drawer-body view-loading">
          <div class="spinner"></div>
          <p>Loading order details #${orderId.slice(0, 8)}...</p>
        </div>
      </div>
    `;

    this.drawerEl.querySelector('#btn-close-drawer')?.addEventListener('click', () => this.close());
    this.drawerEl.addEventListener('click', (e) => {
      if (e.target === this.drawerEl) this.close();
    });

    try {
      const res = await API.getOrder(orderId);
      this.currentOrder = res.order;
      this.renderDrawerContent();
    } catch (err) {
      this.drawerEl.querySelector('.drawer-body').innerHTML = `
        <div class="card error-card">
          <p>Failed to load order: ${err.message}</p>
        </div>
      `;
    }
  },

  renderDrawerContent() {
    const o = this.currentOrder;
    if (!o) return;

    const sourceBadgeClass = o.source === 'shopify' ? 'badge-shopify' : 'badge-woocommerce';
    const sourceIcon = o.source === 'shopify' ? Icons.shopify : Icons.woocommerce;
    const isStaffOrAdmin = State.user && (State.user.role === 'admin' || State.user.role === 'staff');

    this.drawerEl.innerHTML = `
      <div class="drawer-content">
        <!-- Header -->
        <div class="drawer-header">
          <div class="drawer-title-group">
            <div class="drawer-badges">
              <span class="badge ${sourceBadgeClass}">
                ${sourceIcon} ${o.source.toUpperCase()}
              </span>
              <span class="badge badge-status-${o.status}">
                ${o.status.toUpperCase()}
              </span>
              <span class="badge badge-payment-${o.payment_status}">
                ${o.payment_status.toUpperCase()}
              </span>
            </div>
            <h2 class="drawer-title">${o.order_number}</h2>
            <div class="drawer-submeta">
              <span>External ID: <code>${o.external_order_id}</code></span>
              <button class="btn btn-ghost btn-xs" id="btn-copy-ext-id" title="Copy External ID">${Icons.copy}</button>
              <span>• Placed: ${new Date(o.created_at).toLocaleString()}</span>
            </div>
          </div>
          <button class="drawer-close-btn" id="btn-close-drawer">&times;</button>
        </div>

        <!-- Tab Navigation -->
        <div class="drawer-tabs">
          <button class="drawer-tab active" data-tab="overview">Overview & Items</button>
          <button class="drawer-tab" data-tab="payload">Raw Webhook Payload</button>
          <button class="drawer-tab" data-tab="audit">Audit Trail (${o.auditLogs ? o.auditLogs.length : 0})</button>
        </div>

        <!-- Drawer Body -->
        <div class="drawer-body">
          <!-- TAB 1: OVERVIEW -->
          <div class="drawer-tab-content active" id="tab-overview">
            
            <!-- Quick Status Change Bar -->
            <div class="drawer-section status-change-bar">
              <div class="status-bar-header">
                <strong>Order Status Lifecycle</strong>
                ${o.two_way_synced_at ? `<span class="text-xs text-muted">Last 2-Way Synced: ${new Date(o.two_way_synced_at).toLocaleTimeString()}</span>` : ''}
              </div>
              <div class="status-action-pills">
                ${['pending', 'processing', 'completed', 'cancelled', 'refunded'].map(st => `
                  <button class="btn-status-pill ${o.status === st ? 'active status-' + st : ''}" data-target-status="${st}">
                    ${st.toUpperCase()}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Customer & Shipping 2-Col -->
            <div class="drawer-two-col">
              <!-- Customer Box -->
              <div class="drawer-card">
                <div class="drawer-card-title">
                  <span>${Icons.user} Customer Details</span>
                  <button class="btn btn-ghost btn-xs" id="btn-view-customer-profile" data-cust-id="${o.customer.id}">
                    Profile &rarr;
                  </button>
                </div>
                <div class="drawer-card-content">
                  <div class="cust-detail-name"><strong>${o.customer.firstName || ''} ${o.customer.lastName || ''}</strong></div>
                  <div class="cust-detail-email text-muted">${o.customer.email}</div>
                  ${o.customer.phone ? `<div class="cust-detail-phone text-muted">${o.customer.phone}</div>` : ''}
                </div>
              </div>

              <!-- Shipping & Billing Box -->
              <div class="drawer-card">
                <div class="drawer-card-title">
                  <span>${Icons.orders} Shipping Address</span>
                </div>
                <div class="drawer-card-content address-block">
                  ${o.shipping_address ? `
                    <div>${o.shipping_address.address1 || ''}</div>
                    ${o.shipping_address.address2 ? `<div>${o.shipping_address.address2}</div>` : ''}
                    <div>${o.shipping_address.city || ''}, ${o.shipping_address.state || ''} ${o.shipping_address.postalCode || ''}</div>
                    <div><strong>${o.shipping_address.country || ''}</strong></div>
                  ` : '<span class="text-muted">No physical shipping address</span>'}
                </div>
              </div>
            </div>

            <!-- Line Items Table -->
            <div class="drawer-section">
              <div class="drawer-section-title">Order Line Items (${o.items.length})</div>
              <div class="table-responsive">
                <table class="data-table line-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th class="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${o.items.map(item => `
                      <tr>
                        <td>
                          <div class="item-title-cell">
                            <strong>${item.title}</strong>
                            ${item.product_category ? `<span class="badge badge-subtle text-xs">${item.product_category}</span>` : ''}
                          </div>
                        </td>
                        <td><code class="code-badge">${item.sku}</code></td>
                        <td>${item.quantity}</td>
                        <td>$${item.unit_price.toFixed(2)}</td>
                        <td class="text-right"><strong>$${item.subtotal.toFixed(2)}</strong></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Financial Summary Box -->
            <div class="drawer-section financial-summary-card">
              <div class="financial-row">
                <span>Subtotal:</span>
                <span>$${o.subtotal.toFixed(2)}</span>
              </div>
              ${o.discount > 0 ? `
                <div class="financial-row discount">
                  <span>Discounts:</span>
                  <span>-$${o.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="financial-row">
                <span>Estimated Tax:</span>
                <span>$${o.tax.toFixed(2)}</span>
              </div>
              <div class="financial-row">
                <span>Shipping & Handling:</span>
                <span>$${o.shipping.toFixed(2)}</span>
              </div>
              <div class="financial-row grand-total">
                <span>Total Amount:</span>
                <span>$${o.total.toFixed(2)} ${o.currency}</span>
              </div>
            </div>

          </div>

          <!-- TAB 2: RAW WEBHOOK PAYLOAD -->
          <div class="drawer-tab-content" id="tab-payload">
            <div class="payload-inspector-header">
              <span>Original JSON Payload received from ${o.source.toUpperCase()} webhook</span>
              <button class="btn btn-secondary btn-xs" id="btn-copy-raw-json">${Icons.copy} Copy JSON</button>
            </div>
            <pre class="json-code-block"><code>${JSON.stringify(o.raw_payload || {}, null, 2)}</code></pre>
          </div>

          <!-- TAB 3: AUDIT TRAIL -->
          <div class="drawer-tab-content" id="tab-audit">
            <div class="audit-timeline">
              ${o.auditLogs && o.auditLogs.length > 0 ? o.auditLogs.map(log => `
                <div class="timeline-item">
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <strong>${log.action}</strong>
                      <span class="timeline-time">${new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div class="timeline-actor text-muted">By: ${log.performed_by || 'system'}</div>
                    <pre class="timeline-json"><code>${JSON.stringify(log.details || {}, null, 2)}</code></pre>
                  </div>
                </div>
              `).join('') : '<p class="text-muted">No audit events recorded.</p>'}
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="drawer-footer">
          <button class="btn btn-secondary" id="btn-close-drawer-bottom">Close</button>
          ${State.user && State.user.role === 'admin' ? `
            <button class="btn btn-danger btn-sm" id="btn-delete-order" data-order-id="${o.id}">
              ${Icons.trash} Delete Order
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Hook events
    this.drawerEl.querySelector('#btn-close-drawer')?.addEventListener('click', () => this.close());
    this.drawerEl.querySelector('#btn-close-drawer-bottom')?.addEventListener('click', () => this.close());

    // Tab switching
    this.drawerEl.querySelectorAll('.drawer-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.drawerEl.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
        this.drawerEl.querySelectorAll('.drawer-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        this.drawerEl.querySelector(`#tab-${target}`)?.classList.add('active');
      });
    });

    // Copy Ext ID
    this.drawerEl.querySelector('#btn-copy-ext-id')?.addEventListener('click', () => {
      navigator.clipboard.writeText(o.external_order_id);
      Toast.success('External ID copied to clipboard!');
    });

    // Copy Raw JSON
    this.drawerEl.querySelector('#btn-copy-raw-json')?.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(o.raw_payload || {}, null, 2));
      Toast.success('Raw JSON payload copied!');
    });

    // Customer profile jump
    this.drawerEl.querySelector('#btn-view-customer-profile')?.addEventListener('click', () => {
      const custId = o.customer.id;
      this.close();
      if (typeof CustomerDetailDrawer !== 'undefined') {
        CustomerDetailDrawer.open(custId);
      }
    });

    // Status change pills
    this.drawerEl.querySelectorAll('.btn-status-pill').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetStatus = btn.getAttribute('data-target-status');
        if (targetStatus === o.status) return;

        try {
          btn.disabled = true;
          Toast.info(`Updating status to ${targetStatus.toUpperCase()} and syncing...`, 'Updating Status');
          const res = await API.updateOrderStatus(o.id, targetStatus);
          this.currentOrder = res.order;
          Toast.success(`Status updated to ${targetStatus.toUpperCase()} (Two-way store sync dispatched)`, 'Status Synchronized');
          this.renderDrawerContent();
          window.dispatchEvent(new CustomEvent('crm:refresh_data'));
        } catch (e) {
          Toast.error(e.message, 'Update Failed');
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Delete Order (Admin)
    this.drawerEl.querySelector('#btn-delete-order')?.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete order ${o.order_number}? This cannot be undone.`)) {
        try {
          await API.deleteOrder(o.id);
          Toast.success(`Order ${o.order_number} deleted.`, 'Order Deleted');
          this.close();
          window.dispatchEvent(new CustomEvent('crm:refresh_data'));
        } catch (e) {
          Toast.error(e.message, 'Delete Failed');
        }
      }
    });
  },

  close() {
    if (this.drawerEl) {
      this.drawerEl.classList.remove('drawer-open');
    }
  }
};

window.OrderDetailDrawer = OrderDetailDrawer;
