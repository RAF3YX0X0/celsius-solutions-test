/**
 * Global Application State & Reactive Event Bus
 */

const State = {
  user: API.getUser(),
  currentView: 'dashboard',
  theme: localStorage.getItem('crm_theme') || 'dark',
  sseConnected: false,
  eventSource: null,
  activeOrderDrawer: null,
  activeCustomerDrawer: null,
  
  // Real-time live activity log
  liveActivities: [],

  init() {
    this.applyTheme(this.theme);
    this.initSSE();
  },

  setUser(user) {
    this.user = user;
    API.setUser(user);
    window.dispatchEvent(new CustomEvent('crm:state_change', { detail: { key: 'user', value: user } }));
  },

  setView(viewName) {
    this.currentView = viewName;
    window.dispatchEvent(new CustomEvent('crm:state_change', { detail: { key: 'view', value: viewName } }));
  },

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('crm_theme', this.theme);
    this.applyTheme(this.theme);
    window.dispatchEvent(new CustomEvent('crm:state_change', { detail: { key: 'theme', value: this.theme } }));
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },

  initSSE() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        this.sseConnected = true;
        window.dispatchEvent(new CustomEvent('crm:sse_status', { detail: { connected: true } }));
      };

      this.eventSource.onerror = () => {
        this.sseConnected = false;
        window.dispatchEvent(new CustomEvent('crm:sse_status', { detail: { connected: false } }));
      };

      // Listen for incoming order creations
      this.eventSource.addEventListener('order_created', (e) => {
        const data = JSON.parse(e.data);
        this.addActivity({
          type: 'order_created',
          title: `New ${data.source.toUpperCase()} Order Ingested`,
          desc: `${data.order.order_number} for $${data.order.total.toFixed(2)} (${data.order.customer_email})`,
          source: data.source,
          time: new Date()
        });
        Toast.success(`Order ${data.order.order_number} ($${data.order.total.toFixed(2)}) synced from ${data.source.toUpperCase()}`, 'New Order Ingested');
        window.dispatchEvent(new CustomEvent('crm:refresh_data'));
      });

      // Listen for order status updates & two-way sync
      this.eventSource.addEventListener('order_updated', (e) => {
        const data = JSON.parse(e.data);
        this.addActivity({
          type: 'order_updated',
          title: `Order Status Updated`,
          desc: `${data.updatedOrder.order_number} is now ${data.newStatus.toUpperCase()}`,
          source: data.updatedOrder.source,
          time: new Date()
        });
        window.dispatchEvent(new CustomEvent('crm:refresh_data'));
      });

      // Listen for sync failures
      this.eventSource.addEventListener('sync_failure_logged', (e) => {
        const data = JSON.parse(e.data);
        this.addActivity({
          type: 'sync_failure',
          title: `Sync Validation Alert (${data.source.toUpperCase()})`,
          desc: data.errorMessage,
          source: data.source,
          time: new Date()
        });
        Toast.warning(`Sync issue logged in Dead Letter Queue: ${data.errorMessage}`, 'Sync Validation Alert');
        window.dispatchEvent(new CustomEvent('crm:refresh_data'));
      });

      // Listen for sync resolutions
      this.eventSource.addEventListener('sync_failure_resolved', (e) => {
        const data = JSON.parse(e.data);
        Toast.success(`Failure #${data.failureId.slice(0, 8)} resolved as ${data.orderNumber}`, 'DLQ Item Resolved');
        window.dispatchEvent(new CustomEvent('crm:refresh_data'));
      });

    } catch (e) {
      console.warn('[SSE] EventSource initialization failed:', e);
    }
  },

  addActivity(activity) {
    this.liveActivities.unshift(activity);
    if (this.liveActivities.length > 25) {
      this.liveActivities.pop();
    }
    window.dispatchEvent(new CustomEvent('crm:activity_added', { detail: activity }));
  }
};

window.State = State;
