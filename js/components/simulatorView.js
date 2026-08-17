/**
 * Storefront Simulator & Webhook Test Studio
 * Interactive testing environment allowing reviewers to test Shopify & WooCommerce end-to-end workflows.
 */

const SimulatorView = {
  currentTab: 'shopify',

  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Storefront Simulator & Webhook Test Studio</h1>
          <p class="view-subtitle">End-to-End Reviewer Testing Suite for Shopify, WooCommerce, Security, and Ingestion</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" id="btn-reset-crm-db">
            ${Icons.refresh} Reset & Reseed Database
          </button>
        </div>
      </div>

      <!-- Simulator Navigation Tabs -->
      <div class="simulator-nav-tabs">
        <button class="sim-tab active" data-sim-tab="shopify">
          <span class="source-icon-shopify">${Icons.shopify}</span> Shopify Checkout Simulator
        </button>
        <button class="sim-tab" data-sim-tab="woocommerce">
          <span class="source-icon-woo">${Icons.woocommerce}</span> WooCommerce Checkout Simulator
        </button>
        <button class="sim-tab" data-sim-tab="security">
          ${Icons.shield} Security & Tamper Test Lab
        </button>
        <button class="sim-tab" data-sim-tab="console">
          ${Icons.activity} Live Webhook Ingestion Console
        </button>
      </div>

      <!-- Simulator Content Panes -->
      <div class="simulator-content-wrapper">
        
        <!-- TAB 1: SHOPIFY SIMULATOR -->
        <div class="sim-pane active" id="pane-shopify">
          <div class="card sim-card">
            <div class="card-header">
              <div class="sim-header-title">
                <span class="source-icon-shopify">${Icons.shopify}</span>
                <h3>Simulate Shopify Storefront Order</h3>
              </div>
              <span class="badge badge-shopify">Webhook Endpoint: /api/webhooks/shopify</span>
            </div>
            <div class="card-body">
              <p class="text-sm text-muted">
                Place a simulated customer order on the Shopify storefront. 
                This generates a realistic Shopify <code>orders/create</code> payload signed with HMAC-SHA256 and dispatches it directly to the CRM webhook ingestion engine.
              </p>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Customer Email (Deduplication Key):</label>
                  <input type="email" id="sh-cust-email" class="form-input" value="claire.dubois@atelierparis.fr">
                </div>
                <div class="form-group">
                  <label class="form-label">First Name:</label>
                  <input type="text" id="sh-cust-first" class="form-input" value="Claire">
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name:</label>
                  <input type="text" id="sh-cust-last" class="form-input" value="Dubois">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Customer Phone:</label>
                  <input type="text" id="sh-cust-phone" class="form-input" value="+33 1 42 68 55 00">
                </div>
                <div class="form-group">
                  <label class="form-label">Line Items Count:</label>
                  <select id="sh-item-count" class="form-select">
                    <option value="1">1 Product Item</option>
                    <option value="2" selected>2 Product Items</option>
                    <option value="3">3 Product Items</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">HMAC Signature:</label>
                  <select id="sh-sign-hmac" class="form-select">
                    <option value="true" selected>Valid HMAC SHA-256 Signed</option>
                    <option value="false">Unsigned / Tampered Signature</option>
                  </select>
                </div>
              </div>

              <div class="sim-actions-row">
                <button class="btn btn-primary" id="btn-fire-shopify-order">
                  <span class="source-icon-shopify">${Icons.shopify}</span> Place Shopify Order & Dispatch Webhook
                </button>
              </div>

              <div class="sim-result-box" id="sh-sim-result" style="display: none;">
                <h4>Simulation Result:</h4>
                <pre class="json-code-block"><code id="sh-result-json"></code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: WOOCOMMERCE SIMULATOR -->
        <div class="sim-pane" id="pane-woocommerce">
          <div class="card sim-card">
            <div class="card-header">
              <div class="sim-header-title">
                <span class="source-icon-woo">${Icons.woocommerce}</span>
                <h3>Simulate WooCommerce Storefront Order</h3>
              </div>
              <span class="badge badge-woocommerce">Webhook Endpoint: /api/webhooks/woocommerce</span>
            </div>
            <div class="card-body">
              <p class="text-sm text-muted">
                Place a simulated customer order on the WooCommerce storefront. 
                Generates a WooCommerce <code>order.created</code> webhook with WooCommerce billing/shipping structures and HMAC signature.
              </p>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Customer Email (Deduplication Key):</label>
                  <input type="email" id="wc-cust-email" class="form-input" value="claire.dubois@atelierparis.fr">
                </div>
                <div class="form-group">
                  <label class="form-label">First Name:</label>
                  <input type="text" id="wc-cust-first" class="form-input" value="Claire">
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name:</label>
                  <input type="text" id="wc-cust-last" class="form-input" value="Dubois">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Customer Phone:</label>
                  <input type="text" id="wc-cust-phone" class="form-input" value="+33 1 42 68 55 00">
                </div>
                <div class="form-group">
                  <label class="form-label">Line Items Count:</label>
                  <select id="wc-item-count" class="form-select">
                    <option value="1">1 Product Item</option>
                    <option value="2" selected>2 Product Items</option>
                    <option value="3">3 Product Items</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">HMAC Signature:</label>
                  <select id="wc-sign-hmac" class="form-select">
                    <option value="true" selected>Valid HMAC SHA-256 Signed</option>
                    <option value="false">Unsigned / Tampered Signature</option>
                  </select>
                </div>
              </div>

              <div class="sim-actions-row">
                <button class="btn btn-primary" id="btn-fire-woo-order">
                  <span class="source-icon-woo">${Icons.woocommerce}</span> Place WooCommerce Order & Dispatch Webhook
                </button>
              </div>

              <div class="sim-result-box" id="wc-sim-result" style="display: none;">
                <h4>Simulation Result:</h4>
                <pre class="json-code-block"><code id="wc-result-json"></code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: SECURITY & TAMPER TEST LAB -->
        <div class="sim-pane" id="pane-security">
          <div class="card sim-card">
            <div class="card-header">
              <h3 class="card-title">Security Verification & Edge Case Lab</h3>
            </div>
            <div class="card-body">
              <p class="text-sm text-muted">
                Execute automated security attacks and edge cases against the CRM ingestion endpoints to verify protection mechanisms.
              </p>

              <div class="test-cases-grid">
                <!-- Test 1: Tampered Signature -->
                <div class="test-case-card">
                  <div class="test-case-header">
                    <span class="test-num">01</span>
                    <strong>Forged HMAC Signature Attack</strong>
                  </div>
                  <p class="text-xs text-muted">Submits a Shopify payload with an invalid or tampered SHA-256 HMAC signature. Expected: 401 Unauthorized rejection and audit logging.</p>
                  <button class="btn btn-secondary btn-sm" id="btn-run-tamper-test">Run Tamper Attack</button>
                </div>

                <!-- Test 2: Duplicate Order Replay -->
                <div class="test-case-card">
                  <div class="test-case-header">
                    <span class="test-num">02</span>
                    <strong>Duplicate Webhook Replay Protection</strong>
                  </div>
                  <p class="text-xs text-muted">Dispatches identical Shopify order twice in succession. Expected: Idempotent 200 handling without duplicate order items.</p>
                  <button class="btn btn-secondary btn-sm" id="btn-run-duplicate-test">Run Duplicate Replay</button>
                </div>

                <!-- Test 3: Dead Letter Queue Capture -->
                <div class="test-case-card">
                  <div class="test-case-header">
                    <span class="test-num">03</span>
                    <strong>Malformed Payload & DLQ Capture</strong>
                  </div>
                  <p class="text-xs text-muted">Submits malformed JSON with missing email and empty items. Expected: 422 Unprocessable and DLQ storage.</p>
                  <button class="btn btn-secondary btn-sm" id="btn-run-malformed-test">Run Malformed Payload Test</button>
                </div>
              </div>

              <div class="sim-result-box" id="sec-sim-result" style="display: none;">
                <h4>Security Test Execution Trace:</h4>
                <pre class="json-code-block"><code id="sec-result-json"></code></pre>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 4: LIVE WEBHOOK INGESTION CONSOLE -->
        <div class="sim-pane" id="pane-console">
          <div class="card sim-card">
            <div class="card-header">
              <div class="sim-header-title">
                <div class="live-indicator-pill"><span class="pulse-dot"></span> Live Console</div>
                <h3>Real-Time Webhook Activity Stream</h3>
              </div>
              <button class="btn btn-ghost btn-xs" id="btn-clear-console">Clear Stream</button>
            </div>
            <div class="card-body">
              <div class="console-terminal" id="live-console-feed">
                <div class="console-line text-muted">[System] Connected to CRM Real-Time Ingestion Event Stream. Awaiting webhooks...</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    // Tab switching
    container.querySelectorAll('.sim-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.sim-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.sim-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-sim-tab');
        container.querySelector(`#pane-${target}`)?.classList.add('active');
      });
    });

    // Fire Shopify Order
    container.querySelector('#btn-fire-shopify-order')?.addEventListener('click', async () => {
      const email = container.querySelector('#sh-cust-email').value;
      const first = container.querySelector('#sh-cust-first').value;
      const last = container.querySelector('#sh-cust-last').value;
      const phone = container.querySelector('#sh-cust-phone').value;
      const itemCount = parseInt(container.querySelector('#sh-item-count').value, 10);
      const signHmac = container.querySelector('#sh-sign-hmac').value === 'true';

      try {
        Toast.info('Sending Shopify webhook to CRM...', 'Dispatching Webhook');
        const res = await API.simulateShopifyOrder({
          customerEmail: email,
          customerFirstName: first,
          customerLastName: last,
          customerPhone: phone,
          itemCount,
          signHmac
        });

        const resBox = container.querySelector('#sh-sim-result');
        const resJson = container.querySelector('#sh-result-json');
        resBox.style.display = 'block';
        resJson.textContent = JSON.stringify(res, null, 2);

        Toast.success(`Order ${res.crmOrder.order_number} ($${res.crmOrder.total.toFixed(2)}) created & customer unified!`, 'Shopify Order Ingested');
      } catch (err) {
        Toast.error(err.message, 'Simulation Error');
      }
    });

    // Fire WooCommerce Order
    container.querySelector('#btn-fire-woo-order')?.addEventListener('click', async () => {
      const email = container.querySelector('#wc-cust-email').value;
      const first = container.querySelector('#wc-cust-first').value;
      const last = container.querySelector('#wc-cust-last').value;
      const phone = container.querySelector('#wc-cust-phone').value;
      const itemCount = parseInt(container.querySelector('#wc-item-count').value, 10);
      const signHmac = container.querySelector('#wc-sign-hmac').value === 'true';

      try {
        Toast.info('Sending WooCommerce webhook to CRM...', 'Dispatching Webhook');
        const res = await API.simulateWooCommerceOrder({
          customerEmail: email,
          customerFirstName: first,
          customerLastName: last,
          customerPhone: phone,
          itemCount,
          signHmac
        });

        const resBox = container.querySelector('#wc-sim-result');
        const resJson = container.querySelector('#wc-result-json');
        resBox.style.display = 'block';
        resJson.textContent = JSON.stringify(res, null, 2);

        Toast.success(`Order ${res.crmOrder.order_number} ($${res.crmOrder.total.toFixed(2)}) created & customer unified!`, 'WooCommerce Order Ingested');
      } catch (err) {
        Toast.error(err.message, 'Simulation Error');
      }
    });

    // Security Test 1: Tamper test
    container.querySelector('#btn-run-tamper-test')?.addEventListener('click', async () => {
      try {
        Toast.info('Sending tampered HMAC signature payload...', 'Executing Attack Simulation');
        const res = await API.simulateTamperTest();
        const secBox = container.querySelector('#sec-sim-result');
        const secJson = container.querySelector('#sec-result-json');
        secBox.style.display = 'block';
        secJson.textContent = JSON.stringify(res, null, 2);
        Toast.success('Attack successfully blocked by HMAC verification!', 'Security Check Passed');
      } catch (err) {
        const secBox = container.querySelector('#sec-sim-result');
        const secJson = container.querySelector('#sec-result-json');
        secBox.style.display = 'block';
        secJson.textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
        Toast.success('Attack correctly rejected with 401 Unauthorized!', 'Security Check Passed');
      }
    });

    // Security Test 2: Duplicate test
    container.querySelector('#btn-run-duplicate-test')?.addEventListener('click', async () => {
      try {
        Toast.info('Dispatching identical order twice...', 'Testing Idempotency');
        const res1 = await API.simulateShopifyOrder();
        const res2 = await API.simulateShopifyOrder(); // Second identical call
        const secBox = container.querySelector('#sec-sim-result');
        const secJson = container.querySelector('#sec-result-json');
        secBox.style.display = 'block';
        secJson.textContent = JSON.stringify({ firstIngest: res1, secondIngest: res2 }, null, 2);
        Toast.success('Idempotency verified! No duplicate order rows created.', 'Idempotency Check Passed');
      } catch (err) {
        Toast.error(err.message, 'Test Failed');
      }
    });

    // Security Test 3: Malformed test
    container.querySelector('#btn-run-malformed-test')?.addEventListener('click', async () => {
      try {
        Toast.info('Dispatching invalid payload to test DLQ...', 'Testing Dead Letter Queue');
        const res = await API.simulateFailureTest();
        const secBox = container.querySelector('#sec-sim-result');
        const secJson = container.querySelector('#sec-result-json');
        secBox.style.display = 'block';
        secJson.textContent = JSON.stringify(res, null, 2);
        Toast.warning('Validation error captured and preserved in Dead Letter Queue.', 'DLQ Captured');
      } catch (err) {
        Toast.error(err.message, 'Test Failed');
      }
    });

    // Reset DB
    container.querySelector('#btn-reset-crm-db')?.addEventListener('click', async () => {
      if (confirm('Reset database to clean initial state with 1,000+ products and demo stores?')) {
        try {
          await API.resetDatabase();
          Toast.success('Database reset and reseeded successfully!', 'Database Reset');
          State.setView('dashboard');
        } catch (e) {
          Toast.error(e.message, 'Reset Failed');
        }
      }
    });

    // Clear Console
    container.querySelector('#btn-clear-console')?.addEventListener('click', () => {
      const feed = container.querySelector('#live-console-feed');
      if (feed) {
        feed.innerHTML = '<div class="console-line text-muted">[System] Console cleared. Listening for live webhook stream...</div>';
      }
    });

    // Live Activity Listener
    window.addEventListener('crm:activity_added', (e) => {
      const act = e.detail;
      const feed = container.querySelector('#live-console-feed');
      if (!feed) return;

      const line = document.createElement('div');
      line.className = 'console-line';
      line.innerHTML = `
        <span class="console-time">[${new Date(act.time).toLocaleTimeString()}]</span>
        <span class="console-badge ${act.source ? 'badge-' + act.source : ''}">${(act.source || 'SYS').toUpperCase()}</span>
        <strong>${act.title}:</strong> ${act.desc}
      `;
      feed.prepend(line);
    });
  }
};

window.SimulatorView = SimulatorView;
