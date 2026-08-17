/**
 * Customers View Component
 * Unified customer management with multi-store deduplication, lifetime metrics, and merging tool.
 */

const CustomersView = {
  filters: {
    search: '',
    page: 1,
    limit: 25,
    sortBy: 'total_spend',
    sortOrder: 'DESC'
  },

  debounceTimer: null,

  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Unified Customer Profiles</h1>
          <p class="view-subtitle">Cross-store customer identity resolution and lifetime value metrics</p>
        </div>
        <div class="header-actions">
          ${State.user && State.user.role === 'admin' ? `
            <button class="btn btn-secondary btn-sm" id="btn-open-merge-modal">
              ${Icons.refresh} Merge Duplicates
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Deduplication Strategy Banner -->
      <div class="card banner-card">
        <div class="banner-content">
          <div class="banner-icon">${Icons.shield}</div>
          <div>
            <strong>Cross-Store Customer Deduplication Strategy</strong>
            <p class="text-sm text-muted">
              Customers are unified across Shopify and WooCommerce primarily using normalized, lowercase email addresses. 
              Orders from either storefront are automatically aggregated under a single customer identity.
            </p>
          </div>
        </div>
      </div>

      <!-- Search & Filter Controls -->
      <div class="card filter-bar-card">
        <div class="filter-row">
          <div class="search-input-wrapper">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="customer-search-input" class="form-input" placeholder="Search customers by name, email, or phone number..." value="${this.filters.search}">
          </div>

          <div class="filter-control">
            <label>Sort By:</label>
            <select id="cust-sort-by" class="form-select">
              <option value="total_spend" ${this.filters.sortBy === 'total_spend' ? 'selected' : ''}>Highest Lifetime Spend</option>
              <option value="total_orders" ${this.filters.sortBy === 'total_orders' ? 'selected' : ''}>Most Orders</option>
              <option value="last_order_date" ${this.filters.sortBy === 'last_order_date' ? 'selected' : ''}>Recent Order Date</option>
              <option value="created_at" ${this.filters.sortBy === 'created_at' ? 'selected' : ''}>Date Joined</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Customers Table Card -->
      <div class="card customers-table-card">
        <div id="customers-table-wrapper" class="table-responsive">
          <div class="view-loading">
            <div class="spinner"></div>
            <p>Loading customer profiles...</p>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
    this.loadCustomers(container);
  },

  bindEvents(container) {
    const searchInput = container.querySelector('#customer-search-input');
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.filters.search = e.target.value;
        this.filters.page = 1;
        this.loadCustomers(container);
      }, 300);
    });

    container.querySelector('#cust-sort-by')?.addEventListener('change', (e) => {
      this.filters.sortBy = e.target.value;
      this.filters.page = 1;
      this.loadCustomers(container);
    });

    // Merge Modal
    container.querySelector('#btn-open-merge-modal')?.addEventListener('click', () => {
      this.showMergeModal();
    });
  },

  async loadCustomers(container) {
    const tableWrapper = container.querySelector('#customers-table-wrapper');
    if (!tableWrapper) return;

    try {
      const res = await API.getCustomers(this.filters);
      const { data: customers, pagination } = res;

      if (!customers || customers.length === 0) {
        tableWrapper.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">${Icons.customers}</div>
            <h3>No customers found</h3>
            <p>No customer records match your search criteria.</p>
          </div>
        `;
        return;
      }

      tableWrapper.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Email (Deduplication Key)</th>
              <th>Phone</th>
              <th>Stores Used</th>
              <th>Orders</th>
              <th>Lifetime Spend</th>
              <th>Average Order</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr class="clickable-row" data-cust-id="${c.id}">
                <td>
                  <div class="cust-avatar-cell">
                    <div class="avatar-circle">${(c.first_name?.[0] || c.email?.[0] || 'C').toUpperCase()}</div>
                    <strong>${c.first_name || ''} ${c.last_name || 'Customer'}</strong>
                  </div>
                </td>
                <td><code class="code-badge">${c.email}</code></td>
                <td class="text-muted text-sm">${c.phone || '—'}</td>
                <td>
                  <div class="store-pill-badges">
                    ${c.sources.length > 0 ? c.sources.map(s => `
                      <span class="badge badge-${s} badge-xs">
                        ${s === 'shopify' ? Icons.shopify : Icons.woocommerce} ${s.toUpperCase()}
                      </span>
                    `).join('') : '<span class="badge badge-subtle badge-xs">No orders</span>'}
                  </div>
                </td>
                <td><strong>${c.total_orders}</strong></td>
                <td><strong class="text-positive">$${c.total_spend.toFixed(2)}</strong></td>
                <td>$${c.average_order_value.toFixed(2)}</td>
                <td class="text-muted text-sm">${c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : '—'}</td>
                <td>
                  <button class="btn btn-icon btn-sm btn-open-profile" data-cust-id="${c.id}" title="View Unified Profile">
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
            Showing <strong>${((pagination.page - 1) * pagination.limit) + 1}</strong> to <strong>${Math.min(pagination.total, pagination.page * pagination.limit)}</strong> of <strong>${pagination.total}</strong> customers
          </div>
          <div class="pagination-controls">
            <button class="btn btn-secondary btn-xs" id="btn-cust-prev" ${pagination.page <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span class="page-indicator">Page ${pagination.page} of ${pagination.totalPages || 1}</span>
            <button class="btn btn-secondary btn-xs" id="btn-cust-next" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        </div>
      `;

      tableWrapper.querySelectorAll('.clickable-row, .btn-open-profile').forEach(el => {
        el.addEventListener('click', () => {
          const custId = el.getAttribute('data-cust-id');
          if (custId && typeof CustomerDetailDrawer !== 'undefined') {
            CustomerDetailDrawer.open(custId);
          }
        });
      });

      tableWrapper.querySelector('#btn-cust-prev')?.addEventListener('click', () => {
        if (this.filters.page > 1) {
          this.filters.page--;
          this.loadCustomers(container);
        }
      });

      tableWrapper.querySelector('#btn-cust-next')?.addEventListener('click', () => {
        if (this.filters.page < pagination.totalPages) {
          this.filters.page++;
          this.loadCustomers(container);
        }
      });

    } catch (err) {
      tableWrapper.innerHTML = `
        <div class="card error-card">
          <p>Failed to load customers: ${err.message}</p>
        </div>
      `;
    }
  },

  showMergeModal() {
    let modal = document.getElementById('merge-customers-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'merge-customers-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>Merge Duplicate Customers</h3>
          <button class="modal-close" id="btn-close-merge-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="text-sm text-muted">
            Select a duplicate source customer to merge into a primary target customer. 
            All orders from the source will be re-associated with the target profile, and the duplicate record will be removed.
          </p>
          <div class="form-group">
            <label class="form-label">Duplicate / Source Customer ID (To be deleted):</label>
            <input type="text" id="merge-source-id" class="form-input" placeholder="e.g. UUID of duplicate record">
          </div>
          <div class="form-group">
            <label class="form-label">Primary / Target Customer ID (To keep):</label>
            <input type="text" id="merge-target-id" class="form-input" placeholder="e.g. UUID of primary record">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-merge">Cancel</button>
          <button class="btn btn-danger" id="btn-confirm-merge">Execute Merge</button>
        </div>
      </div>
    `;

    modal.classList.add('modal-open');
    modal.querySelector('#btn-close-merge-modal')?.addEventListener('click', () => modal.classList.remove('modal-open'));
    modal.querySelector('#btn-cancel-merge')?.addEventListener('click', () => modal.classList.remove('modal-open'));

    modal.querySelector('#btn-confirm-merge')?.addEventListener('click', async () => {
      const sourceId = modal.querySelector('#merge-source-id').value.trim();
      const targetId = modal.querySelector('#merge-target-id').value.trim();

      if (!sourceId || !targetId) {
        Toast.error('Please enter both source and target customer IDs.');
        return;
      }

      try {
        Toast.info('Merging customer profiles...', 'Executing Merge');
        await API.mergeCustomers(sourceId, targetId);
        Toast.success('Customers merged successfully! Orders consolidated.', 'Merge Complete');
        modal.classList.remove('modal-open');
        this.loadCustomers(document.getElementById('main-content'));
      } catch (e) {
        Toast.error(e.message, 'Merge Failed');
      }
    });
  }
};

window.CustomersView = CustomersView;
