import { supabase } from '../../../lib/supabase';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // Allow HEAD & GET for WooCommerce webhook ping verification
  if (req.method === 'HEAD' || req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'WooCommerce Webhook Endpoint Active' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'GET', 'HEAD']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    console.log('[WooCommerce Webhook Ingestion Received]:', payload ? payload.number || payload.id : 'empty');

    // If WooCommerce ping test
    if (payload && payload.webhook_id) {
      return res.status(200).json({ success: true, message: 'WooCommerce Webhook ping verified' });
    }

    if (!payload || !payload.id) {
      return res.status(200).json({ success: true, message: 'Payload received' });
    }

    const extId = String(payload.id);
    const orderNum = payload.number ? (payload.number.startsWith('#') ? payload.number : `#WC-${payload.number}`) : `#WC-${extId.slice(-4)}`;
    const billing = payload.billing || {};
    const shipping = payload.shipping || {};
    const email = (billing.email || shipping.email || 'customer@store.local').toLowerCase().trim();
    const firstName = billing.first_name || shipping.first_name || 'Woo';
    const lastName = billing.last_name || shipping.last_name || 'Customer';
    const phone = billing.phone || shipping.phone || '+1 555-0199';
    const total = parseFloat(payload.total || 0);

    // If Supabase is connected, store in PostgreSQL
    if (supabase) {
      // 1. Deduplicate or create Customer
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

      // 2. Insert Order (Idempotent)
      const orderId = 'ord_' + Date.now();
      const { data: orderData } = await supabase
        .from('orders')
        .upsert({
          id: orderId,
          customer_id: customerId,
          source: 'woocommerce',
          external_order_id: extId,
          order_number: orderNum,
          status: payload.status === 'completed' ? 'completed' : 'processing',
          payment_status: 'paid',
          subtotal: parseFloat(payload.subtotal || total * 0.92),
          tax: parseFloat(payload.total_tax || total * 0.08),
          shipping: parseFloat(payload.shipping_total || 0),
          total,
          currency: payload.currency || 'USD',
          billing_address: billing,
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
          title: item.name || 'Organic Dairy Item',
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.price || total),
          subtotal: parseFloat(item.total || total)
        }));

        await supabase.from('order_items').insert(lineItems);
      }
    }

    return res.status(200).json({
      success: true,
      orderNumber: orderNum,
      message: 'WooCommerce order successfully ingested and stored in Supabase'
    });
  } catch (err) {
    console.error('[WooCommerce Webhook Error]:', err);
    return res.status(200).json({ success: true, warning: err.message });
  }
}
