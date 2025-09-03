# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

# Stripe and Firebase Setup

This project uses [Firebase](https://firebase.google.com/) and [Stripe.js](https://stripe.com/docs/js) for authentication, database, and payments.

## Installation

Dependencies are already installed:

```
npm install firebase @stripe/stripe-js
```

## Configuration

1. Copy `.env.example` to `.env` and fill in your credentials:

```
cp .env.example .env
```

2. Add your Firebase and Stripe keys to `.env`:

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Usage

- **Firebase**: Import and use the initialized app from `src/firebase.ts`.
- **Stripe**: Import `stripePromise` from `src/stripe.ts` and use it to interact with Stripe.js.

## Example

```ts
// src/main.ts
import { firebaseApp } from "./firebase";
import { stripePromise } from "./stripe";
```

See the respective files for more details.

---

For more info, see the [Firebase docs](https://firebase.google.com/docs/web/setup) and [Stripe.js docs](https://stripe.com/docs/js).
