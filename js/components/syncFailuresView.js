/**
 * Sync Failures & Dead Letter Queue (DLQ) View Component
 * Provides visibility into failed webhook synchronizations, raw error inspection, and retry engine.
 */

const SyncFailuresView = {
  filters: {
    status: 'all',
    source: 'all',
    page: 1,
    limit: 15
  },

  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Dead Letter Queue & Failure Handling</h1>
          <p class="view-subtitle">Monitor, inspect, and safely retry failed multi-store webhook synchronizations</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" id="btn-trigger-test-failure">
            ${Icons.failures} Trigger Test Failure
          </button>
        </div>
      </div>

      <!-- Architecture Alert Box -->
      <div class="card banner-card">
        <div class="banner-content">
          <div class="banner-icon">${Icons.failures}</div>
          <div>
            <strong>Automated Failure Capture & Duplicate-Safe Retry</strong>
            <p class="text-sm text-muted">
              When webhook validation errors, signature mismatches, or malformed data occur, the request is preserved in the Dead Letter Queue. 
              Operators can inspect the raw payload, make corrections, and trigger a retry without risking duplicate orders.
            </p>
          </div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="card filter-bar-card">
        <div class="filter-row">
          <div class="filter-control">
            <label>Filter Status:</label>
            <select id="dlq-filter-status" class="form-select">
              <option value="all">All DLQ Items</option>
              <option value="pending" selected>Pending Action</option>
              <option value="failed">Retry Failed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div class="filter-control">
            <label>Filter Source:</label>
            <select id="dlq-filter-source" class="form-select">
              <option value="all">All Sources</option>
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
            </select>
          </div>

          <button class="btn btn-ghost btn-xs" id="btn-refresh-dlq">${Icons.refresh} Refresh</button>
        </div>
      </div>

      <!-- Failures Content Area -->
      <div id="dlq-content-wrapper">
        <div class="view-loading">
          <div class="spinner"></div>
          <p>Querying Dead Letter Queue...</p>
        </div>
      </div>
    `;

    this.bindEvents(container);
    this.loadFailures(container);
  },

  bindEvents(container) {
    container.querySelector('#dlq-filter-status')?.addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.filters.page = 1;
      this.loadFailures(container);
    });

    container.querySelector('#dlq-filter-source')?.addEventListener('change', (e) => {
      this.filters.source = e.target.value;
      this.filters.page = 1;
      this.loadFailures(container);
    });

    container.querySelector('#btn-refresh-dlq')?.addEventListener('click', () => {
      this.loadFailures(container);
    });

    container.querySelector('#btn-trigger-test-failure')?.addEventListener('click', async () => {
      try {
        Toast.info('Sending malformed test payload to webhook receiver...', 'Testing DLQ Capture');
        await API.simulateFailureTest();
        Toast.warning('Malformed payload caught and logged to Dead Letter Queue!', 'DLQ Capture Verified');
        this.loadFailures(container);
      } catch (e) {
        Toast.error(e.message, 'Simulation Failed');
      }
    });
  },

  async loadFailures(container) {
    const wrapper = container.querySelector('#dlq-content-wrapper');
    if (!wrapper) return;

    try {
      const res = await API.getSyncFailures(this.filters);
      const { data: failures, pagination } = res;

      if (!failures || failures.length === 0) {
        wrapper.innerHTML = `
          <div class="card empty-state">
            <div class="empty-icon text-positive">${Icons.check}</div>
            <h3>Dead Letter Queue is Clean</h3>
            <p>No failed webhook synchronizations found matching the selected status.</p>
          </div>
        `;
        return;
      }

      wrapper.innerHTML = `
        <div class="failures-list">
          ${failures.map(f => {
            const isPending = f.status === 'pending' || f.status === 'failed';
            return `
              <div class="card failure-card ${f.status === 'resolved' ? 'failure-resolved' : ''}" data-failure-id="${f.id}">
                <div class="failure-card-header">
                  <div class="failure-title-group">
                    <span class="badge badge-${f.source}">
                      ${f.source === 'shopify' ? Icons.shopify : Icons.woocommerce} ${f.source.toUpperCase()}
                    </span>
                    <span class="badge badge-status-${f.status === 'resolved' ? 'completed' : 'cancelled'}">
                      ${f.status.toUpperCase()}
                    </span>
                    <strong>External ID: <code>${f.external_order_id || 'N/A'}</code></strong>
                  </div>
                  <div class="failure-meta text-muted text-xs">
                    <span>Retries: <strong>${f.retry_count}</strong></span>
                    <span>• Logged: ${new Date(f.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div class="failure-card-body">
                  <div class="failure-error-box">
                    <span class="error-icon">${Icons.failures}</span>
                    <div class="error-text">
                      <strong>Error Trace:</strong> ${f.error_message}
                    </div>
                  </div>

                  <div class="payload-editor-wrapper">
                    <div class="payload-editor-header">
                      <span>Raw Ingested Webhook Payload (Editable before retry):</span>
                      <button class="btn btn-ghost btn-xs btn-copy-dlq-json" data-failure-id="${f.id}">
                        ${Icons.copy} Copy JSON
                      </button>
                    </div>
                    <textarea class="form-textarea dlq-payload-editor" id="editor-${f.id}" rows="6">${JSON.stringify(f.payloadParsed, null, 2)}</textarea>
                  </div>
                </div>

                <div class="failure-card-footer">
                  <div class="footer-left">
                    ${f.resolved_order_id ? `<span class="text-xs text-positive">Resolved as Order ID: <code>${f.resolved_order_id.slice(0, 8)}...</code></span>` : ''}
                  </div>
                  <div class="footer-actions">
                    ${isPending ? `
                      <button class="btn btn-primary btn-sm btn-retry-failure" data-failure-id="${f.id}">
                        ${Icons.refresh} Retry Synchronization
                      </button>
                    ` : ''}
                    ${State.user && State.user.role === 'admin' ? `
                      <button class="btn btn-ghost btn-sm btn-delete-failure" data-failure-id="${f.id}">
                        ${Icons.trash} Dismiss
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
            Showing <strong>${failures.length}</strong> of <strong>${pagination.total}</strong> DLQ records
          </div>
          <div class="pagination-controls">
            <button class="btn btn-secondary btn-xs" id="btn-dlq-prev" ${pagination.page <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span class="page-indicator">Page ${pagination.page} of ${pagination.totalPages || 1}</span>
            <button class="btn btn-secondary btn-xs" id="btn-dlq-next" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        </div>
      `;

      // Copy JSON
      wrapper.querySelectorAll('.btn-copy-dlq-json').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-failure-id');
          const val = wrapper.querySelector(`#editor-${id}`)?.value;
          if (val) {
            navigator.clipboard.writeText(val);
            Toast.success('Payload copied to clipboard!');
          }
        });
      });

      // Retry Action
      wrapper.querySelectorAll('.btn-retry-failure').forEach(btn => {
        btn.addEventListener('click', async () => {
          const failureId = btn.getAttribute('data-failure-id');
          const payloadText = wrapper.querySelector(`#editor-${failureId}`)?.value;

          try {
            btn.disabled = true;
            Toast.info(`Retrying synchronization for failure #${failureId.slice(0, 8)}...`, 'Executing Retry');
            const res = await API.retrySyncFailure(failureId, payloadText);
            Toast.success(`Synchronization resolved! Created order ${res.order.order_number}`, 'Retry Succeeded');
            this.loadFailures(container);
          } catch (err) {
            Toast.error(err.message, 'Retry Failed');
            this.loadFailures(container);
          } finally {
            btn.disabled = false;
          }
        });
      });

      // Delete Action
      wrapper.querySelectorAll('.btn-delete-failure').forEach(btn => {
        btn.addEventListener('click', async () => {
          const failureId = btn.getAttribute('data-failure-id');
          if (confirm('Dismiss and remove this DLQ record?')) {
            try {
              await API.deleteSyncFailure(failureId);
              Toast.success('DLQ record dismissed.');
              this.loadFailures(container);
            } catch (err) {
              Toast.error(err.message, 'Dismiss Failed');
            }
          }
        });
      });

      // Pagination
      wrapper.querySelector('#btn-dlq-prev')?.addEventListener('click', () => {
        if (this.filters.page > 1) {
          this.filters.page--;
          this.loadFailures(container);
        }
      });

      wrapper.querySelector('#btn-dlq-next')?.addEventListener('click', () => {
        if (this.filters.page < pagination.totalPages) {
          this.filters.page++;
          this.loadFailures(container);
        }
      });

    } catch (err) {
      wrapper.innerHTML = `
        <div class="card error-card">
          <p>Failed to query DLQ: ${err.message}</p>
        </div>
      `;
    }
  }
};

window.SyncFailuresView = SyncFailuresView;
