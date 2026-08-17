/**
 * Dashboard View Component
 * Renders KPIs, Revenue Trends SVG Chart, Store Comparison, Status Meter, and Live Ingestion Feed.
 */

const DashboardView = {
  async render(container) {
    container.innerHTML = `
      <div class="view-loading">
        <div class="spinner"></div>
        <p>Loading CRM analytics...</p>
      </div>
    `;

    try {
      const data = await API.getDashboardAnalytics();
      const { kpis, stores, statusDistribution, dailyRevenue, recentOrders } = data;

      const shopifyPercent = kpis.totalRevenue > 0 ? ((stores.shopify.revenue / kpis.totalRevenue) * 100).toFixed(1) : 0;
      const wooPercent = kpis.totalRevenue > 0 ? ((stores.woocommerce.revenue / kpis.totalRevenue) * 100).toFixed(1) : 0;

      container.innerHTML = `
        <div class="dashboard-wrapper">
          <!-- Header Banner & Quick Actions -->
          <div class="view-header">
            <div>
              <h1 class="view-title">Executive Dashboard</h1>
              <p class="view-subtitle">Centralized Multi-Store Order Management & Ingestion Monitoring</p>
            </div>
            <div class="header-actions">
              <button class="btn btn-secondary btn-sm" id="btn-quick-shopify">
                <span class="source-icon-shopify">${Icons.shopify}</span> Simulate Shopify Order
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-quick-woo">
                <span class="source-icon-woo">${Icons.woocommerce}</span> Simulate WooCommerce Order
              </button>
              <button class="btn btn-primary btn-sm" id="btn-goto-simulator">
                ${Icons.play} Test Suite
              </button>
            </div>
          </div>

          <!-- KPI Cards Grid -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-header">
                <span class="kpi-label">Total Revenue</span>
                <span class="kpi-icon-badge">${Icons.trendingUp}</span>
              </div>
              <div class="kpi-value">$${kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="kpi-meta positive">Avg Order Value: $${kpis.averageOrderValue.toFixed(2)}</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <span class="kpi-label">Total Orders</span>
                <span class="kpi-icon-badge">${Icons.orders}</span>
              </div>
              <div class="kpi-value">${kpis.totalOrders}</div>
              <div class="kpi-meta">Across 2 storefronts</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <span class="kpi-label">Pending / Processing</span>
                <span class="kpi-icon-badge warning">${Icons.activity}</span>
              </div>
              <div class="kpi-value">${kpis.pendingOrders + kpis.processingOrders}</div>
              <div class="kpi-meta">${kpis.pendingOrders} pending • ${kpis.processingOrders} processing</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <span class="kpi-label">Completed Orders</span>
                <span class="kpi-icon-badge success">${Icons.check}</span>
              </div>
              <div class="kpi-value">${kpis.completedOrders}</div>
              <div class="kpi-meta positive">${((kpis.completedOrders / (kpis.totalOrders || 1)) * 100).toFixed(0)}% fulfillment rate</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <span class="kpi-label">Dead Letter Queue</span>
                <span class="kpi-icon-badge ${kpis.pendingFailures > 0 ? 'danger' : ''}">${Icons.failures}</span>
              </div>
              <div class="kpi-value">${kpis.pendingFailures}</div>
              <div class="kpi-meta ${kpis.pendingFailures > 0 ? 'negative' : 'positive'}">
                ${kpis.pendingFailures > 0 ? 'Action required in DLQ' : 'All syncs healthy'}
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-header">
                <span class="kpi-label">Unified Customers</span>
                <span class="kpi-icon-badge">${Icons.customers}</span>
              </div>
              <div class="kpi-value">${kpis.totalCustomers}</div>
              <div class="kpi-meta">Deduplicated across stores</div>
            </div>
          </div>

          <!-- Store Performance Comparison & Revenue Distribution -->
          <div class="dashboard-two-col">
            <!-- Store Split Card -->
            <div class="card store-split-card">
              <div class="card-header">
                <h3 class="card-title">Store Channel Breakdown</h3>
                <span class="badge badge-subtle">Realtime Multi-Store Sync</span>
              </div>
              <div class="card-body">
                <div class="store-comparison-bars">
                  <!-- Shopify Bar -->
                  <div class="store-progress-row">
                    <div class="store-progress-header">
                      <div class="store-brand">
                        <span class="source-icon-shopify">${Icons.shopify}</span>
                        <strong>Shopify Store</strong>
                      </div>
                      <div class="store-metrics">
                        <strong>$${stores.shopify.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                        <span class="text-muted">(${stores.shopify.orderCount} orders • ${shopifyPercent}%)</span>
                      </div>
                    </div>
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill shopify-fill" style="width: ${shopifyPercent}%"></div>
                    </div>
                  </div>

                  <!-- WooCommerce Bar -->
                  <div class="store-progress-row">
                    <div class="store-progress-header">
                      <div class="store-brand">
                        <span class="source-icon-woo">${Icons.woocommerce}</span>
                        <strong>WooCommerce Store</strong>
                      </div>
                      <div class="store-metrics">
                        <strong>$${stores.woocommerce.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                        <span class="text-muted">(${stores.woocommerce.orderCount} orders • ${wooPercent}%)</span>
                      </div>
                    </div>
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill woo-fill" style="width: ${wooPercent}%"></div>
                    </div>
                  </div>
                </div>

                <!-- Status Distribution Breakdown -->
                <div class="status-meter-section">
                  <div class="section-subtitle">Order Status Pipeline</div>
                  <div class="status-meter-bars">
                    ${statusDistribution.map(s => `
                      <div class="status-pill-stat">
                        <span class="status-dot" style="background-color: ${s.color}"></span>
                        <span class="status-name">${s.status}:</span>
                        <strong>${s.count}</strong>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Ingestion Live Pulse / Security Info -->
            <div class="card live-pulse-card">
              <div class="card-header">
                <h3 class="card-title">Live Ingestion & Security Guard</h3>
                <div class="live-indicator-pill">
                  <span class="pulse-dot"></span> Active SSE Stream
                </div>
              </div>
              <div class="card-body">
                <div class="security-status-grid">
                  <div class="sec-item">
                    <span class="sec-icon">${Icons.shield}</span>
                    <div>
                      <div class="sec-label">Shopify Webhook Security</div>
                      <div class="sec-val">HMAC-SHA256 Verified</div>
                    </div>
                  </div>
                  <div class="sec-item">
                    <span class="sec-icon">${Icons.shield}</span>
                    <div>
                      <div class="sec-label">WooCommerce Security</div>
                      <div class="sec-val">HMAC-SHA256 Verified</div>
                    </div>
                  </div>
                  <div class="sec-item">
                    <span class="sec-icon">${Icons.refresh}</span>
                    <div>
                      <div class="sec-label">Idempotency Guard</div>
                      <div class="sec-val">Duplicate Replay Protected</div>
                    </div>
                  </div>
                  <div class="sec-item">
                    <span class="sec-icon">${Icons.activity}</span>
                    <div>
                      <div class="sec-label">Two-Way Status Sync</div>
                      <div class="sec-val">Active (Auto-Dispatch)</div>
                    </div>
                  </div>
                </div>

                <div class="quick-sim-banner">
                  <p>Trigger test checkouts to verify real-time ingestion, deduplication, and status propagation.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Orders Table -->
          <div class="card recent-orders-card">
            <div class="card-header">
              <h3 class="card-title">Recent Ingested Orders</h3>
              <button class="btn btn-ghost btn-sm" id="btn-view-all-orders">View All Orders &rarr;</button>
            </div>
            <div class="card-body table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Order #</th>
                    <th>External ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentOrders.map(order => `
                    <tr class="clickable-row" data-order-id="${order.id}">
                      <td>
                        <span class="badge badge-${order.source}">
                          ${order.source === 'shopify' ? Icons.shopify : Icons.woocommerce}
                          ${order.source.toUpperCase()}
                        </span>
                      </td>
                      <td><strong>${order.order_number}</strong></td>
                      <td><code class="code-badge">${order.external_order_id}</code></td>
                      <td>
                        <div class="table-cust-cell">
                          <span class="cust-name">${order.customer_name || 'Customer'}</span>
                          <span class="cust-email text-muted">${order.customer_email}</span>
                        </div>
                      </td>
                      <td><span class="badge badge-subtle">${order.items_count} item${order.items_count !== 1 ? 's' : ''}</span></td>
                      <td><strong>$${order.total.toFixed(2)}</strong></td>
                      <td>
                        <span class="badge badge-status-${order.status}">
                          ${order.status.toUpperCase()}
                        </span>
                      </td>
                      <td class="text-muted text-sm">${new Date(order.created_at).toLocaleDateString()} ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <button class="btn btn-icon btn-sm btn-open-order" data-order-id="${order.id}" title="View Order Details">
                          ${Icons.externalLink}
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Event listeners
      container.querySelector('#btn-quick-shopify')?.addEventListener('click', async () => {
        try {
          Toast.info('Dispatching simulated Shopify webhook...', 'Simulating Checkout');
          const res = await API.simulateShopifyOrder();
          Toast.success(`Simulated order ${res.crmOrder.order_number} ($${res.crmOrder.total.toFixed(2)}) processed!`, 'Shopify Sync Success');
          DashboardView.render(container);
        } catch (e) {
          Toast.error(e.message, 'Simulation Failed');
        }
      });

      container.querySelector('#btn-quick-woo')?.addEventListener('click', async () => {
        try {
          Toast.info('Dispatching simulated WooCommerce webhook...', 'Simulating Checkout');
          const res = await API.simulateWooCommerceOrder();
          Toast.success(`Simulated order ${res.crmOrder.order_number} ($${res.crmOrder.total.toFixed(2)}) processed!`, 'WooCommerce Sync Success');
          DashboardView.render(container);
        } catch (e) {
          Toast.error(e.message, 'Simulation Failed');
        }
      });

      container.querySelector('#btn-goto-simulator')?.addEventListener('click', () => {
        State.setView('simulator');
      });

      container.querySelector('#btn-view-all-orders')?.addEventListener('click', () => {
        State.setView('orders');
      });

      container.querySelectorAll('.clickable-row, .btn-open-order').forEach(el => {
        el.addEventListener('click', (e) => {
          const orderId = el.getAttribute('data-order-id');
          if (orderId && typeof OrderDetailDrawer !== 'undefined') {
            OrderDetailDrawer.open(orderId);
          }
        });
      });

    } catch (err) {
      container.innerHTML = `
        <div class="card error-card">
          <h3>Failed to load Dashboard</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary" onclick="DashboardView.render(document.getElementById('main-content'))">Retry</button>
        </div>
      `;
    }
  }
};

window.DashboardView = DashboardView;
