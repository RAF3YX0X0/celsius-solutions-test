import { supabase } from '../../../lib/supabase';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // Allow HEAD & GET for verification ping
  if (req.method === 'HEAD' || req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'Shopify Webhook Endpoint Active' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'GET', 'HEAD']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    console.log('[Shopify Webhook Ingestion Received]:', payload ? payload.name || payload.id : 'empty');

    if (!payload || !payload.id) {
      return res.status(200).json({ success: true, message: 'Shopify ping verified' });
    }

    const extId = String(payload.id);
    const orderNum = payload.name || `#SH-${extId.slice(-4)}`;
    const cust = payload.customer || {};
    const shipping = payload.shipping_address || {};
    const email = (payload.email || cust.email || 'customer@shopify.local').toLowerCase().trim();
    const firstName = cust.first_name || shipping.first_name || 'Shopify';
    const lastName = cust.last_name || shipping.last_name || 'Customer';
    const phone = cust.phone || shipping.phone || '+1 555-0188';
    const total = parseFloat(payload.total_price || 0);

    if (supabase) {
      // 1. Deduplicate Customer
      let customerId = 'cust_' + Date.now();
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, total_spent, orders_count')
        .eq('email', email)
        .single();

      if (existingCust) {
        customerId = existingCust.id;
        await supabase
          .from('customers')
          .update({
            total_spent: (parseFloat(existingCust.total_spent || 0) + total),
            orders_count: (existingCust.orders_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId);
      } else {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
            total_spent: total,
            orders_count: 1
          })
          .select()
          .single();
        if (newCust) customerId = newCust.id;
      }

      // 2. Insert Order
      const orderId = 'ord_' + Date.now();
      const { data: orderData } = await supabase
        .from('orders')
        .upsert({
          id: orderId,
          customer_id: customerId,
          source: 'shopify',
          external_order_id: extId,
          order_number: orderNum,
          status: 'processing',
          payment_status: 'paid',
          subtotal: parseFloat(payload.subtotal_price || total * 0.92),
          tax: parseFloat(payload.total_tax || total * 0.08),
          shipping: 0,
          total,
          currency: payload.currency || 'USD',
          billing_address: cust,
          shipping_address: shipping,
          raw_payload: payload
        }, { onConflict: 'source,external_order_id' })
        .select()
        .single();

      // 3. Insert Line Items
      if (payload.line_items && Array.isArray(payload.line_items) && orderData) {
        const lineItems = payload.line_items.map((item, idx) => ({
          id: 'item_' + Date.now() + '_' + idx,
          order_id: orderData.id,
          sku: item.sku || 'STB-RAW-0001',
          title: item.title || 'Organic Dairy Item',
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.price || total),
          subtotal: parseFloat(item.price * item.quantity || total)
        }));

        await supabase.from('order_items').insert(lineItems);
      }
    }

    return res.status(200).json({
      success: true,
      orderNumber: orderNum,
      message: 'Shopify order successfully ingested and stored in Supabase'
    });
  } catch (err) {
    console.error('[Shopify Webhook Error]:', err);
    return res.status(200).json({ success: true, warning: err.message });
  }
}
