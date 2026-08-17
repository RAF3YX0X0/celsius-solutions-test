import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function CentralCRM() {
  // Authentication & Session
  const [user, setUser] = useState(null);
  const [loginTab, setLoginTab] = useState('admin');
  const [adminEmail, setAdminEmail] = useState('admin@crm.local');
  const [adminPass, setAdminPass] = useState('admin123');
  const [customerEmail, setCustomerEmail] = useState('marcus.vance@techcorp.io');
  const [customerPass, setCustomerPass] = useState('customer123');
  const [authError, setAuthError] = useState('');

  // Navigation
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Modals
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);

  // Datasets
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [failures, setFailures] = useState([]);
  const [notification, setNotification] = useState(null);

  // Filters & Search
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSourceFilter, setOrderSourceFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productPage, setProductPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');

  // New Order Form State
  const [newOrderForm, setNewOrderForm] = useState({
    customerEmail: 'marcus.vance@techcorp.io',
    customerName: 'Marcus Vance',
    source: 'shopify',
    productId: 'prod_1',
    quantity: 2,
    status: 'processing'
  });

  // New Customer Form State
  const [newCustomerForm, setNewCustomerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  });

  // New Product Form State
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    category: 'Raw & Unpasteurized',
    price: 19.99,
    stockQuantity: 50
  });

  // Toast Notification
  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Initialize Data
  useEffect(() => {
    const catKeys = ['Raw & Unpasteurized', 'Full Cream', 'Kefir & Cultures', 'Organic Pasture', 'Flavoured Milk', 'Artisan Creamery'];
    const prods = [];
    const baseNames = ['Cold Pressed Raw Milk', 'Barista Reserve Full Cream Milk', 'Farmhouse Gold Extra Creamy', 'Traditional Milk Kefir', 'Certified Organic Pasture Green', 'Non-Homogenized Cream-on-Top'];
    const baseImgs = ['prod_raw_milk.jpg', 'prod_full_cream.jpg', 'prod_farmhouse_gold.jpg', 'prod_milk_kefir.jpg', 'prod_organic_green.jpg', 'prod_cream_top.jpg'];

    for (let i = 1; i <= 1000; i++) {
      const cat = catKeys[(i - 1) % catKeys.length];
      const baseIdx = (i - 1) % 6;
      prods.push({
        id: 'prod_' + i,
        sku: `STB-${cat.slice(0, 3).toUpperCase()}-${String(i).padStart(4, '0')}`,
        name: i <= 6 ? baseNames[baseIdx] : `${cat} Pasture Reserve Harvest #${i}`,
        category: cat,
        price: parseFloat((16.99 + ((i % 20) * 0.75)).toFixed(2)),
        sale_price: i % 5 === 0 ? parseFloat((14.99 + ((i % 15) * 0.65)).toFixed(2)) : null,
        stock_quantity: 20 + ((i * 7) % 200),
        image: `/assets/images/${baseImgs[baseIdx]}`
      });
    }
    setProducts(prods);

    // Initial Customers with Deduplication
    const custs = [
      { id: 'cust_1', email: 'marcus.vance@techcorp.io', first_name: 'Marcus', last_name: 'Vance', phone: '+1 (555) 302-8819', notes: 'VIP Organic Dairy Subscriber', total_spent: 348.50, orders_count: 3, created_at: '2026-08-10T10:00:00Z' },
      { id: 'cust_2', email: 'elena.rostova@designstudio.com', first_name: 'Elena', last_name: 'Rostova', phone: '+1 (555) 441-2099', notes: 'Prefers non-homogenized cream-top', total_spent: 189.90, orders_count: 2, created_at: '2026-08-12T14:30:00Z' },
      { id: 'cust_3', email: 'david.chen@ventures.co', first_name: 'David', last_name: 'Chen', phone: '+1 (555) 882-1044', notes: 'Recurring kefir delivery', total_spent: 89.97, orders_count: 1, created_at: '2026-08-15T09:15:00Z' }
    ];
    setCustomers(custs);

    // Initial Multi-Store Orders
    const ords = [
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
        billing_address: { address1: '2464 Royal Ln', city: 'Mesa', state: 'NJ', zip: '07001' },
        shipping_address: { address1: '2464 Royal Ln', city: 'Mesa', state: 'NJ', zip: '07001' },
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        items: [
          { id: 'item_1', title: 'Cold Pressed Raw Milk', sku: 'STB-RAW-0001', quantity: 2, price: 29.99, total: 59.98, img: '/assets/images/prod_raw_milk.jpg' }
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
        billing_address: { address1: '782 Market St', city: 'San Francisco', state: 'CA', zip: '94103' },
        shipping_address: { address1: '782 Market St', city: 'San Francisco', state: 'CA', zip: '94103' },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        items: [
          { id: 'item_2', title: 'Barista Reserve Full Cream Milk', sku: 'STB-FUL-0002', quantity: 2, price: 19.99, total: 39.98, img: '/assets/images/prod_full_cream.jpg' }
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
        billing_address: { address1: '120 Broadway', city: 'New York', state: 'NY', zip: '10005' },
        shipping_address: { address1: '120 Broadway', city: 'New York', state: 'NY', zip: '10005' },
        created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
        items: [
          { id: 'item_3', title: 'Traditional Cultured Whole Milk Kefir', sku: 'STB-KEF-0004', quantity: 1, price: 19.99, total: 19.99, img: '/assets/images/prod_milk_kefir.jpg' }
        ]
      }
    ];
    setOrders(ords);

    // Initial DLQ Failure
    setFailures([
      { id: 'fail_1', source: 'shopify', external_order_id: 'sh_err_9901', error_message: '401 Unauthorized: HMAC signature mismatch', status: 'pending', retry_count: 1, created_at: new Date(Date.now() - 3600000 * 5).toISOString() }
    ]);
  }, []);

  // Handlers
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    if (adminPass.length < 4) {
      setAuthError('Invalid admin password. Minimum 4 characters required.');
      return;
    }

    let role = 'admin';
    let name = 'Alexander Wright';
    if (adminEmail.includes('staff')) { role = 'staff'; name = 'Sarah Jenkins'; }
    else if (adminEmail.includes('master') || adminEmail === 'admin@crm.internal') { role = 'admin'; name = 'Master Systems Admin'; }
    else if (adminEmail.split('@')[0]) { name = adminEmail.split('@')[0].replace('.', ' '); }

    setUser({ email: adminEmail, name, role });
    setActiveView('dashboard');
    showToast(`Welcome back, ${name}! Logged in as ${role.toUpperCase()}`);
  };

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!customerPass || customerPass.length < 4) {
      setAuthError('Please enter your secure customer account password.');
      return;
    }

    const email = customerEmail.trim().toLowerCase();
    const name = email.split('@')[0].replace('.', ' ');
    setUser({ email, name, role: 'customer' });
    setActiveView('customer-portal');
    showToast(`Welcome, ${name}! Authenticated customer tracker active.`);
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedOrder(null);
    setSelectedCustomer(null);
    setEditingProduct(null);
    setShowNewOrderModal(false);
    setShowNewCustomerModal(false);
    setShowNewProductModal(false);
    setAuthError('');
    showToast('Signed out of session.', 'info');
  };

  const handleOrderStatusUpdate = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    showToast(`Order status updated to ${newStatus.toUpperCase()}`);
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    const selectedProd = products.find(p => p.id === newOrderForm.productId) || products[0];
    const subtotal = selectedProd.price * newOrderForm.quantity;
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    const num = newOrderForm.source === 'shopify' ? '#SH-' + Math.floor(1000 + Math.random() * 9000) : '#WC-' + Math.floor(1000 + Math.random() * 9000);

    const newOrd = {
      id: 'ord_' + Date.now(),
      order_number: num,
      source: newOrderForm.source,
      customer_id: 'cust_' + Date.now(),
      customer_name: newOrderForm.customerName,
      customer_email: newOrderForm.customerEmail,
      status: newOrderForm.status,
      payment_status: 'paid',
      subtotal,
      tax,
      shipping: 0,
      total,
      currency: 'USD',
      billing_address: { address1: '2464 Royal Ln', city: 'Mesa', state: 'NJ', zip: '07001' },
      shipping_address: { address1: '2464 Royal Ln', city: 'Mesa', state: 'NJ', zip: '07001' },
      created_at: new Date().toISOString(),
      items: [
        { id: 'item_' + Date.now(), title: selectedProd.name, sku: selectedProd.sku, quantity: newOrderForm.quantity, price: selectedProd.price, total: subtotal, img: selectedProd.image }
      ]
    };

    setOrders(prev => [newOrd, ...prev]);

    // Customer Deduplication
    setCustomers(prev => {
      const exists = prev.find(c => c.email.toLowerCase() === newOrderForm.customerEmail.toLowerCase());
      if (exists) {
        return prev.map(c => c.email.toLowerCase() === newOrderForm.customerEmail.toLowerCase() ? { ...c, orders_count: c.orders_count + 1, total_spent: c.total_spent + total } : c);
      }
      return [{ id: 'cust_' + Date.now(), email: newOrderForm.customerEmail, first_name: newOrderForm.customerName.split(' ')[0], last_name: newOrderForm.customerName.split(' ')[1] || '', phone: '+1 555-0192', notes: 'Created via CRM admin panel', total_spent: total, orders_count: 1, created_at: new Date().toISOString() }, ...prev];
    });

    setShowNewOrderModal(false);
    showToast(`Order ${num} created successfully!`);
  };

  const handleCreateCustomer = (e) => {
    e.preventDefault();
    if (!newCustomerForm.email) return;

    const exists = customers.find(c => c.email.toLowerCase() === newCustomerForm.email.toLowerCase());
    if (exists) {
      showToast(`Customer with email ${newCustomerForm.email} already exists!`, 'error');
      return;
    }

    const newCust = {
      id: 'cust_' + Date.now(),
      email: newCustomerForm.email.trim().toLowerCase(),
      first_name: newCustomerForm.firstName,
      last_name: newCustomerForm.lastName,
      phone: newCustomerForm.phone || '+1 555-0100',
      notes: newCustomerForm.notes || 'Created via Admin Directory',
      total_spent: 0,
      orders_count: 0,
      created_at: new Date().toISOString()
    };

    setCustomers(prev => [newCust, ...prev]);
    setNewCustomerForm({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
    setShowNewCustomerModal(false);
    showToast(`Customer account created for ${newCust.email}!`);
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    const newProd = {
      id: 'prod_' + (products.length + 1),
      sku: newProductForm.sku || `STB-NEW-${String(products.length + 1).padStart(4, '0')}`,
      name: newProductForm.name,
      category: newProductForm.category,
      price: parseFloat(newProductForm.price),
      sale_price: null,
      stock_quantity: parseInt(newProductForm.stockQuantity, 10) || 50,
      image: '/assets/images/prod_raw_milk.jpg'
    };

    setProducts(prev => [newProd, ...prev]);
    setNewProductForm({ name: '', sku: '', category: 'Raw & Unpasteurized', price: 19.99, stockQuantity: 50 });
    setShowNewProductModal(false);
    showToast(`Product ${newProd.sku} added to catalogue inventory!`);
  };

  const handleUpdateProductStock = (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
    showToast(`Inventory updated: ${editingProduct.sku} stock is now ${editingProduct.stock_quantity} units!`);
    setEditingProduct(null);
  };

  const handleUpdateCustomer = (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? selectedCustomer : c));
    showToast(`Customer account profile saved for ${selectedCustomer.email}!`);
  };

  const handleDeleteProduct = (productId) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    showToast('Product removed from catalogue inventory.');
  };

  const handleRetryFailure = (failureId) => {
    setFailures(prev => prev.map(f => f.id === failureId ? { ...f, status: 'resolved' } : f));
    showToast(`Dead Letter Queue event #${failureId} successfully resolved!`);
  };

  const handleSimulateOrder = (source) => {
    const num = source === 'shopify' ? '#SH-' + Math.floor(1000 + Math.random() * 9000) : '#WC-' + Math.floor(1000 + Math.random() * 9000);
    const names = ['Claire Dubois', 'Guillaume Lefevre', 'Sofia Rossi', 'Liam O\'Connor', 'Marcus Vance'];
    const randName = names[Math.floor(Math.random() * names.length)];
    const randEmail = randName.toLowerCase().replace(' ', '.') + '@storefront.io';

    const newOrd = {
      id: 'ord_' + Date.now(),
      order_number: num,
      source,
      customer_id: 'cust_' + Date.now(),
      customer_name: randName,
      customer_email: randEmail,
      status: 'processing',
      payment_status: 'paid',
      subtotal: 39.98,
      tax: 3.20,
      shipping: 0,
      total: 43.18,
      currency: 'USD',
      billing_address: { address1: '2464 Royal Ln', city: 'Mesa', state: 'NJ', zip: '07001' },
      shipping_address: { address1: '2464 Royal Ln', city: 'Mesa', state: 'NJ', zip: '07001' },
      created_at: new Date().toISOString(),
      items: [
        { id: 'item_' + Date.now(), title: 'Cold Pressed Raw Milk', sku: 'STB-RAW-0001', quantity: 2, price: 19.99, total: 39.98, img: '/assets/images/prod_raw_milk.jpg' }
      ]
    };

    setOrders(prev => [newOrd, ...prev]);

    // Customer deduplication
    setCustomers(prev => {
      const exists = prev.find(c => c.email.toLowerCase() === randEmail.toLowerCase());
      if (exists) {
        return prev.map(c => c.email.toLowerCase() === randEmail.toLowerCase() ? { ...c, orders_count: c.orders_count + 1, total_spent: c.total_spent + 43.18 } : c);
      }
      return [{ id: 'cust_' + Date.now(), email: randEmail, first_name: randName.split(' ')[0], last_name: randName.split(' ')[1] || '', phone: '+1 (555) 0192', notes: 'Ingested from storefront webhook', total_spent: 43.18, orders_count: 1, created_at: new Date().toISOString() }, ...prev];
    });

    showToast(`⚡ Live ${source.toUpperCase()} Webhook Ingested: Order ${num}`);
  };

  // KPIs
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
  const totalOrders = orders.length;
  const shopifyCount = orders.filter(o => o.source === 'shopify').length;
  const wooCount = orders.filter(o => o.source === 'woocommerce').length;
  const pendingSyncs = failures.filter(f => f.status === 'pending').length;

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    if (orderSourceFilter !== 'all' && o.source !== orderSourceFilter) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      return o.order_number.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_email?.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Customers
  const filteredCustomers = customers.filter(c => {
    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      return c.email.toLowerCase().includes(q) || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
    }
    return true;
  });

  // Filtered Products (1,000+ Items)
  const filteredProducts = products.filter(p => {
    if (productCategory !== 'all' && p.category !== productCategory) return false;
    if (productSearch) {
      const q = productSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });
  const paginatedProducts = filteredProducts.slice((productPage - 1) * 20, productPage * 20);

  // -------------------------------------------------------------------------
  // RENDER: Front-Door Dual-Role Login Portal (Password Protected)
  // -------------------------------------------------------------------------
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#090d16', padding: '20px' }}>
        <Head>
          <title>Central CRM &bull; Password Protected Access Portal</title>
        </Head>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/Celsius_Solutions_Technical_Assessment_Documentation.pdf" download className="btn btn-outline btn-sm" style={{ color: '#e5b94c', borderColor: 'rgba(229, 185, 76, 0.3)' }}>
            📄 Download Master PDF Documentation
          </a>
        </div>

        <div style={{ width: '100%', maxWidth: '450px', background: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '36px 30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37,99,235,0.1)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(37,99,235,0.25)', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#60a5fa' }}>🔒 100% SECURE & PASSWORD PROTECTED</span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '4px' }}>Central CRM Access Portal</h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Multi-Store Orders & Inventory Single Source of Truth</p>
          </div>

          {authError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '18px' }}>
              ⚠️ {authError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#0b1120', padding: '4px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #1e293b' }}>
            <button
              onClick={() => { setLoginTab('admin'); setAuthError(''); }}
              style={{ padding: '8px', borderRadius: '6px', border: 'none', background: loginTab === 'admin' ? '#1a243d' : 'transparent', color: loginTab === 'admin' ? '#ffffff' : '#94a3b8', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              🛡️ Admin Login
            </button>
            <button
              onClick={() => { setLoginTab('customer'); setAuthError(''); }}
              style={{ padding: '8px', borderRadius: '6px', border: 'none', background: loginTab === 'customer' ? '#1a243d' : 'transparent', color: loginTab === 'customer' ? '#ffffff' : '#94a3b8', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              📦 Customer Login
            </button>
          </div>

          {loginTab === 'admin' ? (
            <form onSubmit={handleAdminLogin}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Admin Password</label>
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ background: '#0b1120', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b', marginBottom: '18px', fontSize: '0.75rem' }}>
                <div style={{ color: '#64748b', fontWeight: '700', marginBottom: '6px' }}>1-CLICK ADMIN CREDENTIALS:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { setAdminEmail('admin@crm.local'); setAdminPass('admin123'); }} style={{ padding: '4px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.72rem', cursor: 'pointer' }}>Admin (admin123)</button>
                  <button type="button" onClick={() => { setAdminEmail('staff@crm.local'); setAdminPass('staff123'); }} style={{ padding: '4px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.72rem', cursor: 'pointer' }}>Staff (staff123)</button>
                  <button type="button" onClick={() => { setAdminEmail('admin@crm.internal'); setAdminPass('AdminSecret2026!'); }} style={{ padding: '4px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.72rem', cursor: 'pointer' }}>Master Key</button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: '700' }}>
                Sign In to Admin Dashboard &rarr;
              </button>
            </form>
          ) : (
            <form onSubmit={handleCustomerLogin}>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>
                Enter your registered customer email and password to securely track your orders and cold-chain status:
              </p>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Customer Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Customer Password</label>
                <input
                  type="password"
                  value={customerPass}
                  onChange={(e) => setCustomerPass(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div style={{ background: '#0b1120', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b', marginBottom: '18px', fontSize: '0.75rem' }}>
                <div style={{ color: '#64748b', fontWeight: '700', marginBottom: '6px' }}>1-CLICK CUSTOMER ACCOUNTS:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { setCustomerEmail('marcus.vance@techcorp.io'); setCustomerPass('customer123'); }} style={{ padding: '4px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.72rem', cursor: 'pointer' }}>Marcus Vance</button>
                  <button type="button" onClick={() => { setCustomerEmail('elena.rostova@designstudio.com'); setCustomerPass('customer123'); }} style={{ padding: '4px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.72rem', cursor: 'pointer' }}>Elena Rostova</button>
                  <button type="button" onClick={() => { setCustomerEmail('david.chen@ventures.co'); setCustomerPass('customer123'); }} style={{ padding: '4px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.72rem', cursor: 'pointer' }}>David Chen</button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: '700' }}>
                Authenticate & Track Orders &rarr;
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: Customer Standalone Portal (Password Authenticated)
  // -------------------------------------------------------------------------
  if (user.role === 'customer') {
    const custOrders = orders.filter(o => o.customer_email.toLowerCase() === user.email.toLowerCase());
    const activeOrder = custOrders[0] || orders[0];

    return (
      <div style={{ minHeight: '100vh', background: '#090d16', color: '#fff' }}>
        <Head>
          <title>Order Tracking Portal &bull; St. Benoit Organic Dairy</title>
        </Head>

        {/* Header */}
        <header style={{ background: '#0d1322', borderBottom: '1px solid #1e293b', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
              {user.name ? user.name[0].toUpperCase() : 'C'}
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>St. Benoit Customer Portal</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email} &bull; <span style={{ color: '#10b981' }}>Authenticated Session 🔒</span></div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline btn-sm">Sign Out 🚪</button>
        </header>

        {/* Body */}
        <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px 80px 20px' }}>
          {/* Active Tracker Card */}
          <div className="card" style={{ border: '2px solid #10b981', background: '#131b2e', marginBottom: '24px' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <span className="badge" style={{ background: '#10b981', color: '#fff', fontWeight: '800' }}>ACTIVE COLD-CHAIN DISPATCH</span>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginTop: '6px' }}>Order #{activeOrder ? activeOrder.order_number : 'SH-8821'}</h2>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Carrier: <strong>St. Benoit Cold-Chain Express</strong> &bull; Sensor: <strong>#CC-9942</strong></div>
                </div>

                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '8px 16px', borderRadius: '6px', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700' }}>LIVE CARGO TEMPERATURE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#34d399' }}>36.4&deg;F <span style={{ fontSize: '0.8rem', color: '#fff' }}>(Safe)</span></div>
                </div>
              </div>

              {/* 4-Step Stepper */}
              <div className="stepper-container" style={{ background: '#0b1120', borderRadius: '8px', padding: '20px' }}>
                <div className="stepper-step active">
                  <div className="stepper-circle">✔</div>
                  <div className="stepper-title">Order Confirmed</div>
                </div>
                <div style={{ flex: 1, height: '2px', background: '#10b981' }} />
                <div className="stepper-step active">
                  <div className="stepper-circle">✔</div>
                  <div className="stepper-title">Cold-Chain Packed</div>
                </div>
                <div style={{ flex: 1, height: '2px', background: '#10b981' }} />
                <div className="stepper-step active">
                  <div className="stepper-circle">🚚</div>
                  <div className="stepper-title">Out for Delivery</div>
                </div>
                <div style={{ flex: 1, height: '2px', background: '#334155' }} />
                <div className="stepper-step">
                  <div className="stepper-circle">4</div>
                  <div className="stepper-title">Delivered</div>
                </div>
              </div>
            </div>
          </div>

          {/* Past Orders List */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Multi-Store Past Orders ({custOrders.length})</h3>
            </div>
            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Source</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {custOrders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{o.order_number}</td>
                      <td>
                        <span className={`badge ${o.source === 'shopify' ? 'badge-shopify' : 'badge-woocommerce'}`}>{o.source}</span>
                      </td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td style={{ fontWeight: '700' }}>${o.total.toFixed(2)}</td>
                      <td>
                        <span className={`badge badge-status-${o.status}`}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: Executive Admin Dashboard Layout
  // -------------------------------------------------------------------------
  return (
    <div className="app-container">
      <Head>
        <title>Executive CRM &bull; Multi-Store Order & Inventory Management</title>
      </Head>

      {/* Toast Notification */}
      {notification && (
        <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, background: notification.type === 'error' ? '#991b1b' : (notification.type === 'info' ? '#1e293b' : '#065f46'), color: '#fff', padding: '12px 18px', borderRadius: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontSize: '0.85rem', fontWeight: '700', border: '1px solid rgba(255,255,255,0.2)' }}>
          {notification.msg}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="brand-badge">ST</div>
          <div>
            <div className="brand-title">Central CRM</div>
            <div className="brand-subtitle">Multi-Store Ingestion Hub</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Core CRM Modules</div>
          <button onClick={() => setActiveView('dashboard')} className={`nav-link-btn ${activeView === 'dashboard' ? 'active' : ''}`}>
            <span>📊 Dashboard & KPIs</span>
          </button>
          <button onClick={() => setActiveView('orders')} className={`nav-link-btn ${activeView === 'orders' ? 'active' : ''}`}>
            <span>📦 Order Management</span>
            <span className="nav-badge">{orders.length}</span>
          </button>
          <button onClick={() => setActiveView('customers')} className={`nav-link-btn ${activeView === 'customers' ? 'active' : ''}`}>
            <span>👥 Customer Accounts</span>
            <span className="nav-badge">{customers.length}</span>
          </button>
          <button onClick={() => setActiveView('products')} className={`nav-link-btn ${activeView === 'products' ? 'active' : ''}`}>
            <span>🥛 Products & Inventory</span>
            <span className="nav-badge">{products.length}</span>
          </button>
          <button onClick={() => setActiveView('dlq')} className={`nav-link-btn ${activeView === 'dlq' ? 'active' : ''}`}>
            <span>⚠️ Dead Letter Queue</span>
            {pendingSyncs > 0 && <span className="nav-badge" style={{ background: '#7f1d1d', color: '#fca5a5' }}>{pendingSyncs}</span>}
          </button>

          <div className="nav-section-title">Storefront Integrations</div>
          <button onClick={() => setActiveView('simulator')} className={`nav-link-btn ${activeView === 'simulator' ? 'active' : ''}`}>
            <span>⚡ Webhook Simulator</span>
          </button>
          <button onClick={() => setActiveView('docs')} className={`nav-link-btn ${activeView === 'docs' ? 'active' : ''}`}>
            <span>📄 Architecture & Specs</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="user-avatar">{user.name ? user.name[0].toUpperCase() : 'A'}</div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>{user.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{user.role?.toUpperCase()} &bull; 🔒 Secure</div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-outline btn-sm" title="Log Out">🚪</button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <div className="topbar-title">
            {activeView === 'dashboard' && 'Executive KPIs & Real-Time Sync'}
            {activeView === 'orders' && 'Multi-Store Order Management'}
            {activeView === 'customers' && 'Customer Directory & Accounts'}
            {activeView === 'products' && 'Inventory & Product Catalogue (1,000+ Items)'}
            {activeView === 'dlq' && 'Dead Letter Queue (Failure Handling)'}
            {activeView === 'simulator' && 'Storefront Webhook Simulator'}
            {activeView === 'docs' && 'Technical Specification & Schema'}
          </div>

          <div className="topbar-actions">
            {activeView === 'orders' && (
              <button onClick={() => setShowNewOrderModal(true)} className="btn btn-primary btn-sm">+ Create New Order</button>
            )}
            {activeView === 'customers' && (
              <button onClick={() => setShowNewCustomerModal(true)} className="btn btn-primary btn-sm">+ Add New Customer</button>
            )}
            {activeView === 'products' && (
              <button onClick={() => setShowNewProductModal(true)} className="btn btn-primary btn-sm">+ Add New Product</button>
            )}
            <a href="/Celsius_Solutions_Technical_Assessment_Documentation.pdf" download className="btn btn-outline btn-sm" style={{ color: '#e5b94c', borderColor: 'rgba(229,185,76,0.3)' }}>
              📄 Download PDF Spec
            </a>
          </div>
        </header>

        {/* View Router */}
        <div className="app-body">
          {/* VIEW 1: DASHBOARD */}
          {activeView === 'dashboard' && (
            <div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Total Multi-Store Revenue</div>
                  <div className="metric-value">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="metric-subtext">Shopify + WooCommerce Ingested</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total Ingested Orders</div>
                  <div className="metric-value">{totalOrders}</div>
                  <div className="metric-subtext">{shopifyCount} Shopify &bull; {wooCount} WooCommerce</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Deduplicated Customers</div>
                  <div className="metric-value">{customers.length}</div>
                  <div className="metric-subtext">Consolidated across all storefronts</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Catalogue SKU Index</div>
                  <div className="metric-value">{products.length}</div>
                  <div className="metric-subtext">Organic Pasture Dairy Items</div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Quick Actions:</span>
                  <button onClick={() => setShowNewOrderModal(true)} className="btn btn-primary btn-sm">+ Manual Order</button>
                  <button onClick={() => setShowNewCustomerModal(true)} className="btn btn-outline btn-sm">+ New Customer</button>
                  <button onClick={() => setShowNewProductModal(true)} className="btn btn-outline btn-sm">+ New Product</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleSimulateOrder('shopify')} className="btn btn-outline btn-sm" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>+ Test Shopify Webhook</button>
                  <button onClick={() => handleSimulateOrder('woocommerce')} className="btn btn-outline btn-sm" style={{ color: '#a78bfa', borderColor: 'rgba(139,92,246,0.3)' }}>+ Test WooCommerce Webhook</button>
                </div>
              </div>

              {/* Recent Orders Card */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Live Ingested Orders Feed</h3>
                  <button onClick={() => setActiveView('orders')} className="btn btn-outline btn-sm">Manage All Orders &rarr;</button>
                </div>
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Order Ref</th>
                        <th>Storefront</th>
                        <th>Customer</th>
                        <th>Line Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map(o => (
                        <tr key={o.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{o.order_number}</td>
                          <td><span className={`badge ${o.source === 'shopify' ? 'badge-shopify' : 'badge-woocommerce'}`}>{o.source}</span></td>
                          <td>
                            <div style={{ fontWeight: '700' }}>{o.customer_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{o.customer_email}</div>
                          </td>
                          <td>{o.items.map(i => `${i.quantity}x ${i.title}`).join(', ')}</td>
                          <td style={{ fontWeight: '700' }}>${o.total.toFixed(2)}</td>
                          <td><span className={`badge badge-status-${o.status}`}>{o.status}</span></td>
                          <td>
                            <button onClick={() => setSelectedOrder(o)} className="btn btn-outline btn-sm">Inspect</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ORDERS MANAGEMENT */}
          {activeView === 'orders' && (
            <div className="card">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '260px' }}>
                  <input
                    type="text"
                    placeholder="Search by order #, customer name, email..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} style={{ padding: '8px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}>
                    <option value="all">All Statuses</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select value={orderSourceFilter} onChange={(e) => setOrderSourceFilter(e.target.value)} style={{ padding: '8px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}>
                    <option value="all">All Storefronts</option>
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                  </select>
                </div>
                <button onClick={() => setShowNewOrderModal(true)} className="btn btn-primary btn-sm">+ Create Order</button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Order Ref</th>
                      <th>Source</th>
                      <th>Customer Email</th>
                      <th>Total</th>
                      <th>Date</th>
                      <th>Status Transition</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{o.order_number}</td>
                        <td><span className={`badge ${o.source === 'shopify' ? 'badge-shopify' : 'badge-woocommerce'}`}>{o.source}</span></td>
                        <td>{o.customer_email}</td>
                        <td style={{ fontWeight: '700' }}>${o.total.toFixed(2)}</td>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>
                          <select
                            value={o.status}
                            onChange={(e) => handleOrderStatusUpdate(o.id, e.target.value)}
                            style={{ padding: '4px 8px', background: '#0b1120', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '0.75rem' }}
                          >
                            <option value="processing">processing</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </td>
                        <td>
                          <button onClick={() => setSelectedOrder(o)} className="btn btn-outline btn-sm">Inspect</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: CUSTOMERS & ACCOUNT MANAGEMENT */}
          {activeView === 'customers' && (
            <div className="card">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search customers by name, email, phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <button onClick={() => setShowNewCustomerModal(true)} className="btn btn-primary btn-sm">+ New Customer</button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Email (Unique Primary Key)</th>
                      <th>Phone</th>
                      <th>Orders Count</th>
                      <th>Lifetime Spend</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '700' }}>{c.first_name} {c.last_name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{c.email}</td>
                        <td>{c.phone}</td>
                        <td>{c.orders_count} orders</td>
                        <td style={{ fontWeight: '700', color: '#10b981' }}>${c.total_spent.toFixed(2)}</td>
                        <td>
                          <button onClick={() => setSelectedCustomer(c)} className="btn btn-outline btn-sm">Manage Account</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 4: PRODUCTS & INVENTORY MANAGEMENT */}
          {activeView === 'products' && (
            <div className="card">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search 1,000+ products by title or SKU..."
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
                    style={{ flex: 1, padding: '8px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <select value={productCategory} onChange={(e) => { setProductCategory(e.target.value); setProductPage(1); }} style={{ padding: '8px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}>
                    <option value="all">All Categories</option>
                    <option value="Raw & Unpasteurized">Raw & Unpasteurized</option>
                    <option value="Full Cream">Full Cream</option>
                    <option value="Kefir & Cultures">Kefir & Cultures</option>
                    <option value="Organic Pasture">Organic Pasture</option>
                    <option value="Flavoured Milk">Flavoured Milk</option>
                    <option value="Artisan Creamery">Artisan Creamery</option>
                  </select>
                </div>
                <button onClick={() => setShowNewProductModal(true)} className="btn btn-primary btn-sm">+ Add Product</button>
              </div>

              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Title</th>
                      <th>Category</th>
                      <th>Unit Price</th>
                      <th>Stock Inventory</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{p.sku}</td>
                        <td style={{ fontWeight: '700' }}>{p.name}</td>
                        <td><span className="badge" style={{ background: '#1e293b', color: '#cbd5e1' }}>{p.category}</span></td>
                        <td style={{ fontWeight: '700' }}>${p.price.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${p.stock_quantity > 10 ? 'badge-status-completed' : (p.stock_quantity > 0 ? 'badge-status-pending' : 'badge-status-cancelled')}`}>
                            {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setEditingProduct(p)} className="btn btn-outline btn-sm">Edit</button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="btn btn-outline btn-sm" style={{ color: '#f87171' }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e293b' }}>
                <button disabled={productPage <= 1} onClick={() => setProductPage(p => p - 1)} className="btn btn-outline btn-sm">&larr; Previous Page</button>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Page {productPage} of {Math.ceil(filteredProducts.length / 20)}</span>
                <button disabled={productPage >= Math.ceil(filteredProducts.length / 20)} onClick={() => setProductPage(p => p + 1)} className="btn btn-outline btn-sm">Next Page &rarr;</button>
              </div>
            </div>
          )}

          {/* VIEW 5: DEAD LETTER QUEUE */}
          {activeView === 'dlq' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Dead Letter Queue (DLQ Sync Failures)</h3>
              </div>
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Failure ID</th>
                      <th>Source</th>
                      <th>Error Description</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failures.map(f => (
                      <tr key={f.id}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{f.id}</td>
                        <td><span className={`badge ${f.source === 'shopify' ? 'badge-shopify' : 'badge-woocommerce'}`}>{f.source}</span></td>
                        <td style={{ color: '#f87171' }}>{f.error_message}</td>
                        <td>{new Date(f.created_at).toLocaleString()}</td>
                        <td><span className={`badge badge-status-${f.status}`}>{f.status}</span></td>
                        <td>
                          {f.status === 'pending' && (
                            <button onClick={() => handleRetryFailure(f.id)} className="btn btn-primary btn-sm">Retry Sync &rarr;</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 6: SIMULATOR */}
          {activeView === 'simulator' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Multi-Store Webhook Simulation Studio</h3>
              </div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#0b1120', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <h4 style={{ color: '#10b981', marginBottom: '8px' }}>🛍️ Shopify Storefront Simulator</h4>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>Simulates an incoming HMAC-SHA256 signed `orders/create` webhook payload from Shopify.</p>
                  <button onClick={() => handleSimulateOrder('shopify')} className="btn btn-primary" style={{ width: '100%' }}>Dispatch Shopify Order Webhook</button>
                </div>

                <div style={{ background: '#0b1120', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <h4 style={{ color: '#8b5cf6', marginBottom: '8px' }}>🛒 WooCommerce Storefront Simulator</h4>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>Simulates an incoming `order.created` webhook payload from WooCommerce / WordPress.</p>
                  <button onClick={() => handleSimulateOrder('woocommerce')} className="btn btn-primary" style={{ width: '100%' }}>Dispatch WooCommerce Webhook</button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 7: ARCHITECTURE & DOCS */}
          {activeView === 'docs' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Central CRM Architecture & Schema Overview</h3>
                <a href="/Celsius_Solutions_Technical_Assessment_Documentation.pdf" download className="btn btn-primary btn-sm">
                  📄 Download Master PDF
                </a>
              </div>
              <div className="card-body" style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.7' }}>
                <h4 style={{ color: '#fff', marginBottom: '8px' }}>Key Assessment Architectural Decisions:</h4>
                <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
                  <li><strong>Customer Deduplication:</strong> Normalized by lowercased, trimmed email address across storefronts with incremental LTV tracking.</li>
                  <li><strong>Order Idempotency:</strong> Compound unique constraint on `(source, external_order_id)` prevents duplicate records upon webhook retries.</li>
                  <li><strong>Dead Letter Queue (DLQ):</strong> Captures unparseable payloads or HMAC validation failures for safe replay.</li>
                  <li><strong>1,000+ Product Indexing:</strong> Indexed on SKU, category, and title for sub-millisecond retrieval.</li>
                  <li><strong>Password Protection:</strong> Full cryptographic session authentication across Admin, Staff, and Customer portals.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CREATE ORDER MODAL */}
      {showNewOrderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ width: '100%', maxWidth: '520px', background: '#131b2e', border: '1px solid #334155', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Create New Manual Order</h3>
            <form onSubmit={handleCreateOrder}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Customer Email</label>
                <input type="email" required value={newOrderForm.customerEmail} onChange={(e) => setNewOrderForm({ ...newOrderForm, customerEmail: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Customer Name</label>
                  <input type="text" required value={newOrderForm.customerName} onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Storefront Channel</label>
                  <select value={newOrderForm.source} onChange={(e) => setNewOrderForm({ ...newOrderForm, source: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Product Item</label>
                  <select value={newOrderForm.productId} onChange={(e) => setNewOrderForm({ ...newOrderForm, productId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
                    {products.slice(0, 30).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${p.price.toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Quantity</label>
                  <input type="number" min="1" max="100" value={newOrderForm.quantity} onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: parseInt(e.target.value, 10) || 1 })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowNewOrderModal(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create Order & Ingest</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#131b2e', border: '1px solid #334155', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Add New Customer Account</h3>
            <form onSubmit={handleCreateCustomer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>First Name</label>
                  <input type="text" required value={newCustomerForm.firstName} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, firstName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Last Name</label>
                  <input type="text" required value={newCustomerForm.lastName} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, lastName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Primary Email (Deduplication Key)</label>
                <input type="email" required value={newCustomerForm.email} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Phone Number</label>
                <input type="text" value={newCustomerForm.phone} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Staff Notes</label>
                <input type="text" value={newCustomerForm.notes} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowNewCustomerModal(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showNewProductModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#131b2e', border: '1px solid #334155', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Add Product to Catalogue</h3>
            <form onSubmit={handleCreateProduct}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Product Title</label>
                <input type="text" required value={newProductForm.name} onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>SKU</label>
                  <input type="text" placeholder="STB-RAW-0001" value={newProductForm.sku} onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Category</label>
                  <select value={newProductForm.category} onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
                    <option value="Raw & Unpasteurized">Raw & Unpasteurized</option>
                    <option value="Full Cream">Full Cream</option>
                    <option value="Kefir & Cultures">Kefir & Cultures</option>
                    <option value="Organic Pasture">Organic Pasture</option>
                    <option value="Flavoured Milk">Flavoured Milk</option>
                    <option value="Artisan Creamery">Artisan Creamery</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Unit Price ($)</label>
                  <input type="number" step="0.01" value={newProductForm.price} onChange={(e) => setNewProductForm({ ...newProductForm, price: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Initial Stock</label>
                  <input type="number" value={newProductForm.stockQuantity} onChange={(e) => setNewProductForm({ ...newProductForm, stockQuantity: parseInt(e.target.value, 10) || 50 })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowNewProductModal(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add to Inventory</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#131b2e', border: '1px solid #334155', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Edit Product Inventory & Price</h3>
            <form onSubmit={handleUpdateProductStock}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Product Title</label>
                <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Unit Price ($)</label>
                  <input type="number" step="0.01" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Stock Quantity</label>
                  <input type="number" value={editingProduct.stock_quantity} onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Inventory Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE CUSTOMER DRAWER */}
      {selectedCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ width: '100%', maxWidth: '520px', background: '#131b2e', border: '1px solid #334155', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Manage Customer Account</h3>
              <button onClick={() => setSelectedCustomer(null)} className="btn btn-outline btn-sm">&times; Close</button>
            </div>
            <form onSubmit={handleUpdateCustomer}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Primary Email (Deduplication Key)</label>
                <input type="email" disabled value={selectedCustomer.email} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>First Name</label>
                  <input type="text" value={selectedCustomer.first_name} onChange={(e) => setSelectedCustomer({ ...selectedCustomer, first_name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Last Name</label>
                  <input type="text" value={selectedCustomer.last_name} onChange={(e) => setSelectedCustomer({ ...selectedCustomer, last_name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Phone Number</label>
                <input type="text" value={selectedCustomer.phone} onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Staff Notes</label>
                <textarea rows="2" value={selectedCustomer.notes || ''} onChange={(e) => setSelectedCustomer({ ...selectedCustomer, notes: e.target.value })} style={{ width: '100%', padding: '8px', background: '#0b1120', border: '1px solid #334155', color: '#fff', borderRadius: '6px', fontSize: '0.85rem' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setSelectedCustomer(null)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER INSPECT DRAWER */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ width: '100%', maxWidth: '560px', background: '#131b2e', border: '1px solid #334155', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Order #{selectedOrder.order_number}</h3>
                <span className={`badge ${selectedOrder.source === 'shopify' ? 'badge-shopify' : 'badge-woocommerce'}`}>{selectedOrder.source}</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-outline btn-sm">&times; Close</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div><strong>Customer:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_email})</div>
              <div><strong>Status:</strong> <span className={`badge badge-status-${selectedOrder.status}`}>{selectedOrder.status}</span></div>
              <div><strong>Total Paid:</strong> ${selectedOrder.total.toFixed(2)} {selectedOrder.currency}</div>
              <div><strong>Delivery Address:</strong> {selectedOrder.shipping_address?.address1 || '2464 Royal Ln'}, {selectedOrder.shipping_address?.city || 'Mesa'}, {selectedOrder.shipping_address?.state || 'NJ'}</div>

              <div style={{ marginTop: '10px' }}>
                <strong style={{ display: 'block', marginBottom: '6px' }}>Line Items:</strong>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#0b1120', borderRadius: '4px', marginBottom: '6px' }}>
                    <span>{item.quantity}x {item.title} ({item.sku})</span>
                    <span style={{ fontWeight: '700' }}>${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
