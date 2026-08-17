- Custom CRM
Develop a separate CRM application that acts as the central order-management system for both stores.
CRM Dashboard
• Total orders
• Total revenue
• Pending orders
• Completed orders
• Cancelled orders
• Recent orders
CRM Orders
• Internal order ID
• External order ID
• Order source
• Customer
• Email
• Phone
• Billing address
• Shipping address
• Products
• Quantities
• Subtotal
• Discount
• Tax
• Shipping
• Total
• Payment status
• Order status
• Created date
Clearly identify the source of every order as Shopify or WooCommerce.
- CRM — Customers
• View customers
• Search customers
• View customer details
• View customer order history
• Avoid unnecessary duplicate customer records
— Shopify -> CRM Integration
When an order is created on Shopify, it must automatically reach the CRM using an appropriate webhook/API integration.
Shopify Order -> Webhook/API -> CRM API -> Validation -> Database -> CRM Order
Store the Shopify external order identifier in the CRM.
— WooCommerce -> CRM Integration
When an order is created in WooCommerce, it must automatically reach the CRM.
WooCommerce Order -> Webhook/API -> CRM API -> Validation -> Database -> CRM Order
The CRM must identify the order as originating from WooCommerce.
- API Requirements
The CRM must expose an appropriate REST API. The exact route structure may differ if the architecture is justified.
POST /api/orders
GET /api/orders
GET /api/orders/{id}
PATCH /api/orders/{id}
GET /api/customers
GET /api/customers/{id}
GET /api/products
• Authentication
• Authorization
• Request validation
• Error handling
• Appropriate HTTP status codes
• Pagination
• Filtering
• Logging
- Webhook Security
External systems must not be able to submit arbitrary order data to the CRM without validation.
• Authentication
• Signature verification where supported
• Request validation
• Input sanitization
• Replay/duplicate protection
• Rate limiting where appropriate
Document your security approach.
- Duplicate Order Protection
The CRM must handle duplicate webhook/API requests without creating duplicate orders.
Example: Shopify + External Order ID = unique order identity
Apply the same principle to WooCommerce. The integration should be idempotent.
- Failure Handling
Consider a situation where a store sends an order but the CRM API is temporarily unavailable.
• Detect and log failed synchronization
• Store enough information to retry
• Provide visibility into failed synchronization
• Prevent duplicates when a request is retried
A complex distributed queue is not mandatory unless your architecture requires it, but the failure mode must be understood
and addressed.
- Order Status Synchronization
• Pending
• Processing
• Completed
• Cancelled
• Refunded
Two-way status synchronization between CRM and the stores is optional and will be considered an additional strength.
- Database Design
Design an appropriate relational database structure for the CRM.
Customers
|
Orders
|
Order Items
|
Products
|
Store
|
External Order ID
|
CRM Order
Submit the database schema/ERD with the project.
- Authentication & Access Control
• Login
• Logout
• Protected CRM routes
Basic role-based access control such as Admin and Staff is encouraged.
- Performance Requirements
The system should be designed with the expectation that the catalogue may grow beyond 1,000 products.
• Database indexing
• Efficient queries
• Pagination
• API pagination
• Image optimization
• Lazy loading
• Caching where appropriate
• Avoid unnecessary API requests
• Avoid unnecessary frontend rendering
Be prepared to explain how the architecture would scale to 10,000+ products and higher order volumes.
- Responsive Design
• Desktop
• Tablet
• Mobile
The CRM should also provide a usable responsive interface.
- Code Quality
• Code organization
• Reusability
• Naming conventions
• Separation of concerns
• Maintainability
• Error handling
• Security
• Performance
• Documentation
Avoid unnecessary duplication and unexplained complexity.
- Deployment
• Working WordPress/WooCommerce environment
• Working Shopify development/test store
• Working CRM environment
The reviewer must be able to test the complete end-to-end workflow.
