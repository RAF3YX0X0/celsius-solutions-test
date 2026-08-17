# Central CRM | Multi-Store Order Management System
Centralized order management system integrating **Shopify** and **WooCommerce** with customer deduplication, Dead Letter Queue failure handling, HMAC signature security, and two-way status synchronization.

---

## 🌟 Key Features

1. **Multi-Store Central Dashboard**:
   - Total Orders, Revenue, Pending, Completed, and Cancelled metrics.
   - Shopify vs WooCommerce revenue and volume distribution.
   - Real-time Server-Sent Events (SSE) live ingestion stream.

2. **Unified Order Management**:
   - Distinct badges and filters for Shopify and WooCommerce.
   - Line items, shipping & billing addresses, financial breakdowns.
   - Two-way status synchronization (Pending &rarr; Processing &rarr; Completed &rarr; Cancelled &rarr; Refunded).
   - In-drawer raw webhook JSON inspector and audit trail.
   - Export to CSV & JSON.

3. **Customer Deduplication & Resolution**:
   - Email-based multi-store deduplication.
   - Unified multi-store purchase history and lifetime metrics.
   - Duplicate customer merge tool.

4. **High-Capacity Product Catalogue (1,000+ Products)**:
   - Over 1,000 realistic indexed products across 8 categories.
   - Instant search by SKU, title, category, and inventory levels.

5. **Webhook Security & Idempotency**:
   - HMAC SHA-256 signature verification (`X-Shopify-Hmac-Sha256` and `X-WC-Webhook-Signature`).
   - Duplicate replay protection via `UNIQUE(source, external_order_id)`.
   - Sliding-window rate limiter per IP.

6. **Failure Handling & Dead Letter Queue (DLQ)**:
   - Captures validation and format errors.
   - Raw error inspection, in-place JSON payload editing, and 1-click retry.

7. **Built-in Storefront Simulator & Test Suite**:
   - Reviewer test bench for Shopify checkouts, WooCommerce checkouts, HMAC tamper testing, and DLQ capture tests.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Application
```bash
npm start
```
Or with node directly:
```bash
node server.js
```

Open your browser at:
👉 **`http://localhost:3000`**

---

## 🔐 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@crm.local` | `admin123` |
| **Staff** | `staff@crm.local` | `staff123` |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user & retrieve JWT |
| `GET` | `/api/analytics/dashboard` | KPI analytics & revenue breakdown |
| `GET` | `/api/orders` | List orders (paginated, filtered, searchable) |
| `GET` | `/api/orders/:id` | Get single order details & audit history |
| `POST` | `/api/orders` | Create / Ingest order |
| `PATCH` | `/api/orders/:id` | Update order status (triggers 2-way sync) |
| `GET` | `/api/customers` | List unified customers |
| `GET` | `/api/customers/:id` | Get customer profile & multi-store order history |
| `POST` | `/api/customers/merge` | Merge duplicate customer profiles |
| `GET` | `/api/products` | Browse 1,000+ indexed product catalogue |
| `PATCH` | `/api/products/:id/stock` | Adjust stock quantity |
| `POST` | `/api/webhooks/shopify` | Secure Shopify webhook receiver |
| `POST` | `/api/webhooks/woocommerce` | Secure WooCommerce webhook receiver |
| `GET` | `/api/sync-failures` | Dead Letter Queue list |
| `POST` | `/api/sync-failures/:id/retry` | Retry failed synchronization |
| `GET` | `/api/events` | Server-Sent Events live stream |

---

## 🧪 End-to-End Reviewer Testing Guide

1. Open `http://localhost:3000`.
2. Click **Storefront Simulator** in the sidebar.
3. Test **Shopify Order**: Click **Place Shopify Order & Dispatch Webhook**.
4. Test **WooCommerce Order**: Switch to WooCommerce tab and place order with the same customer email.
5. Inspect **Customers**: See both Shopify and WooCommerce orders merged into the customer's profile!
6. Test **Security Tamper Check**: Switch to **Security & Tamper Test Lab** and run the tamper attack.
7. Test **Dead Letter Queue**: Click **Run Malformed Payload Test** and visit **Dead Letter Queue** to inspect and retry.
"# celsius-solutions-test" 
