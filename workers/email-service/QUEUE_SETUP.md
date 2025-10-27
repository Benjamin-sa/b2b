# Email Queue Setup Guide

## Overview

The Email Service now uses **Cloudflare Queues** for robust, asynchronous email delivery. This provides:

- ✅ **Automatic retries** - Failed emails are retried up to 3 times
- ✅ **Dead Letter Queue** - Failed messages after max retries go to DLQ for investigation
- ✅ **Batching** - Process up to 10 emails per batch for efficiency
- ✅ **Decoupling** - API Gateway doesn't wait for email delivery
- ✅ **Reliability** - Messages persist until successfully processed

## Architecture

```
API Gateway (Producer)
    ↓
    queue.send(EmailQueueMessage)
    ↓
Cloudflare Queue (b2b-email-queue)
    ↓
Email Service (Consumer)
    ↓
    • welcome email → sendWelcomeEmail()
    • password-reset → sendPasswordResetEmail()
    • verification → sendVerificationEmail()
```

## Queue Setup Commands

### 1. Create Production Queues

```bash
# Create main email queue (production)
wrangler queues create b2b-email-queue

# Create dead letter queue (production)
wrangler queues create b2b-email-dlq
```

### 2. Create Development Queues

```bash
# Create main email queue (dev)
wrangler queues create b2b-email-queue-dev

# Create dead letter queue (dev)
wrangler queues create b2b-email-dlq-dev
```

### 3. Verify Queues Exist

```bash
# List all queues
wrangler queues list

# Expected output:
# ┌────────────────────────┐
# │ Queue Name             │
# ├────────────────────────┤
# │ b2b-email-queue        │
# │ b2b-email-dlq          │
# │ b2b-email-queue-dev    │
# │ b2b-email-dlq-dev      │
# └────────────────────────┘
```

## Deployment

### Deploy Email Service (Consumer)

```bash
cd workers/email-service

# Deploy to dev
npm run deploy:dev

# Deploy to prod
npm run deploy
```

### Deploy API Gateway (Producer)

```bash
cd workers/api-gateway

# Deploy to dev
npm run deploy:dev

# Deploy to prod
npm run deploy
```

## Monitoring & Debugging

### Check Queue Status

```bash
# View queue details
wrangler queues consumer b2b-email-queue

# Dev queue
wrangler queues consumer b2b-email-queue-dev
```

### Monitor Logs

```bash
# Email Service logs (see queue processing)
wrangler tail b2b-email-service

# API Gateway logs (see queue sending)
wrangler tail b2b-api-gateway
```

### Check Dead Letter Queue

```bash
# If emails fail after max retries, check the DLQ
# (No direct command - inspect via Cloudflare Dashboard)

# Navigate to: Workers & Pages → Queues → b2b-email-dlq
```

## Message Format

All queue messages follow this TypeScript structure:

```typescript
// Welcome email
{
  type: 'welcome',
  email: 'user@example.com',
  firstName: 'John',
  companyName: 'ACME Corp',
  timestamp: '2025-10-27T12:00:00.000Z'
}

// Password reset
{
  type: 'password-reset',
  email: 'user@example.com',
  resetToken: 'abc123...', // Only in dev
  timestamp: '2025-10-27T12:00:00.000Z'
}

// Email verification
{
  type: 'verification',
  email: 'user@example.com',
  firstName: 'John',
  companyName: 'ACME Corp',
  verificationToken: 'xyz789...',
  timestamp: '2025-10-27T12:00:00.000Z'
}
```

## Queue Configuration

**Defined in `workers/email-service/wrangler.toml`:**

```toml
[[queues.consumers]]
queue = "b2b-email-queue"
max_batch_size = 10          # Process up to 10 emails per batch
max_batch_timeout = 30       # Wait 30s to fill batch before processing
max_retries = 3              # Retry failed messages 3 times
dead_letter_queue = "b2b-email-dlq"  # Send failures here after max retries
```

## Retry Behavior

1. **First attempt** - Email sends immediately when consumed from queue
2. **Retry 1** - If failed, retry after ~1 minute
3. **Retry 2** - If failed again, retry after ~5 minutes
4. **Retry 3** - Final retry after ~15 minutes
5. **Dead Letter Queue** - After 3 failed retries, message goes to DLQ

## Testing

### Local Development

```bash
# Run email service locally (simulates queue consumer)
cd workers/email-service
wrangler dev

# In another terminal, trigger registration (sends to queue)
# Frontend → API Gateway → Queue → Email Service (local)
```

### Send Test Email via Queue

```bash
# Not directly supported - trigger via API Gateway routes:
# POST /auth/register (sends welcome email)
# POST /auth/password-reset/request (sends reset email)
```

## Troubleshooting

### Queue Not Processing Messages

```bash
# Check if email service is deployed and consuming
wrangler queues consumer b2b-email-queue

# Should show:
# Consumer: b2b-email-service
# Status: Active
```

### Messages Stuck in Queue

```bash
# Check email service logs for errors
wrangler tail b2b-email-service

# Look for:
# ❌ [Email Queue] Failed to send...
```

### SendGrid Errors

Check that `SENDGRID_API_KEY` secret is set:

```bash
# Set for production
wrangler secret put SENDGRID_API_KEY

# Set for dev
wrangler secret put SENDGRID_API_KEY --env dev
```

## Migration Notes

**Previous behavior:**
- API Gateway called Email Service via service binding
- If email failed, error was logged but registration succeeded

**New behavior:**
- API Gateway sends message to queue (always succeeds)
- Email Service processes queue asynchronously
- Failed emails retry automatically
- Registration never fails due to email issues

**Backwards compatibility:**
- HTTP endpoints (`/email/welcome`, etc.) still work
- Queue is now the **preferred** method
- HTTP endpoints may be removed in future version
