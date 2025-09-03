// Import all function modules
const {
  onProductCreate,
  onProductUpdate,
  onProductDelete,
} = require("./functions/products");
const {
  onUserCreate,
  onUserUpdate,
  onUserDelete,
} = require("./functions/customers");
const { createInvoice, getUserInvoices } = require("./functions/payments");
const { stripeWebhook } = require("./functions/webhooks");
const { stripeHealth, systemStatus } = require("./functions/health");

// Export all functions
// Product management functions
exports.onProductCreate = onProductCreate;
exports.onProductUpdate = onProductUpdate;
exports.onProductDelete = onProductDelete;

// Customer management functions (NEW FEATURE)
exports.onUserCreate = onUserCreate;
exports.onUserUpdate = onUserUpdate;
exports.onUserDelete = onUserDelete;

// Payment functions
exports.createInvoice = createInvoice;
exports.getUserInvoices = getUserInvoices;

// Webhook handling
exports.stripeWebhook = stripeWebhook;

// Health check functions
exports.stripeHealth = stripeHealth;
exports.systemStatus = systemStatus;
