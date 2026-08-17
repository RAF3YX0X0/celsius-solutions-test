/**
 * Universal Client API & Data Layer for Central CRM
 * Dual-Mode: Pure-Client Instant Simulator + Supabase / REST Backend Connectable
 */

(function() {
  // Seed 1,000 realistic organic dairy products in client memory
  const sampleProducts = [
    { id: 'prod_1', sku: 'STB-RAW-0001', name: 'Raw Unpasteurized Whole Milk - Heritage Batch 1', category: 'Raw & Unpasteurized', price: 29.99, sale_price: 27.99, stock_quantity: 45, image_url: '/assets/images/prod_raw_milk.jpg', description: 'Fresh 100% pasture-grazed raw milk bottled in returnable glass bottles.' },
    { id: 'prod_2', sku: 'STB-FUL-0002', name: 'Barista Reserve Full Cream Milk - Batch 2', category: 'Full Cream', price: 19.99, sale_price: 18.50, stock_quantity: 120, image_url: '/assets/images/prod_full_cream.jpg', description: 'Cream-rich whole milk tailored for barista micro-foam.' },
    { id: 'prod_3', sku: 'STB-FUL-0003', name: 'Farmhouse Gold Extra Creamy Milk - Batch 3', category: 'Full Cream', price: 21.99, sale_price: null, stock_quantity: 85, image_url: '/assets/images/prod_farmhouse_gold.jpg', description: 'Golden Guernsey heirloom breed whole milk with rich butterfat.' },
    { id: 'prod_4', sku: 'STB-KEF-0004', name: 'Traditional Cultured Whole Milk Kefir - Batch 4', category: 'Kefir & Cultures', price: 19.99, sale_price: 17.99, stock_quantity: 60, image_url: '/assets/images/prod_milk_kefir.jpg', description: 'Fermented live probiotic kefir with 12 beneficial cultures.' },
    { id: 'prod_5', sku: 'STB-ORG-0005', name: 'Certified Organic Pasture Green Milk - Batch 5', category: 'Organic Pasture', price: 19.99, sale_price: null, stock_quantity: 95, image_url: '/assets/images/prod_organic_green.jpg', description: 'USDA Organic whole milk from certified clover pastures.' },
    { id: 'prod_6', sku: 'STB-ORG-0006', name: 'Non-Homogenized Natural Cream-on-Top Milk - Batch 6', category: 'Organic Pasture', price: 22.99, sale_price: 19.99, stock_quantity: 40, image_url: '/assets/images/prod_cream_top.jpg', description: 'Natural non-homogenized milk with thick sweet cream layer.' }
  ];

  const catKeys = ['Raw & Unpasteurized', 'Full Cream', 'Kefir & Cultures', 'Organic Pasture', 'Flavoured Milk', 'Artisan Creamery'];
  const allProducts = [...sampleProducts];

  for (let i = 7; i <= 1000; i++) {
    const cat = catKeys[(i - 1) % catKeys.length];
    allProducts.push({
      id: 'prod_' + i,
      sku: `STB-${cat.slice(0,3).toUpperCase()}-${String(i).padStart(4, '0')}`,
      name: `${cat} Pasture Reserve Harvest #${i}`,
      category: cat,
      price: parseFloat((16.99 + ((i % 20) * 0.75)).toFixed(2)),
      sale_price: i % 5 === 0 ? parseFloat((14.99 + ((i % 15) * 0.65)).toFixed(2)) : null,
      stock_quantity: 20 + ((i * 7) % 200),
      image_url: sampleProducts[(i - 1) % sampleProducts.length].image_url,
      description: `Premium pasture-raised ${cat} bottled fresh directly on farm.`
    });
  }

  // Initial Seed Data for Customers & Orders
  const initialCustomers = [
    { id: 'cust_1', email: 'marcus.vance@techcorp.io', first_name: 'Marcus', last_name: 'Vance', phone: '+1 (555) 302-8819', total_spent: 348.50, orders_count: 3, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'cust_2', email: 'elena.rostova@designstudio.com', first_name: 'Elena', last_name: 'Rostova', phone: '+1 (555) 441-2099', total_spent: 189.90, orders_count: 2, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'cust_3', email: 'david.chen@ventures.co', first_name: 'David', last_name: 'Chen', phone: '+1 (555) 882-1044', total_spent: 89.97, orders_count: 1, created_at: new Date(Date.now() - 86400000 * 1).toISOString() }
  ];

  const initialOrders = [
    {
      id: 'ord_1',
      order_number: 'SH-8821',
      source: 'shopify',
      customer_id: 'cust_1',
      customer_name: 'Marcus Vance',
      customer_email: 'marcus.vance@techcorp.io',
      status: 'processing',
      payment_status: 'paid',
      subtotal: 59.98,
      tax: 4.80,
      shipping: 0,
      total: 64.78,
      currency: 'USD',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      items: [
        { id: 'item_1', title: 'Cold Pressed Raw Milk', sku: 'STB-RAW-0001', quantity: 2, price: 29.99, total: 59.98 }
      ]
    },
    {
      id: 'ord_2',
      order_number: 'WC-4490',
      source: 'woocommerce',
      customer_id: 'cust_2',
      customer_name: 'Elena Rostova',
      customer_email: 'elena.rostova@designstudio.com',
      status: 'completed',
      payment_status: 'paid',
      subtotal: 39.98,
      tax: 3.20,
      shipping: 0,
      total: 43.18,
      currency: 'USD',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      items: [
        { id: 'item_2', title: 'Barista Reserve Full Cream Milk', sku: 'STB-FUL-0002', quantity: 2, price: 19.99, total: 39.98 }
      ]
    },
    {
      id: 'ord_3',
      order_number: 'WC-1029',
      source: 'woocommerce',
      customer_id: 'cust_3',
      customer_name: 'David Chen',
      customer_email: 'david.chen@ventures.co',
      status: 'processing',
      payment_status: 'paid',
      subtotal: 19.99,
      tax: 1.60,
      shipping: 0,
      total: 21.59,
      currency: 'USD',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      items: [
        { id: 'item_3', title: 'Traditional Cultured Whole Milk Kefir', sku: 'STB-KEF-0004', quantity: 1, price: 19.99, total: 19.99 }
      ]
    }
  ];

  // Local state persistence
  function getStored(key, defaultVal) {
    try {
      const v = localStorage.getItem('crm_local_' + key);
      return v ? JSON.parse(v) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function setStored(key, val) {
    try {
      localStorage.setItem('crm_local_' + key, JSON.stringify(val));
    } catch (e) {}
  }

  let stateCustomers = getStored('customers', initialCustomers);
  let stateOrders = getStored('orders', initialOrders);
  let stateProducts = getStored('products', allProducts);
  let stateFailures = getStored('failures', [
    { id: 'fail_1', source: 'shopify', external_order_id: 'sh_err_9901', error_message: 'HMAC Signature verification failed (Invalid Webhook Secret)', status: 'pending', retry_count: 1, created_at: new Date(Date.now() - 3600000 * 4).toISOString() }
  ]);

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

    async login(email, password) {
      const e = (email || '').toLowerCase().trim();
      let role = 'admin';
      let name = 'Alexander Wright';

      if (e.includes('staff')) {
        role = 'staff';
        name = 'Sarah Jenkins';
      } else if (e.includes('master') || e === 'admin@crm.internal') {
        role = 'admin';
        name = 'Master Systems Admin';
      } else if (e.split('@')[0]) {
        name = e.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      const user = { id: 'usr_' + Date.now(), name, email: e, role };
      const token = 'jwt_mock_token_' + Date.now();

      this.setToken(token);
      this.setUser(user);
      return { success: true, token, user };
    },

    async logout() {
      this.setToken(null);
      this.setUser(null);
    },

    async getMe() {
      return { user: this.getUser() };
    },

    async getDashboardAnalytics() {
      const orders = stateOrders;
      const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
      const totalOrders = orders.length;
      const totalCustomers = stateCustomers.length;
      const pendingSyncs = stateFailures.filter(f => f.status === 'pending').length;

      const shopifyOrders = orders.filter(o => o.source === 'shopify').length;
      const wooOrders = orders.filter(o => o.source === 'woocommerce').length;

      return {
        summary: {
          totalRevenue,
          totalOrders,
          totalCustomers,
          pendingSyncs,
          shopifyOrders,
          wooOrders
        },
        recentOrders: orders.slice(0, 5)
      };
    },

    async getOrders(params = {}) {
      let list = [...stateOrders];
      if (params.status && params.status !== 'all') {
        list = list.filter(o => o.status === params.status);
      }
      if (params.source && params.source !== 'all') {
        list = list.filter(o => o.source === params.source);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        list = list.filter(o => o.order_number.toLowerCase().includes(q) || (o.customer_name && o.customer_name.toLowerCase().includes(q)) || (o.customer_email && o.customer_email.toLowerCase().includes(q)));
      }
      return {
        orders: list,
        total: list.length,
        page: 1,
        limit: 50
      };
    },

    async getOrder(id) {
      const order = stateOrders.find(o => o.id === id || o.order_number === id);
      if (!order) throw new Error('Order not found');
      return { order };
    },

    async updateOrderStatus(id, status) {
      const order = stateOrders.find(o => o.id === id);
      if (order) {
        order.status = status;
        setStored('orders', stateOrders);
        if (window.Realtime) Realtime.emit('order:updated', { order });
      }
      return { success: true, order };
    },

    async getCustomers(params = {}) {
      let list = [...stateCustomers];
      if (params.search) {
        const q = params.search.toLowerCase();
        list = list.filter(c => c.email.toLowerCase().includes(q) || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q));
      }
      return {
        customers: list,
        total: list.length,
        page: 1,
        limit: 50
      };
    },

    async getProducts(params = {}) {
      let list = [...stateProducts];
      if (params.category && params.category !== 'all') {
        list = list.filter(p => p.category.toLowerCase().includes(params.category.toLowerCase()));
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
      }
      const page = parseInt(params.page, 10) || 1;
      const limit = parseInt(params.limit, 10) || 20;
      const start = (page - 1) * limit;

      return {
        products: list.slice(start, start + limit),
        total: list.length,
        page,
        totalPages: Math.ceil(list.length / limit)
      };
    },

    async getSyncFailures() {
      return {
        failures: stateFailures,
        total: stateFailures.length
      };
    },

    async retrySyncFailure(id) {
      const fail = stateFailures.find(f => f.id === id);
      if (fail) {
        fail.status = 'resolved';
        setStored('failures', stateFailures);
        if (window.Realtime) Realtime.emit('sync:resolved', { id });
      }
      return { success: true };
    },

    async simulateShopifyOrder(data = {}) {
      const id = 'ord_' + Date.now();
      const num = '#SH-' + Math.floor(1000 + Math.random() * 9000);
      const custEmail = data.email || 'marcus.vance@techcorp.io';
      const custName = data.name || 'Marcus Vance';

      const newOrder = {
        id,
        order_number: num,
        source: 'shopify',
        customer_id: 'cust_1',
        customer_name: custName,
        customer_email: custEmail,
        status: 'processing',
        payment_status: 'paid',
        subtotal: 59.98,
        tax: 4.80,
        shipping: 0,
        total: 64.78,
        currency: 'USD',
        created_at: new Date().toISOString(),
        items: [
          { id: 'item_' + Date.now(), title: 'Cold Pressed Raw Milk', sku: 'STB-RAW-0001', quantity: 2, price: 29.99, total: 59.98 }
        ]
      };

      stateOrders.unshift(newOrder);
      setStored('orders', stateOrders);

      // Deduplicate/update customer
      let cust = stateCustomers.find(c => c.email.toLowerCase() === custEmail.toLowerCase());
      if (cust) {
        cust.orders_count = (cust.orders_count || 1) + 1;
        cust.total_spent = (cust.total_spent || 0) + 64.78;
      } else {
        cust = { id: 'cust_' + Date.now(), email: custEmail, first_name: custName.split(' ')[0], last_name: custName.split(' ')[1] || '', phone: '+1 555-0192', total_spent: 64.78, orders_count: 1, created_at: new Date().toISOString() };
        stateCustomers.unshift(cust);
      }
      setStored('customers', stateCustomers);

      if (window.Realtime) Realtime.emit('order:created', { order: newOrder });
      return { success: true, order: newOrder };
    },

    async simulateWooCommerceOrder(data = {}) {
      const id = 'ord_' + Date.now();
      const num = '#WC-' + Math.floor(1000 + Math.random() * 9000);
      const custEmail = data.email || 'elena.rostova@designstudio.com';
      const custName = data.name || 'Elena Rostova';

      const newOrder = {
        id,
        order_number: num,
        source: 'woocommerce',
        customer_id: 'cust_2',
        customer_name: custName,
        customer_email: custEmail,
        status: 'processing',
        payment_status: 'paid',
        subtotal: 39.98,
        tax: 3.20,
        shipping: 0,
        total: 43.18,
        currency: 'USD',
        created_at: new Date().toISOString(),
        items: [
          { id: 'item_' + Date.now(), title: 'Barista Reserve Full Cream Milk', sku: 'STB-FUL-0002', quantity: 2, price: 19.99, total: 39.98 }
        ]
      };

      stateOrders.unshift(newOrder);
      setStored('orders', stateOrders);

      let cust = stateCustomers.find(c => c.email.toLowerCase() === custEmail.toLowerCase());
      if (cust) {
        cust.orders_count = (cust.orders_count || 1) + 1;
        cust.total_spent = (cust.total_spent || 0) + 43.18;
      } else {
        cust = { id: 'cust_' + Date.now(), email: custEmail, first_name: custName.split(' ')[0], last_name: custName.split(' ')[1] || '', phone: '+1 555-4412', total_spent: 43.18, orders_count: 1, created_at: new Date().toISOString() };
        stateCustomers.unshift(cust);
      }
      setStored('customers', stateCustomers);

      if (window.Realtime) Realtime.emit('order:created', { order: newOrder });
      return { success: true, order: newOrder };
    },

    async simulateTamperTest() {
      const fail = {
        id: 'fail_' + Date.now(),
        source: 'shopify',
        external_order_id: 'sh_tampered_' + Date.now(),
        error_message: '401 Unauthorized: HMAC SHA-256 header does not match calculated signature',
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      };
      stateFailures.unshift(fail);
      setStored('failures', stateFailures);
      if (window.Realtime) Realtime.emit('sync:failure', fail);
      return { success: true, failure: fail };
    },

    async simulateFailureTest() {
      const fail = {
        id: 'fail_' + Date.now(),
        source: 'woocommerce',
        external_order_id: 'wc_fail_' + Date.now(),
        error_message: '504 Gateway Timeout: WooCommerce Webhook receiver timed out after 5000ms',
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      };
      stateFailures.unshift(fail);
      setStored('failures', stateFailures);
      if (window.Realtime) Realtime.emit('sync:failure', fail);
      return { success: true, failure: fail };
    },

    async resetDatabase() {
      stateCustomers = [...initialCustomers];
      stateOrders = [...initialOrders];
      stateProducts = [...allProducts];
      stateFailures = [];
      setStored('customers', stateCustomers);
      setStored('orders', stateOrders);
      setStored('products', stateProducts);
      setStored('failures', stateFailures);
      return { success: true };
    },

    async request(endpoint, options = {}) {
      if (endpoint === '/api/auth/login') {
        const body = JSON.parse(options.body || '{}');
        return this.login(body.email, body.password);
      }
      if (endpoint === '/api/auth/customer-login') {
        const body = JSON.parse(options.body || '{}');
        const email = (body.email || '').toLowerCase().trim();
        const user = { id: 'cust_' + Date.now(), name: email.split('@')[0].replace('.', ' '), email, role: 'customer' };
        this.setUser(user);
        this.setToken('cust_token_' + Date.now());
        return { success: true, user, token: this.getToken() };
      }
      if (endpoint === '/api/orders/track/lookup') {
        return { orders: stateOrders };
      }
      return {};
    }
  };

  // Sync to public/js/api.js as well
  window.API = API;
})();
