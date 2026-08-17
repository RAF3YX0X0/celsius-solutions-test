const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./database');

async function seedDatabase(force = false) {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;

  if (!force && userCount > 0 && productCount >= 1000) {
    console.log(`[Seed] Database already seeded (${userCount} users, ${productCount} products). Skipping.`);
    return;
  }

  console.log('[Seed] Starting database seed process...');

  // Wrap seed in a single high-speed transaction
  const seedTransaction = db.transaction(() => {
    // 1. Seed Users (Admin & Staff)
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM order_items').run();
    db.prepare('DELETE FROM orders').run();
    db.prepare('DELETE FROM sync_failures').run();
    db.prepare('DELETE FROM customers').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM audit_logs').run();

    const adminHash = bcrypt.hashSync('admin123', 10);
    const staffHash = bcrypt.hashSync('staff123', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertUser.run(uuidv4(), 'Alexander Wright (Admin)', 'admin@crm.local', adminHash, 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
    insertUser.run(uuidv4(), 'Sarah Jenkins (Staff)', 'staff@crm.local', staffHash, 'staff', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80');

    // 2. Generate 1,000+ Realistic Organic Dairy Products matching Shopify & WooCommerce CSVs
    console.log('[Seed] Seeding 1,000+ realistic organic milk & dairy products into CRM...');
    const insertProduct = db.prepare(`
      INSERT INTO products (id, sku, name, description, category, price, sale_price, stock_quantity, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
    `);

    const generatedProducts = [];
    const dairyCategories = [
      { id: 'raw', name: 'Raw & Unpasteurized', prefix: 'RAW' },
      { id: 'full-cream', name: 'Full Cream', prefix: 'FUL' },
      { id: 'kefir', name: 'Kefir & Cultures', prefix: 'KEF' },
      { id: 'organic', name: 'Organic Pasture', prefix: 'ORG' },
      { id: 'flavoured', name: 'Flavoured Milk', prefix: 'FLA' },
      { id: 'creamery', name: 'Artisan Creamery', prefix: 'CRE' }
    ];

    const dairyImages = [
      '/assets/images/prod_raw_milk.jpg',
      '/assets/images/prod_full_cream.jpg',
      '/assets/images/prod_farmhouse_gold.jpg',
      '/assets/images/prod_milk_kefir.jpg',
      '/assets/images/prod_organic_green.jpg',
      '/assets/images/prod_cream_top.jpg'
    ];

    for (let i = 1; i <= 1000; i++) {
      const cat = dairyCategories[(i - 1) % dairyCategories.length];
      const img = dairyImages[i % dairyImages.length];
      const sku = `STB-${cat.prefix}-${String(i).padStart(4, '0')}`;
      const name = i === 1 ? 'Cold Pressed Raw Milk' :
                   i === 2 ? 'Full Cream Barista Milk' :
                   i === 3 ? 'Farmhouse Gold Extra Creamy' :
                   i === 4 ? 'Traditional Milk Kefir' :
                   i === 5 ? 'Farmhouse Gold Organic Milk' :
                   i === 6 ? 'Cream On Top Natural Milk' :
                   `Pasture Reserve ${cat.name} Milk #${i}`;
      const price = parseFloat((18.99 + ((i % 15) * 0.75)).toFixed(2));
      const salePrice = (i % 3 === 0) ? parseFloat((price * 0.85).toFixed(2)) : null;
      const stock = 25 + ((i * 7) % 300);
      const daysAgo = Math.floor(Math.random() * 90) + 1;
      const prodId = `prod_${i}`;

      insertProduct.run(
        prodId,
        sku,
        name,
        `<p>100% pasture-raised certified organic ${name} in returnable glass bottle. Cold-chain chilled direct from local family farms.</p>`,
        cat.name,
        price,
        salePrice,
        stock,
        img,
        daysAgo
      );
      generatedProducts.push({ id: prodId, sku, name, price, stock, category: cat.name });
    }

    console.log(`[Seed] Seeded ${generatedProducts.length} organic dairy products successfully.`);

    // 3. Seed Realistic Customers (Unified Across Stores)
    console.log('[Seed] Seeding customer accounts and multi-store order history...');

    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, email, first_name, last_name, phone, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'), datetime('now'))
    `);

    const customerSeeds = [
      { email: 'marcus.vance@techcorp.io', first: 'Marcus', last: 'Vance', phone: '+1 (415) 882-9912', notes: 'VIP Buyer - High frequency orders from both Shopify and WooCommerce', days: 120 },
      { email: 'elena.rostova@designstudio.com', first: 'Elena', last: 'Rostova', phone: '+1 (212) 555-0193', notes: 'Corporate client - Prefers WooCommerce invoicing', days: 95 },
      { email: 'david.chen@ventures.co', first: 'David', last: 'Chen', phone: '+1 (650) 449-3381', notes: 'Shopify storefront loyalist', days: 80 },
      { email: 'sophia.alvarez@horizon.org', first: 'Sophia', last: 'Alvarez', phone: '+1 (312) 774-0012', notes: 'Purchases smart home and audio equipment', days: 60 },
      { email: 'james.wilson@apexsystems.net', first: 'James', last: 'Wilson', phone: '+1 (206) 331-8842', notes: 'Dual-store customer. Merged profile.', days: 45 },
      { email: 'claire.dubois@atelierparis.fr', first: 'Claire', last: 'Dubois', phone: '+33 1 42 68 55 00', notes: 'International shipping address', days: 40 },
      { email: 'robert.taylor@buildcraft.io', first: 'Robert', last: 'Taylor', phone: '+1 (512) 993-2201', notes: 'Standard wholesale account', days: 30 },
      { email: 'amara.patel@solaris.dev', first: 'Amara', last: 'Patel', phone: '+1 (617) 442-8819', notes: 'Frequent buyer of ergonomics and office gear', days: 25 },
      { email: 'lucas.muller@munich-tech.de', first: 'Lucas', last: 'Müller', phone: '+49 89 2018 334', notes: 'EU customer via WooCommerce', days: 18 },
      { email: 'hannah.abbott@studiowork.com', first: 'Hannah', last: 'Abbott', phone: '+1 (718) 554-1190', notes: 'New customer from Shopify campaign', days: 10 },
      { email: 'liam.o.connor@dublinconsult.ie', first: 'Liam', last: "O'Connor", phone: '+353 1 496 2200', notes: 'Standard consumer account', days: 8 },
      { email: 'zoe.kravitz@artisanloft.co', first: 'Zoe', last: 'Kravitz', phone: '+1 (323) 880-9921', notes: 'Recent customer', days: 3 }
    ];

    const customerMap = new Map();
    customerSeeds.forEach(c => {
      const id = uuidv4();
      insertCustomer.run(id, c.email.toLowerCase().trim(), c.first, c.last, c.phone, c.notes, c.days);
      customerMap.set(c.email, { id, ...c });
    });

    // 4. Seed Realistic Orders (Shopify & WooCommerce)
    console.log('[Seed] Seeding realistic orders from Shopify and WooCommerce...');

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, customer_id, source, external_order_id, order_number, status, payment_status,
        subtotal, discount, tax, shipping, total, currency, billing_address, shipping_address,
        notes, raw_payload, two_way_synced_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, datetime('now', '-' || ? || ' days'), datetime('now', '-' || ? || ' days'), datetime('now')
      )
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, sku, title, quantity, unit_price, subtotal, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
    `);

    const orderSeeds = [
      {
        source: 'shopify',
        extId: 'sh_9921849102',
        orderNum: '#SH-1042',
        customerEmail: 'marcus.vance@techcorp.io',
        status: 'completed',
        paymentStatus: 'paid',
        days: 28,
        itemIndices: [0, 2, 5],
        address: { address1: '742 Montgomery St, Suite 400', city: 'San Francisco', state: 'CA', postalCode: '94111', country: 'United States' }
      },
      {
        source: 'woocommerce',
        extId: 'wc_772819',
        orderNum: '#WC-8841',
        customerEmail: 'marcus.vance@techcorp.io', // Demonstrating multi-store customer deduplication!
        status: 'completed',
        paymentStatus: 'paid',
        days: 14,
        itemIndices: [14, 18],
        address: { address1: '742 Montgomery St, Suite 400', city: 'San Francisco', state: 'CA', postalCode: '94111', country: 'United States' }
      },
      {
        source: 'shopify',
        extId: 'sh_9921849103',
        orderNum: '#SH-1043',
        customerEmail: 'elena.rostova@designstudio.com',
        status: 'processing',
        paymentStatus: 'paid',
        days: 4,
        itemIndices: [35, 36, 38],
        address: { address1: '450 West 33rd St, Floor 12', city: 'New York', state: 'NY', postalCode: '10001', country: 'United States' }
      },
      {
        source: 'woocommerce',
        extId: 'wc_772820',
        orderNum: '#WC-8842',
        customerEmail: 'elena.rostova@designstudio.com', // Second order from WooCommerce
        status: 'completed',
        paymentStatus: 'paid',
        days: 21,
        itemIndices: [40, 42],
        address: { address1: '450 West 33rd St, Floor 12', city: 'New York', state: 'NY', postalCode: '10001', country: 'United States' }
      },
      {
        source: 'shopify',
        extId: 'sh_9921849104',
        orderNum: '#SH-1044',
        customerEmail: 'david.chen@ventures.co',
        status: 'completed',
        paymentStatus: 'paid',
        days: 19,
        itemIndices: [60, 62],
        address: { address1: '120 University Ave', city: 'Palo Alto', state: 'CA', postalCode: '94301', country: 'United States' }
      },
      {
        source: 'shopify',
        extId: 'sh_9921849105',
        orderNum: '#SH-1045',
        customerEmail: 'sophia.alvarez@horizon.org',
        status: 'pending',
        paymentStatus: 'paid',
        days: 1,
        itemIndices: [75, 76, 78],
        address: { address1: '300 N Michigan Ave', city: 'Chicago', state: 'IL', postalCode: '60601', country: 'United States' }
      },
      {
        source: 'woocommerce',
        extId: 'wc_772821',
        orderNum: '#WC-8843',
        customerEmail: 'james.wilson@apexsystems.net',
        status: 'completed',
        paymentStatus: 'paid',
        days: 12,
        itemIndices: [90, 92],
        address: { address1: '1901 4th Ave, Suite 2100', city: 'Seattle', state: 'WA', postalCode: '98101', country: 'United States' }
      },
      {
        source: 'shopify',
        extId: 'sh_9921849106',
        orderNum: '#SH-1046',
        customerEmail: 'james.wilson@apexsystems.net', // Same customer on Shopify
        status: 'processing',
        paymentStatus: 'paid',
        days: 2,
        itemIndices: [100, 102],
        address: { address1: '1901 4th Ave, Suite 2100', city: 'Seattle', state: 'WA', postalCode: '98101', country: 'United States' }
      },
      {
        source: 'woocommerce',
        extId: 'wc_772822',
        orderNum: '#WC-8844',
        customerEmail: 'claire.dubois@atelierparis.fr',
        status: 'completed',
        paymentStatus: 'paid',
        days: 16,
        itemIndices: [120, 122],
        address: { address1: '14 Rue de Rivoli', city: 'Paris', state: 'Île-de-France', postalCode: '75001', country: 'France' }
      },
      {
        source: 'shopify',
        extId: 'sh_9921849107',
        orderNum: '#SH-1047',
        customerEmail: 'robert.taylor@buildcraft.io',
        status: 'cancelled',
        paymentStatus: 'refunded',
        days: 9,
        itemIndices: [135],
        address: { address1: '500 E 4th St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'United States' }
      },
      {
        source: 'woocommerce',
        extId: 'wc_772823',
        orderNum: '#WC-8845',
        customerEmail: 'amara.patel@solaris.dev',
        status: 'processing',
        paymentStatus: 'paid',
        days: 3,
        itemIndices: [150, 152, 154],
        address: { address1: '100 Federal St', city: 'Boston', state: 'MA', postalCode: '02110', country: 'United States' }
      },
      {
        source: 'shopify',
        extId: 'sh_9921849108',
        orderNum: '#SH-1048',
        customerEmail: 'lucas.muller@munich-tech.de',
        status: 'refunded',
        paymentStatus: 'refunded',
        days: 11,
        itemIndices: [165],
        address: { address1: 'Maximilianstraße 35', city: 'Munich', state: 'Bavaria', postalCode: '80539', country: 'Germany' }
      },
      {
        source: 'woocommerce',
        extId: 'wc_772824',
        orderNum: '#WC-8846',
        customerEmail: 'hannah.abbott@studiowork.com',
        status: 'completed',
        paymentStatus: 'paid',
        days: 6,
        itemIndices: [180, 182],
        address: { address1: '55 Water St', city: 'Brooklyn', state: 'NY', postalCode: '11201', country: 'United States' }
      },
      {
        source: 'shopify',
        extId: 'sh_9921849109',
        orderNum: '#SH-1049',
        customerEmail: 'liam.o.connor@dublinconsult.ie',
        status: 'pending',
        paymentStatus: 'pending',
        days: 1,
        itemIndices: [195],
        address: { address1: 'Grand Canal Dock', city: 'Dublin', state: 'Leinster', postalCode: 'D02', country: 'Ireland' }
      },
      {
        source: 'shopify',
        extId: 'sh_9921849110',
        orderNum: '#SH-1050',
        customerEmail: 'zoe.kravitz@artisanloft.co',
        status: 'processing',
        paymentStatus: 'paid',
        days: 0,
        itemIndices: [210, 212],
        address: { address1: '849 S Broadway', city: 'Los Angeles', state: 'CA', postalCode: '90014', country: 'United States' }
      }
    ];

    orderSeeds.forEach(seed => {
      const cust = customerMap.get(seed.customerEmail);
      if (!cust) return;

      const orderId = uuidv4();
      let subtotal = 0;
      const orderItemsToInsert = [];

      seed.itemIndices.forEach(idx => {
        const prod = generatedProducts[idx % generatedProducts.length];
        const qty = (idx % 2) + 1;
        const lineTotal = parseFloat((prod.price * qty).toFixed(2));
        subtotal += lineTotal;
        orderItemsToInsert.push({
          id: uuidv4(),
          productId: prod.id,
          sku: prod.sku,
          title: prod.name,
          quantity: qty,
          unitPrice: prod.price,
          subtotal: lineTotal
        });
      });

      subtotal = parseFloat(subtotal.toFixed(2));
      const discount = subtotal > 200 ? parseFloat((subtotal * 0.05).toFixed(2)) : 0;
      const tax = parseFloat(((subtotal - discount) * 0.0825).toFixed(2));
      const shipping = subtotal > 150 ? 0 : 15.00;
      const total = parseFloat((subtotal - discount + tax + shipping).toFixed(2));

      const rawPayload = JSON.stringify({
        source: seed.source,
        event: `${seed.source}/orders/create`,
        external_order_id: seed.extId,
        order_number: seed.orderNum,
        customer: { email: cust.email, first_name: cust.first, last_name: cust.last, phone: cust.phone },
        items: orderItemsToInsert,
        financials: { subtotal, discount, tax, shipping, total, currency: 'USD' },
        shipping_address: seed.address,
        billing_address: seed.address,
        created_at: new Date(Date.now() - seed.days * 86400000).toISOString()
      });

      insertOrder.run(
        orderId,
        cust.id,
        seed.source,
        seed.extId,
        seed.orderNum,
        seed.status,
        seed.paymentStatus,
        subtotal,
        discount,
        tax,
        shipping,
        total,
        'USD',
        JSON.stringify(seed.address),
        JSON.stringify(seed.address),
        `Order ingested automatically via ${seed.source.toUpperCase()} webhook.`,
        rawPayload,
        seed.days,
        seed.days
      );

      orderItemsToInsert.forEach(item => {
        insertOrderItem.run(
          item.id,
          orderId,
          item.productId,
          item.sku,
          item.title,
          item.quantity,
          item.unitPrice,
          item.subtotal,
          seed.days
        );
      });
    });

    // 5. Seed Test Sync Failures (Dead Letter Queue test cases)
    console.log('[Seed] Seeding sample sync failures for Dead Letter Queue testing...');
    const insertFailure = db.prepare(`
      INSERT INTO sync_failures (id, source, external_order_id, payload, error_message, status, retry_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'), datetime('now'))
    `);

    insertFailure.run(
      uuidv4(),
      'shopify',
      'sh_err_99011',
      JSON.stringify({
        source: 'shopify',
        external_order_id: 'sh_err_99011',
        customer: { email: 'invalid-email-format-test', first_name: 'Test', last_name: 'Failure' },
        line_items: []
      }, null, 2),
      'Validation Error: Invalid customer email format and order must contain at least 1 line item',
      'pending',
      1,
      6
    );

    insertFailure.run(
      uuidv4(),
      'woocommerce',
      'wc_err_77042',
      JSON.stringify({
        source: 'woocommerce',
        external_order_id: 'wc_err_77042',
        customer: { email: 'corrupted.data@sample.com', first_name: 'Corrupted', last_name: 'Record' },
        items: [{ sku: 'NON-EXISTENT-SKU-999', title: 'Corrupted Item', unit_price: -45.00, quantity: 1 }]
      }, null, 2),
      'Validation Error: Line item unit_price must be a positive number',
      'pending',
      2,
      14
    );

    // 6. Log Initial Audit Record
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertAudit.run(
      uuidv4(),
      'SYSTEM_INITIALIZATION',
      'SYSTEM',
      'root',
      JSON.stringify({ message: 'CRM database initialized with multi-store schema, 1000+ catalog, and demo data.' }),
      'system'
    );

    console.log('[Seed] Seeding completed successfully!');
  });

  seedTransaction();
}

if (require.main === module) {
  seedDatabase(true);
}

module.exports = { seedDatabase };
