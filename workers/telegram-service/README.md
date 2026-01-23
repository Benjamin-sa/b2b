# Telegram Notification Service

Cloudflare Worker service for sending push notifications to admin Telegram group chats.

## 🎯 Purpose

Provides centralized Telegram notification functionality for the B2B platform, replacing Firebase Functions implementation. Sends real-time notifications for:

- 📄 Invoice created/paid events
- 👤 New user registrations
- 💬 Custom admin messages

## 🏗️ Architecture

**Service Type**: Notification Service (accessed via service bindings)  
**Framework**: Hono  
**Platform**: Cloudflare Workers

## 📋 API Endpoints

### Health Check

```http
GET /
GET /health
```

### Invoice Notifications

#### Invoice Created

```http
POST /notifications/invoice/created
Content-Type: application/json

{
  "id": "in_xxx",
  "amount_due": 50000,
  "currency": "eur",
  "due_date": 1735689600,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "number": "INV-001",
  "metadata": {
    "orderMetadata": "{...}"
  },
  "lines": {
    "data": [...]
  }
}
```

#### Invoice Paid

```http
POST /notifications/invoice/paid
Content-Type: application/json

{
  "id": "in_xxx",
  "amount_paid": 50000,
  "currency": "eur",
  "customer_name": "John Doe",
  "status_transitions": {
    "paid_at": 1735689600
  },
  "metadata": {
    "orderMetadata": "{...}"
  }
}
```

### User Notifications

#### New User Registration

```http
POST /notifications/user/registered
Content-Type: application/json

{
  "userId": "user_xxx",
  "userData": {
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "Acme Corp",
    "email": "john@acme.com",
    "phone": "+31612345678",
    "btwNumber": "NL123456789B01",
    "address": {
      "street": "Main St",
      "houseNumber": "123",
      "postalCode": "1234AB",
      "city": "Amsterdam",
      "country": "Netherlands"
    }
  }
}
```

### Custom Messages

```http
POST /notifications/custom
Content-Type: application/json

{
  "message": "<b>Alert:</b> Something important happened!",
  "parseMode": "HTML"
}
```

**Parse Modes**: `HTML` (default), `Markdown`, `MarkdownV2`

## 🔧 Environment Variables

### Required Secrets (set via `wrangler secret put`)

```bash
# Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Telegram chat/group ID where notifications are sent
TELEGRAM_CHAT_ID=-1001234567890
```

### How to Get Credentials

1. **Bot Token**: Message [@BotFather](https://t.me/botfather) on Telegram:
   - Send `/newbot`
   - Follow instructions
   - Copy the token

2. **Chat ID**:
   - Add bot to your group
   - Send a message in the group
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find `"chat":{"id":-1001234567890}`

## 🚀 Usage from Other Workers

### Service Binding Setup

**1. Add binding to `wrangler.toml`:**

```toml
# In workers/api-gateway/wrangler.toml (or any other worker)
[[services]]
binding = "TELEGRAM_SERVICE"
service = "b2b-telegram-service"
```

**2. Add to types:**

```typescript
// workers/api-gateway/src/types/index.ts
export interface Env {
  TELEGRAM_SERVICE: Fetcher; // Add this
  // ... other bindings
}
```

**3. Call from your worker:**

```typescript
// Example: Send invoice notification from API Gateway
const request = new Request('https://dummy/notifications/invoice/created', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(invoice),
});

const response = await c.env.TELEGRAM_SERVICE.fetch(request);

if (!response.ok) {
  console.error('Failed to send Telegram notification');
}
```

### Usage Examples

#### From Stripe Service (Invoice Webhook)

```typescript
// workers/stripe-service/src/routes/webhooks.routes.ts
app.post('/webhook', async (c) => {
  const event = await stripe.webhooks.constructEvent(...);

  if (event.type === 'invoice.created') {
    const invoice = event.data.object;

    // Send Telegram notification
    const request = new Request('https://dummy/notifications/invoice/created', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });

    await c.env.TELEGRAM_SERVICE.fetch(request);
  }

  return c.json({ received: true });
});
```

#### From Auth Service (New User)

```typescript
// workers/auth-service/src/routes/auth.routes.ts
app.post('/register', async (c) => {
  const userData = await c.req.json();

  // Create user in DB
  const userId = nanoid();
  await c.env.DB.prepare('INSERT INTO users ...').run();

  // Send Telegram notification
  const request = new Request('https://dummy/notifications/user/registered', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userData }),
  });

  await c.env.TELEGRAM_SERVICE.fetch(request);

  return c.json({ success: true });
});
```

#### Custom Admin Alert

```typescript
// Send custom message from any worker
const alertMessage = `
⚠️ <b>Stock Alert</b>

Product: ${productName}
Stock Level: <b>${stockLevel}</b>
Threshold: ${threshold}

Action required!
`;

const request = new Request('https://dummy/notifications/custom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: alertMessage,
    parseMode: 'HTML',
  }),
});

await c.env.TELEGRAM_SERVICE.fetch(request);
```

## 📦 Development

### Install Dependencies

```bash
cd workers/telegram-service
npm install
```

### Set Secrets (Development)

```bash
wrangler secret put TELEGRAM_BOT_TOKEN --env dev
wrangler secret put TELEGRAM_CHAT_ID --env dev
```

### Local Development

```bash
npm run dev
# Service runs on http://localhost:8787
```

### Test Locally

```bash
# Test custom message
curl -X POST http://localhost:8787/notifications/custom \
  -H "Content-Type: application/json" \
  -d '{"message": "<b>Test</b> from local dev!"}'
```

## 🚀 Deployment

### Deploy to Development

```bash
npm run deploy:dev
# Deployed to: b2b-telegram-service-dev.workers.dev
```

### Deploy to Production

```bash
# Set production secrets first
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID

# Deploy
npm run deploy
# Deployed to: b2b-telegram-service.workers.dev
```

### Monitor Logs

```bash
# Production logs
npm run tail

# Development logs
npm run tail:dev
```

## 🔒 Security Notes

- ✅ Secrets stored in Cloudflare Workers Secrets (encrypted at rest)
- ✅ No authentication required (internal service binding only)
- ✅ Not exposed to public internet (accessed via service bindings)
- ⚠️ If exposing HTTP endpoint, add authentication middleware

## 📝 Message Formatting

Telegram supports HTML formatting:

```html
<b>bold</b>
<i>italic</i>
<code>inline code</code>
<pre>code block</pre>
<a href="url">link</a>
```

**Emojis supported**: 📄 💰 👤 🚚 📦 ✅ ⏳ ⚠️

## 🐛 Troubleshooting

### "Chat not found" error

- Ensure bot is added to the group
- Verify `TELEGRAM_CHAT_ID` is correct (use `/getUpdates` endpoint)

### "Unauthorized" error

- Check `TELEGRAM_BOT_TOKEN` is valid
- Ensure token matches the bot added to the group

### Messages not appearing

- Check bot permissions in group settings
- Ensure group privacy settings allow bots

## 📚 Related Files

- Original Firebase implementation: `/functions/src/config/telegram.js`
- Migration guide: See project copilot instructions

---

**Service Status**: ✅ Production Ready  
**Last Updated**: October 27, 2025
