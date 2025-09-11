const { createInvoice, getUserInvoices } = require("./functions/payments");
const { stripeWebhook } = require("./functions/webhooks");
const { stripeHealth, systemStatus } = require("./functions/health");
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
const { requestPasswordReset } = require("./functions/passwordReset");
const { sendWelcomeEmailOnUserCreate } = require("./functions/welcomeEmail");
const {
  sendVerificationEmailOnApproval,
} = require("./functions/verificationEmail");

// Product
exports.onProductCreate = onProductCreate;
exports.onProductUpdate = onProductUpdate;
exports.onProductDelete = onProductDelete;

// Customers
exports.onUserCreate = onUserCreate;
exports.onUserUpdate = onUserUpdate;
exports.onUserDelete = onUserDelete;

// Auth
exports.requestPasswordReset = requestPasswordReset;

// Email Functions
exports.sendWelcomeEmailOnUserCreate = sendWelcomeEmailOnUserCreate;
exports.sendVerificationEmailOnApproval = sendVerificationEmailOnApproval;

// Payments
exports.createInvoice = createInvoice;
exports.getUserInvoices = getUserInvoices;

// Webhooks / Health
exports.stripeWebhook = stripeWebhook;
exports.stripeHealth = stripeHealth;
exports.systemStatus = systemStatus;
