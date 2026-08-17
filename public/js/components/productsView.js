/**
 * Products Catalogue View Component
 * High-performance indexed catalogue supporting 1,000+ to 10,000+ products.
 */

const ProductsView = {
  filters: {
    search: '',
    category: 'all',
    stockStatus: '',
    page: 1,
    limit: 24,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  },

  debounceTimer: null,

  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Product Catalogue</h1>
          <p class="view-subtitle">High-capacity catalogue indexed for 1,000+ to 10,000+ items across stores</p>
        </div>
        <div class="header-actions">
          <span class="badge badge-subtle" id="catalog-perf-badge">
            ${Icons.activity} Indexed Performance: < 5ms query
          </span>
          ${State.user && State.user.role === 'admin' ? `
            <button class="btn btn-primary btn-sm" id="btn-add-new-product">
              ${Icons.plus} Add Product
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card filter-bar-card">
        <div class="filter-row">
          <div class="search-input-wrapper">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="product-search-input" class="form-input" placeholder="Search by SKU (e.g. ELEC-1001), name, or category..." value="${this.filters.search}">
          </div>

          <div class="filter-control">
            <label>Category:</label>
            <select id="prod-category-select" class="form-select">
              <option value="all">All Categories</option>
            </select>
          </div>

          <div class="filter-control">
            <label>Stock Level:</label>
            <select id="prod-stock-select" class="form-select">
              <option value="">All Inventory</option>
              <option value="in_stock">In Stock (>10)</option>
              <option value="low_stock">Low Stock (1-10)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          <div class="filter-control">
            <label>Sort:</label>
            <select id="prod-sort-select" class="form-select">
              <option value="created_at" selected>Newest First</option>
              <option value="price">Price: Low to High</option>
              <option value="stock_quantity">Stock Quantity</option>
              <option value="name">Product Name</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Products Grid & Table -->
      <div id="products-content-wrapper">
        <div class="view-loading">
          <div class="spinner"></div>
          <p>Querying 1,000+ item catalogue index...</p>
        </div>
      </div>
    `;

    this.bindEvents(container);
    this.loadProducts(container);
  },

  bindEvents(container) {
    const searchInput = container.querySelector('#product-search-input');
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.filters.search = e.target.value;
        this.filters.page = 1;
        this.loadProducts(container);
      }, 250);
    });

    container.querySelector('#prod-category-select')?.addEventListener('change', (e) => {
      this.filters.category = e.target.value;
      this.filters.page = 1;
      this.loadProducts(container);
    });

    container.querySelector('#prod-stock-select')?.addEventListener('change', (e) => {
      this.filters.stockStatus = e.target.value;
      this.filters.page = 1;
      this.loadProducts(container);
    });

    container.querySelector('#prod-sort-select')?.addEventListener('change', (e) => {
      this.filters.sortBy = e.target.value;
      this.filters.sortOrder = e.target.value === 'price' ? 'ASC' : 'DESC';
      this.filters.page = 1;
      this.loadProducts(container);
    });

    container.querySelector('#btn-add-new-product')?.addEventListener('click', () => {
      this.showAddProductModal();
    });
  },

  async loadProducts(container) {
    const wrapper = container.querySelector('#products-content-wrapper');
    if (!wrapper) return;

    try {
      const startTime = performance.now();
      const res = await API.getProducts(this.filters);
      const queryDuration = (performance.now() - startTime).toFixed(1);

      const { data: products, categories, pagination } = res;

      // Populate Category options if not yet populated
      const catSelect = container.querySelector('#prod-category-select');
      if (catSelect && catSelect.children.length === 1 && categories) {
        categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          catSelect.appendChild(opt);
        });
      }

      if (!products || products.length === 0) {
        wrapper.innerHTML = `
          <div class="card empty-state">
            <div class="empty-icon">${Icons.products}</div>
            <h3>No products found</h3>
            <p>No products match the selected filters.</p>
          </div>
        `;
        return;
      }

      wrapper.innerHTML = `
        <div class="products-grid">
          ${products.map(p => {
            let stockBadge = '<span class="badge badge-status-completed badge-xs">In Stock</span>';
            if (p.stock_quantity === 0) {
              stockBadge = '<span class="badge badge-status-cancelled badge-xs">Out of Stock</span>';
            } else if (p.stock_quantity <= 10) {
              stockBadge = '<span class="badge badge-status-pending badge-xs">Low Stock</span>';
            }

            return `
              <div class="product-card" data-product-id="${p.id}">
                <div class="product-card-header">
                  <span class="product-category-pill">${p.category}</span>
                  ${stockBadge}
                </div>
                <div class="product-card-body">
                  <h4 class="product-title" title="${p.name}">${p.name}</h4>
                  <div class="product-sku-row">
                    <span>SKU:</span> <code class="code-badge">${p.sku}</code>
                  </div>
                  <p class="product-desc text-muted text-xs">${p.description ? p.description.slice(0, 85) + '...' : ''}</p>
                </div>
                <div class="product-card-footer">
                  <div class="product-pricing">
                    <span class="product-price">$${p.price.toFixed(2)}</span>
                    ${p.sale_price ? `<span class="product-sale-price">$${p.sale_price.toFixed(2)}</span>` : ''}
                  </div>
                  <div class="product-stock-counter">
                    <span class="text-xs text-muted">Stock:</span>
                    <strong>${p.stock_quantity}</strong>
                    ${State.user && State.user.role === 'admin' ? `
                      <button class="btn btn-ghost btn-xs btn-edit-stock" data-prod-id="${p.id}" data-current-stock="${p.stock_quantity}" title="Edit Stock Level">
                        ${Icons.refresh}
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar card">
          <div class="pagination-info text-muted text-sm">
            Showing <strong>${((pagination.page - 1) * pagination.limit) + 1}</strong> to <strong>${Math.min(pagination.total, pagination.page * pagination.limit)}</strong> of <strong>${pagination.total}</strong> products (${queryDuration}ms)
          </div>
          <div class="pagination-controls">
            <button class="btn btn-secondary btn-xs" id="btn-prod-prev" ${pagination.page <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span class="page-indicator">Page ${pagination.page} of ${pagination.totalPages || 1}</span>
            <button class="btn btn-secondary btn-xs" id="btn-prod-next" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        </div>
      `;

      // Pagination events
      wrapper.querySelector('#btn-prod-prev')?.addEventListener('click', () => {
        if (this.filters.page > 1) {
          this.filters.page--;
          this.loadProducts(container);
        }
      });

      wrapper.querySelector('#btn-prod-next')?.addEventListener('click', () => {
        if (this.filters.page < pagination.totalPages) {
          this.filters.page++;
          this.loadProducts(container);
        }
      });

      // Quick Stock Edit
      wrapper.querySelectorAll('.btn-edit-stock').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const prodId = btn.getAttribute('data-prod-id');
          const currentStock = btn.getAttribute('data-current-stock');
          const newQty = prompt('Enter new stock quantity:', currentStock);
          if (newQty !== null && !isNaN(parseInt(newQty, 10))) {
            try {
              await API.updateProductStock(prodId, parseInt(newQty, 10));
              Toast.success('Stock quantity updated.', 'Inventory Updated');
              this.loadProducts(container);
            } catch (err) {
              Toast.error(err.message, 'Update Failed');
            }
          }
        });
      });

    } catch (err) {
      wrapper.innerHTML = `
        <div class="card error-card">
          <p>Failed to query products: ${err.message}</p>
        </div>
      `;
    }
  },

  showAddProductModal() {
    let modal = document.getElementById('add-product-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'add-product-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>Add New Product to Catalogue</h3>
          <button class="modal-close" id="btn-close-prod-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">SKU (Unique Identifier):</label>
            <input type="text" id="new-prod-sku" class="form-input" placeholder="e.g. ELEC-9901">
          </div>
          <div class="form-group">
            <label class="form-label">Product Name:</label>
            <input type="text" id="new-prod-name" class="form-input" placeholder="e.g. Ergonomic Bluetooth Keypad">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category:</label>
              <input type="text" id="new-prod-cat" class="form-input" value="Electronics & Audio">
            </div>
            <div class="form-group">
              <label class="form-label">Price ($):</label>
              <input type="number" step="0.01" id="new-prod-price" class="form-input" value="79.99">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sale Price ($):</label>
              <input type="number" step="0.01" id="new-prod-sale-price" class="form-input" placeholder="Optional">
            </div>
            <div class="form-group">
              <label class="form-label">Stock Quantity:</label>
              <input type="number" id="new-prod-stock" class="form-input" value="50">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description:</label>
            <textarea id="new-prod-desc" class="form-textarea" rows="2" placeholder="Product details..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-new-prod">Cancel</button>
          <button class="btn btn-primary" id="btn-save-new-prod">Save Product</button>
        </div>
      </div>
    `;

    modal.classList.add('modal-open');
    modal.querySelector('#btn-close-prod-modal')?.addEventListener('click', () => modal.classList.remove('modal-open'));
    modal.querySelector('#btn-cancel-new-prod')?.addEventListener('click', () => modal.classList.remove('modal-open'));

    modal.querySelector('#btn-save-new-prod')?.addEventListener('click', async () => {
      const sku = modal.querySelector('#new-prod-sku').value.trim();
      const name = modal.querySelector('#new-prod-name').value.trim();
      const category = modal.querySelector('#new-prod-cat').value.trim();
      const price = modal.querySelector('#new-prod-price').value;
      const salePrice = modal.querySelector('#new-prod-sale-price').value;
      const stockQuantity = modal.querySelector('#new-prod-stock').value;
      const description = modal.querySelector('#new-prod-desc').value.trim();

      if (!sku || !name || !price) {
        Toast.error('SKU, Name, and Price are required.');
        return;
      }

      try {
        await API.createProduct({
          sku,
          name,
          category,
          price: parseFloat(price),
          salePrice: salePrice ? parseFloat(salePrice) : null,
          stockQuantity: parseInt(stockQuantity, 10) || 0,
          description
        });
        Toast.success(`Product ${sku} created successfully!`, 'Product Added');
        modal.classList.remove('modal-open');
        this.loadProducts(document.getElementById('main-content'));
      } catch (e) {
        Toast.error(e.message, 'Creation Failed');
      }
    });
  }
};

window.ProductsView = ProductsView;
