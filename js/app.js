/**
 * Main Application Orchestrator & Router
 * Central CRM & Multi-Store Order Synchronization
 */

const App = {
  activeView: 'dashboard',

  async init() {
    console.log('[App] Initializing CRM Application...');
    State.init();

    // Check existing session
    const token = API.getToken();
    const user = API.getUser();

    if (!token || !user) {
      this.renderLoginPortal();
      return;
    }

    if (user.role === 'customer') {
      this.renderCustomerPortalOnly(user);
    } else {
      this.renderAdminLayout();
      this.bindGlobalEvents();
      this.navigate(State.currentView || 'dashboard');
    }
  },

  // =========================================================================
  // Dedicated Login Portal View (Admin vs Customer)
  // =========================================================================
  renderLoginPortal(defaultTab = 'admin') {
    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <div class="login-portal-wrapper">
        <div class="login-portal-card">
          <div class="login-brand">
            <div class="login-logo-circle">
              <span class="logo-accent">${Icons.shopify}</span>
              <span class="logo-accent-wc">${Icons.woocommerce}</span>
            </div>
            <h2>Central CRM Hub</h2>
            <p>Unified Order Synchronization & Cold-Chain Management</p>
          </div>

          <!-- Login Mode Tabs -->
          <div class="login-tabs">
            <button class="login-tab-btn ${defaultTab === 'admin' ? 'active' : ''}" id="tab-btn-admin">
              🛡️ Administrator Login
            </button>
            <button class="login-tab-btn ${defaultTab === 'customer' ? 'active' : ''}" id="tab-btn-customer">
              📦 Customer Order Tracker
            </button>
          </div>

          <!-- Pane 1: Administrator / Staff Login -->
          <div id="pane-admin" class="login-form-pane" style="display: ${defaultTab === 'admin' ? 'block' : 'none'};">
            <form id="admin-login-form">
              <div class="form-group" style="margin-bottom: 14px;">
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">Admin Email</label>
                <input type="email" id="admin-email-input" class="form-control" placeholder="admin@crm.local" value="admin@crm.local" required style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); color: var(--text-main); font-family: inherit;">
              </div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">Password</label>
                <input type="password" id="admin-pass-input" class="form-control" placeholder="••••••••" value="admin123" required style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); color: var(--text-main); font-family: inherit;">
              </div>

              <div class="quick-credentials-bar">
                <span style="font-weight: 700; color: var(--text-muted);">Quick Demo Presets:</span>
                <div class="chips-row">
                  <button type="button" class="btn-chip" id="chip-admin">Admin: admin123</button>
                  <button type="button" class="btn-chip" id="chip-staff">Staff: staff123</button>
                  <button type="button" class="btn-chip" id="chip-master">Master Key</button>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block" id="btn-admin-submit" style="margin-top: 14px;">
                Sign In to Admin Dashboard &rarr;
              </button>
            </form>
          </div>

          <!-- Pane 2: Customer Order & Tracking Login -->
          <div id="pane-customer" class="login-form-pane" style="display: ${defaultTab === 'customer' ? 'block' : 'none'};">
            <form id="customer-login-form">
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">
                Enter the email address used during your Shopify or WooCommerce order to access your past order history and track your cold-chain shipment live:
              </p>

              <div class="form-group" style="margin-bottom: 14px;">
                <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">Customer Order Email</label>
                <input type="email" id="customer-email-input" class="form-control" placeholder="e.g. marcus.vance@techcorp.io" value="marcus.vance@techcorp.io" required style="width: 100%; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); color: var(--text-main); font-family: inherit;">
              </div>

              <div class="quick-credentials-bar">
                <span style="font-weight: 700; color: var(--text-muted);">Demo Customer Accounts:</span>
                <div class="chips-row">
                  <button type="button" class="btn-chip" id="chip-cust-1">Marcus Vance</button>
                  <button type="button" class="btn-chip" id="chip-cust-2">Elena Rostova</button>
                  <button type="button" class="btn-chip" id="chip-cust-3">David Chen</button>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block" id="btn-customer-submit" style="margin-top: 14px;">
                Track My Order & History &rarr;
              </button>
            </form>
          </div>

          <div style="margin-top: 20px; text-align: center; font-size: 0.75rem; color: var(--text-subtle);">
            🔒 Production-Ready JWT Authentication &bull; Multi-Store Cloud Ingestion
          </div>
        </div>
      </div>
    `;

    // Tab switcher events
    const tabAdmin = document.getElementById('tab-btn-admin');
    const tabCust = document.getElementById('tab-btn-customer');
    const paneAdmin = document.getElementById('pane-admin');
    const paneCust = document.getElementById('pane-customer');

    tabAdmin?.addEventListener('click', () => {
      tabAdmin.classList.add('active');
      tabCust.classList.remove('active');
      paneAdmin.style.display = 'block';
      paneCust.style.display = 'none';
    });

    tabCust?.addEventListener('click', () => {
      tabCust.classList.add('active');
      tabAdmin.classList.remove('active');
      paneCust.style.display = 'block';
      paneAdmin.style.display = 'none';
    });

    // Preset Chip handlers
    document.getElementById('chip-admin')?.addEventListener('click', () => {
      document.getElementById('admin-email-input').value = 'admin@crm.local';
      document.getElementById('admin-pass-input').value = 'admin123';
    });
    document.getElementById('chip-staff')?.addEventListener('click', () => {
      document.getElementById('admin-email-input').value = 'staff@crm.local';
      document.getElementById('admin-pass-input').value = 'staff123';
    });
    document.getElementById('chip-master')?.addEventListener('click', () => {
      document.getElementById('admin-email-input').value = 'admin@crm.internal';
      document.getElementById('admin-pass-input').value = 'AdminSecret2026!';
    });

    document.getElementById('chip-cust-1')?.addEventListener('click', () => {
      document.getElementById('customer-email-input').value = 'marcus.vance@techcorp.io';
    });
    document.getElementById('chip-cust-2')?.addEventListener('click', () => {
      document.getElementById('customer-email-input').value = 'elena.rostova@designstudio.com';
    });
    document.getElementById('chip-cust-3')?.addEventListener('click', () => {
      document.getElementById('customer-email-input').value = 'david.chen@ventures.co';
    });

    // Admin login submission
    document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email-input').value.trim();
      const password = document.getElementById('admin-pass-input').value;
      const btn = document.getElementById('btn-admin-submit');

      btn.disabled = true;
      btn.textContent = 'Authenticating Admin...';

      try {
        const res = await API.login(email, password);
        Toast.success(`Welcome back, ${res.user.name}!`, 'Authentication Success');
        this.renderAdminLayout();
        this.bindGlobalEvents();
        this.navigate('dashboard');
      } catch (err) {
        Toast.error(err.message || 'Login failed. Please check credentials.', 'Login Error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In to Admin Dashboard →';
      }
    });

    // Customer login submission
    document.getElementById('customer-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('customer-email-input').value.trim();
      const btn = document.getElementById('btn-customer-submit');

      btn.disabled = true;
      btn.textContent = 'Looking up Orders...';

      try {
        const res = await API.request('/api/auth/customer-login', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        API.setToken(res.token);
        API.setUser(res.user);
        Toast.success(`Welcome, ${res.user.name}!`, 'Customer Portal Access');
        this.renderCustomerPortalOnly(res.user);
      } catch (err) {
        Toast.error(err.message || 'Customer lookup failed.', 'Lookup Error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Track My Order & History →';
      }
    });
  },

  // =========================================================================
  // Standalone Customer Portal Interface (No Admin Navigation)
  // =========================================================================
  renderCustomerPortalOnly(user) {
    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <div style="min-height: 100vh; background: var(--bg-app); display: flex; flex-direction: column;">
        <!-- Top Navbar -->
        <header style="background: var(--bg-surface); border-bottom: 1px solid var(--border-medium); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #2d5a27; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800;">
              ${user.name ? user.name[0].toUpperCase() : 'C'}
            </div>
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">St. Benoit Customer Portal</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${user.email}</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <button class="btn btn-outline btn-sm" id="btn-customer-logout">
              ${Icons.logout || '🚪'} Sign Out
            </button>
          </div>
        </header>

        <!-- Main Body -->
        <main class="container" style="padding: 30px 20px 80px 20px; max-width: 1100px; margin: 0 auto; width: 100%; flex: 1;">
          <div id="customer-portal-content"></div>
        </main>
      </div>
    `;

    document.getElementById('btn-customer-logout')?.addEventListener('click', () => {
      this.logout();
    });

    const content = document.getElementById('customer-portal-content');
    if (content && window.CustomerPortalView) {
      CustomerPortalView.activeEmail = user.email;
      CustomerPortalView.activeName = user.name;
      CustomerPortalView.render(content);
    }
  },

  // =========================================================================
  // Full Executive Admin Dashboard Layout
  // =========================================================================
  renderAdminLayout() {
    const appEl = document.getElementById('app');
    const user = API.getUser() || { name: 'Administrator', email: 'admin@crm.local', role: 'admin' };

    appEl.innerHTML = `
      <div class="app-layout">
        <!-- Sidebar Navigation -->
        <aside class="app-sidebar" id="sidebar">
          <div class="sidebar-brand">
            <div class="brand-logo">
              <span class="logo-accent">${Icons.shopify}</span>
              <span class="logo-accent-wc">${Icons.woocommerce}</span>
            </div>
            <div class="brand-text">
              <span class="brand-name">Central CRM</span>
              <span class="brand-tagline">Multi-Store Hub</span>
            </div>
          </div>

          <!-- Store Status Indicators -->
          <div class="sidebar-store-status">
            <div class="store-status-item">
              <span class="status-indicator-dot online"></span>
              <span class="store-name">Shopify</span>
              <span class="badge badge-shopify badge-xs">Active</span>
            </div>
            <div class="store-status-item">
              <span class="status-indicator-dot online"></span>
              <span class="store-name">WooCommerce</span>
              <span class="badge badge-woocommerce badge-xs">Active</span>
            </div>
          </div>

          <!-- Main Nav Links -->
          <nav class="sidebar-nav">
            <button class="nav-item active" data-view="dashboard">
              <span class="nav-icon">${Icons.dashboard}</span>
              <span class="nav-label">Dashboard</span>
            </button>
            <button class="nav-item" data-view="orders">
              <span class="nav-icon">${Icons.orders}</span>
              <span class="nav-label">Orders</span>
            </button>
            <button class="nav-item" data-view="customers">
              <span class="nav-icon">${Icons.customers}</span>
              <span class="nav-label">Customers</span>
            </button>
            <button class="nav-item" data-view="products">
              <span class="nav-icon">${Icons.products}</span>
              <span class="nav-label">Catalogue</span>
              <span class="badge badge-subtle badge-xs">1,000+</span>
            </button>
            <button class="nav-item" data-view="sync-failures">
              <span class="nav-icon">${Icons.failures}</span>
              <span class="nav-label">Dead Letter Queue</span>
            </button>
            <button class="nav-item" data-view="customer-portal">
              <span class="nav-icon">${Icons.customers}</span>
              <span class="nav-label">Customer Portal</span>
              <span class="badge badge-shopify badge-xs">Live Tracker</span>
            </button>
            
            <div class="nav-divider"></div>
            <div class="nav-group-label">Reviewer Studio</div>

            <button class="nav-item highlight-nav" data-view="simulator">
              <span class="nav-icon">${Icons.play}</span>
              <span class="nav-label">Storefront Simulator</span>
            </button>
            <button class="nav-item" data-view="docs">
              <span class="nav-icon">${Icons.docs}</span>
              <span class="nav-label">Architecture & ERD</span>
            </button>
          </nav>

          <!-- Sidebar Footer User Card -->
          <div class="sidebar-footer">
            <div class="user-profile-card">
              <div class="user-avatar">${user.name ? user.name[0].toUpperCase() : 'A'}</div>
              <div class="user-info">
                <div class="user-name">${user.name || 'Admin User'}</div>
                <div class="user-role-badge">
                  <span class="badge badge-role-${user.role || 'admin'}">${(user.role || 'admin').toUpperCase()}</span>
                </div>
              </div>
              <button class="btn btn-ghost btn-xs btn-logout" id="btn-admin-logout-sidebar" title="Log Out of CRM">
                🚪
              </button>
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="app-main-wrapper">
          <!-- Top Header Bar -->
          <header class="app-header">
            <div class="header-left">
              <button class="mobile-menu-toggle" id="btn-mobile-menu" aria-label="Toggle Navigation">
                ${Icons.dashboard}
              </button>
              <div class="header-breadcrumb">
                <span class="text-muted">CRM</span> / <strong id="header-view-title">Dashboard</strong>
              </div>
            </div>

            <div class="header-right">
              <!-- Realtime Ingestion Status Pill -->
              <div class="header-realtime-pill" id="realtime-status-pill" title="Server-Sent Events Real-Time Connection">
                <span class="realtime-dot online"></span>
                <span class="realtime-text">Live Ingestion Stream</span>
              </div>

              <!-- Theme Toggle -->
              <button class="btn btn-icon btn-sm" id="btn-theme-toggle" title="Toggle Dark/Light Theme">
                ${State.theme === 'dark' ? Icons.sun : Icons.moon}
              </button>

              <!-- Simulator Quick Action -->
              <button class="btn btn-primary btn-sm" id="btn-header-quick-sim">
                ${Icons.play} Simulator
              </button>

              <!-- Log Out Button -->
              <button class="btn btn-outline btn-sm" id="btn-admin-logout-header" title="Log Out">
                Log Out
              </button>
            </div>
          </header>

          <!-- Dynamic View Container -->
          <main class="app-content-container" id="main-content">
            <!-- Rendered by Router -->
          </main>
        </div>
      </div>
    `;

    // Logout handlers
    document.getElementById('btn-admin-logout-sidebar')?.addEventListener('click', () => this.logout());
    document.getElementById('btn-admin-logout-header')?.addEventListener('click', () => this.logout());
  },

  logout() {
    API.setToken(null);
    API.setUser(null);
    State.user = null;
    Toast.info('You have been signed out.', 'Session Ended');
    this.renderLoginPortal();
  },

  bindGlobalEvents() {
    // Navigation clicks
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem) {
        const view = navItem.getAttribute('data-view');
        if (view) {
          this.navigate(view);
        }
      }
    });

    // Theme Toggle
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      State.toggleTheme();
      const btn = document.getElementById('btn-theme-toggle');
      if (btn) {
        btn.innerHTML = State.theme === 'dark' ? Icons.sun : Icons.moon;
      }
    });

    // Quick Simulator button in header
    document.getElementById('btn-header-quick-sim')?.addEventListener('click', () => {
      this.navigate('simulator');
    });

    // Mobile menu toggle
    document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('sidebar-mobile-open');
    });

    // Realtime events listener
    Realtime.on('order:created', (data) => {
      Toast.order(data.order, `New ${data.order.source === 'shopify' ? 'Shopify' : 'WooCommerce'} order ${data.order.source_order_number} received!`);
      if (this.activeView === 'dashboard') DashboardView.refresh();
      if (this.activeView === 'orders') OrdersView.refresh();
    });

    Realtime.on('order:updated', (data) => {
      Toast.info(`Order #${data.order.source_order_number} status updated to ${data.order.status.toUpperCase()}`, 'Order Updated');
      if (this.activeView === 'dashboard') DashboardView.refresh();
      if (this.activeView === 'orders') OrdersView.refresh();
    });

    Realtime.on('sync:failure', (data) => {
      Toast.error(`Dead Letter Queue: Failed to sync ${data.source} payload (${data.error_message})`, 'Sync Failure');
      if (this.activeView === 'sync-failures') SyncFailuresView.refresh();
    });

    Realtime.on('sync:resolved', (data) => {
      Toast.success(`Successfully retried and resolved failed event #${data.id}`, 'Sync Resolved');
      if (this.activeView === 'sync-failures') SyncFailuresView.refresh();
    });
  },

  navigate(viewName) {
    console.log(`[Router] Navigating to view: ${viewName}`);
    this.activeView = viewName;
    State.currentView = viewName;

    // Update active nav button
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update header title
    const titleEl = document.getElementById('header-view-title');
    if (titleEl) {
      const titles = {
        'dashboard': 'Dashboard & KPIs',
        'orders': 'Unified Orders Feed',
        'customers': 'Customer Directory',
        'products': 'Product Catalogue (1,000+ Items)',
        'sync-failures': 'Dead Letter Queue (DLQ)',
        'customer-portal': 'Customer Order Tracker',
        'simulator': 'Storefront Simulation Studio',
        'docs': 'System Architecture & ERD'
      };
      titleEl.textContent = titles[viewName] || 'Dashboard';
    }

    // Close mobile sidebar on navigate
    document.getElementById('sidebar')?.classList.remove('sidebar-mobile-open');

    // Mount view component
    const container = document.getElementById('main-content');
    if (!container) return;

    switch (viewName) {
      case 'dashboard':
        DashboardView.render(container);
        break;
      case 'orders':
        OrdersView.render(container);
        break;
      case 'customers':
        CustomersView.render(container);
        break;
      case 'products':
        ProductsView.render(container);
        break;
      case 'sync-failures':
        SyncFailuresView.render(container);
        break;
      case 'customer-portal':
        CustomerPortalView.render(container);
        break;
      case 'simulator':
        SimulatorView.render(container);
        break;
      case 'docs':
        DocsView.render(container);
        break;
      default:
        DashboardView.render(container);
    }
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
