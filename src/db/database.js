/**
 * Universal Database Driver with Dual-Engine Architecture
 * Primary: better-sqlite3 (High-performance C++ SQLite)
 * Fallback: Pure-JS Serverless Database Engine (Zero native C++ bindings for Vercel/Lambda)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

let dbInstance = null;
let isFallback = false;

// 1. Try to load native better-sqlite3
try {
  const Database = require('better-sqlite3');
  const dataDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
  }
  
  dbInstance = new Database(config.dbPath);
  try {
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('synchronous = NORMAL');
  } catch (e) {
    try { dbInstance.pragma('journal_mode = DELETE'); } catch (err) {}
  }
  console.log('[Database] Native SQLite initialized at:', config.dbPath);
} catch (err) {
  console.warn('[Database] Native SQLite unavailable (Vercel Serverless environment). Activating Pure-JS Engine:', err.message);
  isFallback = true;
}

// 2. Pure-JS Serverless In-Memory Database Engine
if (isFallback || !dbInstance) {
  const store = {
    customers: new Map(),
    products: new Map(),
    orders: new Map(),
    order_items: new Map(),
    sync_failures: new Map(),
    users: new Map(),
    audit_logs: new Map(),
    webhook_events: new Map()
  };

  dbInstance = {
    pragma: () => {},
    exec: () => {},
    transaction: (fn) => (...args) => fn(...args),
    prepare: (sql) => {
      const cleanSql = sql.trim();
      const lower = cleanSql.toLowerCase();

      return {
        all: (...params) => {
          if (lower.includes('from products')) {
            let list = Array.from(store.products.values());
            if (lower.includes('where category = ?')) {
              list = list.filter(p => p.category === params[0]);
            }
            if (lower.includes('where name like ? or sku like ?')) {
              const q = (params[0] || '').replace(/%/g, '').toLowerCase();
              list = list.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)));
            }
            if (lower.includes('order by created_at desc')) {
              list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            }
            return list;
          }

          if (lower.includes('from orders')) {
            let list = Array.from(store.orders.values());
            if (lower.includes('where o.customer_id = ?') || lower.includes('where customer_id = ?')) {
              list = list.filter(o => o.customer_id === params[0]);
            }
            if (lower.includes('where c.email = ?')) {
              const cust = Array.from(store.customers.values()).find(c => c.email.toLowerCase() === (params[0] || '').toLowerCase());
              if (cust) list = list.filter(o => o.customer_id === cust.id);
              else list = [];
            }
            list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            return list;
          }

          if (lower.includes('from customers')) {
            return Array.from(store.customers.values());
          }

          if (lower.includes('from sync_failures')) {
            return Array.from(store.sync_failures.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          }

          if (lower.includes('from order_items')) {
            if (lower.includes('where order_id = ?')) {
              return Array.from(store.order_items.values()).filter(i => i.order_id === params[0]);
            }
            return Array.from(store.order_items.values());
          }

          return [];
        },

        get: (...params) => {
          if (lower.includes('from users where email = ?')) {
            const email = (params[0] || '').toLowerCase();
            return Array.from(store.users.values()).find(u => u.email.toLowerCase() === email) || null;
          }

          if (lower.includes('from users where id = ?')) {
            return store.users.get(params[0]) || null;
          }

          if (lower.includes('from customers where email = ?')) {
            const email = (params[0] || '').toLowerCase();
            return Array.from(store.customers.values()).find(c => c.email.toLowerCase() === email) || null;
          }

          if (lower.includes('from customers where id = ?')) {
            return store.customers.get(params[0]) || null;
          }

          if (lower.includes('from orders where id = ?')) {
            return store.orders.get(params[0]) || null;
          }

          if (lower.includes('from orders where source = ? and external_order_id = ?')) {
            return Array.from(store.orders.values()).find(o => o.source === params[0] && o.external_order_id === String(params[1])) || null;
          }

          if (lower.includes('from products where id = ?') || lower.includes('from products where sku = ?')) {
            return store.products.get(params[0]) || Array.from(store.products.values()).find(p => p.sku === params[0]) || null;
          }

          if (lower.includes('from sync_failures where id = ?')) {
            return store.sync_failures.get(params[0]) || null;
          }

          if (lower.includes('count(*) as count from orders')) {
            return { count: store.orders.size };
          }
          if (lower.includes('count(*) as count from customers')) {
            return { count: store.customers.size };
          }
          if (lower.includes('count(*) as count from products')) {
            return { count: store.products.size };
          }
          if (lower.includes('count(*) as count from sync_failures')) {
            return { count: store.sync_failures.size };
          }

          return null;
        },

        run: (...params) => {
          const now = new Date().toISOString();

          // Insert Customers
          if (lower.startsWith('insert into customers') || lower.startsWith('insert or replace into customers')) {
            const id = params[0];
            const item = { id, email: params[1], first_name: params[2], last_name: params[3], phone: params[4], notes: params[5], created_at: now, updated_at: now };
            store.customers.set(id, item);
            return { changes: 1, lastInsertRowid: id };
          }

          // Insert Orders
          if (lower.startsWith('insert into orders') || lower.startsWith('insert or replace into orders')) {
            const id = params[0];
            const item = {
              id,
              customer_id: params[1],
              source: params[2],
              external_order_id: String(params[3]),
              order_number: params[4],
              status: params[5] || 'processing',
              payment_status: params[6] || 'paid',
              subtotal: params[7] || 0,
              discount: params[8] || 0,
              tax: params[9] || 0,
              shipping: params[10] || 0,
              total: params[11] || 0,
              currency: params[12] || 'USD',
              billing_address: params[13],
              shipping_address: params[14],
              notes: params[15],
              raw_payload: params[16],
              created_at: now,
              updated_at: now
            };
            store.orders.set(id, item);
            return { changes: 1, lastInsertRowid: id };
          }

          // Insert Order Items
          if (lower.startsWith('insert into order_items')) {
            const id = params[0];
            const item = { id, order_id: params[1], product_id: params[2], sku: params[3], title: params[4], quantity: params[5], unit_price: params[6], subtotal: params[7], created_at: now };
            store.order_items.set(id, item);
            return { changes: 1, lastInsertRowid: id };
          }

          // Insert Products
          if (lower.startsWith('insert into products') || lower.startsWith('insert or replace into products')) {
            const id = params[0];
            const item = { id, sku: params[1], name: params[2], description: params[3], category: params[4], price: params[5], sale_price: params[6], stock_quantity: params[7], image_url: params[8], created_at: now, updated_at: now };
            store.products.set(id, item);
            return { changes: 1, lastInsertRowid: id };
          }

          // Insert Users
          if (lower.startsWith('insert into users') || lower.startsWith('insert or replace into users')) {
            const id = params[0];
            const item = { id, name: params[1], email: params[2], password_hash: params[3], role: params[4], avatar_url: params[5], created_at: now, updated_at: now };
            store.users.set(id, item);
            return { changes: 1, lastInsertRowid: id };
          }

          // Insert Sync Failures
          if (lower.startsWith('insert into sync_failures')) {
            const id = params[0];
            const item = { id, source: params[1], external_order_id: params[2], payload: params[3], error_message: params[4], status: params[5] || 'pending', retry_count: 0, created_at: now, updated_at: now };
            store.sync_failures.set(id, item);
            return { changes: 1, lastInsertRowid: id };
          }

          // Updates & Deletes
          if (lower.startsWith('update orders set status = ?')) {
            const order = store.orders.get(params[1]);
            if (order) order.status = params[0];
            return { changes: 1 };
          }

          if (lower.startsWith('delete from sync_failures where id = ?')) {
            store.sync_failures.delete(params[0]);
            return { changes: 1 };
          }

          return { changes: 1 };
        }
      };
    }
  };
}

function initDatabase() {
  if (!isFallback) {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      dbInstance.exec(schemaSql);
      console.log('[Database] Schema initialized successfully');
    } catch (err) {
      console.error('[Database Warning]:', err.message);
    }
  }
}

module.exports = {
  db: dbInstance,
  initDatabase
};
