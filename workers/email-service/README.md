# 4Tparts Email Service

A Cloudflare Worker service for handling email notifications via SendGrid.

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Cloudflare account](https://cloudflare.com)
- [SendGrid account](https://sendgrid.com) with API key

### Setup

1. **Install dependencies:**

   ```bash
   cd workers/email-service
   npm install
   ```

2. **Configure environment:**

   ```bash
   # Set SendGrid API key
   wrangler secret put SENDGRID_API_KEY
   ```

3. **Development:**

   ```bash
   npm run dev
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

## 📧 API Endpoints

### Welcome Email

```http
POST /api/email/welcome
Content-Type: application/json

{
  "to": "user@company.com",
  "userName": "John Doe",
  "companyName": "Acme Corp"
}
```

### Health Check

```http
GET /health
```

### Service Info

```http
GET /
```

## 🔧 Configuration

### Environment Variables

- `SENDGRID_API_KEY` - Your SendGrid API key (secret)
- `ENVIRONMENT` - deployment environment (development/production)
- `FRONTEND_URL` - Your frontend URL for links
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins for CORS

### wrangler.toml

The configuration file defines different environments and their variables.

## 🧪 Testing

You can test the service locally using curl:

```bash
# Health check
curl http://localhost:8787/health

# Send welcome email
curl -X POST http://localhost:8787/api/email/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "userName": "Test User",
    "companyName": "Test Company"
  }'
```

## 📁 Project Structure

```
src/
├── index.ts              # Main worker entry point
├── handlers/
│   └── welcome.ts        # Welcome email handler
├── types/
│   └── email.ts          # TypeScript type definitions
└── utils/
    ├── sendgrid.ts       # SendGrid client
    └── validators.ts     # Validation utilities
```

## 🔒 Security

- CORS protection with configurable allowed origins
- Input validation for all email requests
- Secure API key management via Cloudflare secrets
- Rate limiting (handled by Cloudflare)

## 🚀 Next Steps

This is Phase 1 implementation. Future phases will include:

- User verification emails
- Password reset functionality
- Enhanced email templates
- Retry logic and error handling
- Monitoring and analytics
