const functions = require("firebase-functions");

if (process.env.FUNCTIONS_EMULATOR === "true") {
  require("dotenv").config();
}

let stripeInstance;
let webhookSecretCache;

const getStripe = () => {
  if (stripeInstance) return stripeInstance;

  let stripeKey;
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    stripeKey = process.env.STRIPE_SECRET_KEY;
  } else {
    // functions.config() + fallback naar env (voor het geval)
    const cfg =
      typeof functions.config === "function" ? functions.config() : {};
    stripeKey = cfg?.stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
    console.log(
      "stripe cfg present:",
      !!cfg?.stripe,
      "keyLen:",
      stripeKey ? String(stripeKey).length : 0
    );
  }

  if (!stripeKey) {
    throw new Error(
      "Stripe config (stripe.secret_key) ontbreekt. Zet met: firebase functions:config:set stripe.secret_key=..."
    );
  }
  stripeInstance = require("stripe")(stripeKey);
  return stripeInstance;
};

const getWebhookSecret = () => {
  if (webhookSecretCache) return webhookSecretCache;

  if (process.env.FUNCTIONS_EMULATOR === "true") {
    webhookSecretCache = process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    const cfg =
      typeof functions.config === "function" ? functions.config() : {};
    webhookSecretCache =
      cfg?.stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
  }

  if (!webhookSecretCache) {
    throw new Error(
      "Stripe webhook secret ontbreekt. Zet met: firebase functions:config:set stripe.webhook_secret=..."
    );
  }
  return webhookSecretCache;
};

module.exports = { getStripe, getWebhookSecret };
