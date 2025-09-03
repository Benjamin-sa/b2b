const Stripe = require("stripe");
const dotenv = require("dotenv");

// Load .env for local development
dotenv.config();

// Initialize Stripe with secret
const stripeSecret = process.env.STRIPE_SECRET;
if (!stripeSecret) {
  throw new Error(
    "Stripe secret key not configured. Set STRIPE_SECRET environment variable."
  );
}

const stripeOptions = {};
const configuredApiVersion = process.env.STRIPE_API_VERSION;
if (configuredApiVersion) {
  stripeOptions.apiVersion = configuredApiVersion;
}

const stripe = new Stripe(stripeSecret, stripeOptions);

module.exports = stripe;
