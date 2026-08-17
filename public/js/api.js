/**
 * Central API Client for CRM
 */

const API = {
  getToken() {
    return localStorage.getItem('crm_auth_token') || '';
  },

  setToken(token) {
    if (token) localStorage.setItem('crm_auth_token', token);
    else localStorage.removeItem('crm_auth_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('crm_user_data')) || null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('crm_user_data', JSON.stringify(user));
    else localStorage.removeItem('crm_user_data');
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : endpoint;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
        console.warn('[API] Session expired or unauthorized.');
        this.setToken(null);
        this.setUser(null);
        window.dispatchEvent(new CustomEvent('crm:auth_expired'));
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  async login(email, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    this.setUser(res.user);
    return res;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.setToken(null);
    this.setUser(null);
  },

  async getMe() {
    return this.request('/api/auth/me');
  },

  // Dashboard Analytics
  async getDashboardAnalytics() {
    return this.request('/api/analytics/dashboard');
  },

  // Orders Endpoints
  async getOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/orders${qs ? '?' + qs : ''}`);
  },

  async getOrder(id) {
    return this.request(`/api/orders/${id}`);
  },

  async updateOrderStatus(id, status) {
    return this.request(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async deleteOrder(id) {
    return this.request(`/api/orders/${id}`, {
      method: 'DELETE'
    });
  },

  // Customers Endpoints
  async getCustomers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/customers${qs ? '?' + qs : ''}`);
  },

  async getCustomer(id) {
    return this.request(`/api/customers/${id}`);
  },

  async updateCustomer(id, data) {
    return this.request(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async mergeCustomers(sourceCustomerId, targetCustomerId) {
    return this.request('/api/customers/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceCustomerId, targetCustomerId })
    });
  },

  // Products Endpoints
  async getProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/products${qs ? '?' + qs : ''}`);
  },

  async getProduct(id) {
    return this.request(`/api/products/${id}`);
  },

  async updateProductStock(id, quantity) {
    return this.request(`/api/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity })
    });
  },

  async createProduct(data) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Dead Letter Queue / Sync Failures
  async getSyncFailures(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/sync-failures${qs ? '?' + qs : ''}`);
  },

  async getSyncFailure(id) {
    return this.request(`/api/sync-failures/${id}`);
  },

  async retrySyncFailure(id, payload = null) {
    return this.request(`/api/sync-failures/${id}/retry`, {
      method: 'POST',
      body: JSON.stringify({ payload })
    });
  },

  async deleteSyncFailure(id) {
    return this.request(`/api/sync-failures/${id}`, {
      method: 'DELETE'
    });
  },

  // Store Simulator Endpoints
  async simulateShopifyOrder(data = {}) {
    return this.request('/api/simulator/shopify-order', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async simulateWooCommerceOrder(data = {}) {
    return this.request('/api/simulator/woocommerce-order', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async simulateTamperTest() {
    return this.request('/api/simulator/tamper-test', {
      method: 'POST'
    });
  },

  async simulateFailureTest() {
    return this.request('/api/simulator/failure-test', {
      method: 'POST'
    });
  },

  async resetDatabase() {
    return this.request('/api/simulator/reset-database', {
      method: 'POST'
    });
  }
};

window.API = API;
