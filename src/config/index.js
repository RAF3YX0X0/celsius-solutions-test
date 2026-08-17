const path = require('path');

const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL_ENV;

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'crm_super_secret_jwt_key_2026_production',
  jwtExpiresIn: '7d',
  dbPath: process.env.DB_PATH || (isVercel ? '/tmp/crm.sqlite' : path.join(__dirname, '../../data/crm.sqlite')),
  shopifyWebhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || 'shpss_sec_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4',
  woocommerceWebhookSecret: process.env.WOOCOMMERCE_WEBHOOK_SECRET || 'wc_sec_77f8e9d0c1b2a3456789abcdef012345',
  corsOrigins: ['*'],
  rateLimitWindowMs: 60 * 1000, // 1 minute
  rateLimitMaxRequests: 200, // max 200 requests per minute per IP
  enableTwoWaySyncSimulation: true,
  shopifyStoreUrl: 'https://demo-central-store.myshopify.com',
  woocommerceStoreUrl: 'https://demo-central-woocommerce.store'
};

module.exports = config;
