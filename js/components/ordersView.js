/**
 * Orders View Component
 * Multi-store order grid with live search, multi-faceted filtering, sorting, pagination, and CSV export.
 */

const OrdersView = {
  filters: {
    source: 'all',
    status: 'all',
    paymentStatus: 'all',
    search: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 25,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  },

  debounceTimer: null,

  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Order Management</h1>
          <p class="view-subtitle">Centralized orders from Shopify and WooCommerce storefronts</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" id="btn-export-csv">
            ${Icons.download} Export CSV
          </button>
          <button class="btn btn-primary btn-sm" id="btn-create-test-order">
            ${Icons.plus} Ingest Test Order
          </button>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="card filter-bar-card">
        <div class="filter-row">
          <!-- Search Box -->
          <div class="search-input-wrapper">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="order-search-input" class="form-input" placeholder="Search orders by ID, external ID, customer, email, SKU..." value="${this.filters.search}">
          </div>

          <!-- Store Source Filter Pills -->
          <div class="filter-pill-group">
            <button class="filter-pill ${this.filters.source === 'all' ? 'active' : ''}" data-source="all">All Sources</button>
            <button class="filter-pill ${this.filters.source === 'shopify' ? 'active' : ''}" data-source="shopify">
              <span class="source-icon-shopify">${Icons.shopify}</span> Shopify
            </button>
            <button class="filter-pill ${this.filters.source === 'woocommerce' ? 'active' : ''}" data-source="woocommerce">
              <span class="source-icon-woo">${Icons.woocommerce}</span> WooCommerce
            </button>
          </div>
        </div>

        <div class="filter-row sub-filter-row">
          <!-- Status Filter Dropdown -->
          <div class="filter-control">
            <label>Status:</label>
            <select id="filter-status" class="form-select">
              <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="processing" ${this.filters.status === 'processing' ? 'selected' : ''}>Processing</option>
              <option value="completed" ${this.filters.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${this.filters.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              <option value="refunded" ${this.filters.status === 'refunded' ? 'selected' : ''}>Refunded</option>
            </select>
          </div>

          <!-- Payment Status Dropdown -->
          <div class="filter-control">
            <label>Payment:</label>
            <select id="filter-payment" class="form-select">
              <option value="all" ${this.filters.paymentStatus === 'all' ? 'selected' : ''}>All Payments</option>
              <option value="paid" ${this.filters.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
              <option value="pending" ${this.filters.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="refunded" ${this.filters.paymentStatus === 'refunded' ? 'selected' : ''}>Refunded</option>
              <option value="failed" ${this.filters.paymentStatus === 'failed' ? 'selected' : ''}>Failed</option>
            </select>
          </div>

          <!-- Items Per Page -->
          <div class="filter-control">
            <label>Show:</label>
            <select id="filter-limit" class="form-select">
              <option value="10" ${this.filters.limit === 10 ? 'selected' : ''}>10 / page</option>
              <option value="25" ${this.filters.limit === 25 ? 'selected' : ''}>25 / page</option>
              <option value="50" ${this.filters.limit === 50 ? 'selected' : ''}>50 / page</option>
              <option value="100" ${this.filters.limit === 100 ? 'selected' : ''}>100 / page</option>
            </select>
          </div>

          <button class="btn btn-ghost btn-xs" id="btn-reset-filters" title="Reset Filters">${Icons.refresh} Reset</button>
        </div>
      </div>

      <!-- Orders Table Card -->
      <div class="card orders-table-card">
        <div id="orders-table-wrapper" class="table-responsive">
          <div class="view-loading">
            <div class="spinner"></div>
            <p>Fetching orders...</p>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
    this.loadOrders(container);
  },

  bindEvents(container) {
    // Search with Debounce
    const searchInput = container.querySelector('#order-search-input');
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.filters.search = e.target.value;
        this.filters.page = 1;
        this.loadOrders(container);
      }, 300);
    });

    // Source Filter Pills
    container.querySelectorAll('.filter-pill-group .filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.filter-pill-group .filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.filters.source = pill.getAttribute('data-source');
        this.filters.page = 1;
        this.loadOrders(container);
      });
    });

    // Status Filter Dropdown
    container.querySelector('#filter-status')?.addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.filters.page = 1;
      this.loadOrders(container);
    });

    // Payment Filter Dropdown
    container.querySelector('#filter-payment')?.addEventListener('change', (e) => {
      this.filters.paymentStatus = e.target.value;
      this.filters.page = 1;
      this.loadOrders(container);
    });

    // Limit Dropdown
    container.querySelector('#filter-limit')?.addEventListener('change', (e) => {
      this.filters.limit = parseInt(e.target.value, 10);
      this.filters.page = 1;
      this.loadOrders(container);
    });

    // Reset Filters
    container.querySelector('#btn-reset-filters')?.addEventListener('click', () => {
      this.filters = {
        source: 'all',
        status: 'all',
        paymentStatus: 'all',
        search: '',
        startDate: '',
        endDate: '',
        page: 1,
        limit: 25,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };
      this.render(container);
    });

    // Export CSV
    container.querySelector('#btn-export-csv')?.addEventListener('click', async () => {
      try {
        Toast.info('Preparing CSV export...', 'Exporting Data');
        const res = await API.getOrders({ ...this.filters, limit: 1000, page: 1 });
        this.exportToCSV(res.data);
      } catch (e) {
        Toast.error(e.message, 'Export Failed');
      }
    });

    // Quick Test Ingest
    container.querySelector('#btn-create-test-order')?.addEventListener('click', () => {
      State.setView('simulator');
    });
  },

  async loadOrders(container) {
    const tableWrapper = container.querySelector('#orders-table-wrapper');
    if (!tableWrapper) return;

    try {
      const res = await API.getOrders(this.filters);
      const { data: orders, pagination } = res;

      if (!orders || orders.length === 0) {
        tableWrapper.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">${Icons.orders}</div>
            <h3>No orders found</h3>
            <p>No orders match the current filter criteria.</p>
            <button class="btn btn-secondary btn-sm" id="btn-clear-search">Clear Filters</button>
          </div>
        `;
        tableWrapper.querySelector('#btn-clear-search')?.addEventListener('click', () => {
          this.filters.search = '';
          this.filters.source = 'all';
          this.filters.status = 'all';
          this.render(container);
        });
        return;
      }

      tableWrapper.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Source</th>
              <th class="sortable-th" data-sort="order_number">Order #</th>
              <th>External ID</th>
              <th>Customer</th>
              <th>Items Preview</th>
              <th class="sortable-th" data-sort="total">Total</th>
              <th class="sortable-th" data-sort="status">Order Status</th>
              <th>Payment</th>
              <th class="sortable-th" data-sort="created_at">Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr class="clickable-row" data-order-id="${o.id}">
                <td>
                  <span class="badge badge-${o.source}">
                    ${o.source === 'shopify' ? Icons.shopify : Icons.woocommerce}
                    ${o.source.toUpperCase()}
                  </span>
                </td>
                <td><strong>${o.order_number}</strong></td>
                <td><code class="code-badge">${o.external_order_id}</code></td>
                <td>
                  <div class="table-cust-cell">
                    <span class="cust-name">${o.customer_first_name || ''} ${o.customer_last_name || ''}</span>
                    <span class="cust-email text-muted">${o.customer_email}</span>
                  </div>
                </td>
                <td>
                  <span class="badge badge-subtle" title="${o.items_summary || ''}">
                    ${o.items_count} item${o.items_count !== 1 ? 's' : ''}
                  </span>
                </td>
                <td><strong>$${o.total.toFixed(2)}</strong></td>
                <td>
                  <span class="badge badge-status-${o.status}">
                    ${o.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span class="badge badge-payment-${o.payment_status}">
                    ${o.payment_status.toUpperCase()}
                  </span>
                </td>
                <td class="text-muted text-sm">${new Date(o.created_at).toLocaleDateString()} ${new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <button class="btn btn-icon btn-sm btn-view-order" data-order-id="${o.id}" title="Inspect Order Details">
                    ${Icons.externalLink}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Pagination Bar -->
        <div class="pagination-bar">
          <div class="pagination-info text-muted text-sm">
            Showing <strong>${((pagination.page - 1) * pagination.limit) + 1}</strong> to <strong>${Math.min(pagination.total, pagination.page * pagination.limit)}</strong> of <strong>${pagination.total}</strong> orders
          </div>
          <div class="pagination-controls">
            <button class="btn btn-secondary btn-xs" id="btn-prev-page" ${pagination.page <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span class="page-indicator">Page ${pagination.page} of ${pagination.totalPages || 1}</span>
            <button class="btn btn-secondary btn-xs" id="btn-next-page" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        </div>
      `;

      // Hook row clicks
      tableWrapper.querySelectorAll('.clickable-row, .btn-view-order').forEach(el => {
        el.addEventListener('click', (e) => {
          const orderId = el.getAttribute('data-order-id');
          if (orderId && typeof OrderDetailDrawer !== 'undefined') {
            OrderDetailDrawer.open(orderId);
          }
        });
      });

      // Pagination clicks
      tableWrapper.querySelector('#btn-prev-page')?.addEventListener('click', () => {
        if (this.filters.page > 1) {
          this.filters.page--;
          this.loadOrders(container);
        }
      });

      tableWrapper.querySelector('#btn-next-page')?.addEventListener('click', () => {
        if (this.filters.page < pagination.totalPages) {
          this.filters.page++;
          this.loadOrders(container);
        }
      });

      // Column Sorting
      tableWrapper.querySelectorAll('.sortable-th').forEach(th => {
        th.addEventListener('click', () => {
          const sortCol = th.getAttribute('data-sort');
          if (this.filters.sortBy === sortCol) {
            this.filters.sortOrder = this.filters.sortOrder === 'ASC' ? 'DESC' : 'ASC';
          } else {
            this.filters.sortBy = sortCol;
            this.filters.sortOrder = 'DESC';
          }
          this.loadOrders(container);
        });
      });

    } catch (err) {
      tableWrapper.innerHTML = `
        <div class="card error-card">
          <p>Failed to load orders: ${err.message}</p>
        </div>
      `;
    }
  },

  exportToCSV(orders) {
    if (!orders || orders.length === 0) {
      Toast.warning('No orders to export.');
      return;
    }

    const headers = ['Order Number', 'Source', 'External Order ID', 'Customer Email', 'Customer Name', 'Total', 'Currency', 'Status', 'Payment Status', 'Items Count', 'Created At'];
    const rows = orders.map(o => [
      `"${o.order_number}"`,
      `"${o.source}"`,
      `"${o.external_order_id}"`,
      `"${o.customer_email}"`,
      `"${(o.customer_first_name || '') + ' ' + (o.customer_last_name || '')}"`,
      o.total.toFixed(2),
      `"${o.currency || 'USD'}"`,
      `"${o.status}"`,
      `"${o.payment_status}"`,
      o.items_count,
      `"${o.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crm_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Toast.success('Orders CSV file downloaded successfully!');
  }
};

window.OrdersView = OrdersView;
