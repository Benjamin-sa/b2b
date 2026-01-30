# Email Deliverability Guide - 4Tparts B2B

## ✅ Changes Made to Fix Spam Issues

### 1. Email Content Fixes (Completed)

- ✅ Fixed subject-content mismatch: Changed "Verify Your Email" → "Your 4Tparts B2B Account Has Been Approved"
- ✅ Reduced exclamation marks (spam trigger)
- ✅ Improved professional tone
- ✅ Added Reply-To header
- ✅ Added X-Entity-Ref-ID header for tracking
- ✅ Balanced HTML/text versions

### 2. DNS Authentication (REQUIRED - Action Needed)

**You MUST configure these DNS records for your sending domain:**

#### SPF Record

Add this TXT record to `4tparts.com`:

```
v=spf1 include:_spf.resend.com ~all
```

#### DKIM Record

1. Log into Resend Dashboard → Settings → Domains
2. Add `4tparts.com` as a verified domain
3. Copy the DKIM TXT records provided by Resend
4. Add them to your DNS (usually 3 records: `resend._domainkey`, `resend2._domainkey`, etc.)

#### DMARC Record

Add this TXT record to `_dmarc.4tparts.com`:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@4tparts.com; pct=100; adkim=s; aspf=s
```

**Check current status:**

```bash
# Check SPF
dig TXT 4tparts.com | grep spf

# Check DKIM
dig TXT resend._domainkey.4tparts.com

# Check DMARC
dig TXT _dmarc.4tparts.com
```

### 3. Resend Domain Verification

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter `4tparts.com`
4. Follow the verification steps (add DNS records)
5. Wait for verification (can take up to 72 hours)

**Current sender**: `noreply@4tparts.com`

- Change this to a real inbox like `no-reply@4tparts.com` and set up auto-responder

### 4. Email Warm-up Strategy

**Week 1**: Send 50 emails/day
**Week 2**: Send 100 emails/day
**Week 3**: Send 200 emails/day
**Week 4**: Send 500 emails/day
**Week 5+**: Normal volume

**Tips:**

- Start with most engaged users (those who opened previous emails)
- Monitor bounce rates (keep < 2%)
- Monitor complaint rates (keep < 0.1%)

### 5. Additional Improvements

#### A. Add Unsubscribe Link (Transactional Emails)

```typescript
// In verification.ts, add to HTML:
<p style="font-size: 12px; color: #999;">
  <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe from account notifications</a>
</p>

// In Resend client, add header:
headers: {
  'List-Unsubscribe': `<mailto:unsubscribe@4tparts.com?subject=unsubscribe>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}
```

#### B. Monitor Email Reputation

- Use https://www.mail-tester.com/ to test emails (score should be > 8/10)
- Check blacklists: https://mxtoolbox.com/blacklists.aspx
- Monitor Resend dashboard for bounces/complaints

#### C. Improve Content Quality

- ✅ Use more text than images (currently text-heavy, good)
- ✅ Avoid spam trigger words: "Free", "Click here", "Act now", excessive caps
- ✅ Include physical address in footer (for CAN-SPAM compliance)
- ✅ Keep subject line under 50 characters
- ✅ Personalize content (already using {userName})

### 6. Testing Checklist

Before sending production emails:

```bash
# 1. Test email content
curl -X POST https://b2b-email-service.YOUR-SUBDOMAIN.workers.dev/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "type": "verification",
    "data": {
      "userName": "Test User",
      "companyName": "Test Company",
      "verificationUrl": "https://4tparts.com/verify?token=test"
    }
  }'

# 2. Check spam score
# Forward the email to check@mail-tester.com
# Visit https://www.mail-tester.com/

# 3. Test in multiple email clients
# - Gmail (desktop + mobile)
# - Outlook (desktop + mobile)
# - Apple Mail
# - Yahoo Mail
```

### 7. Monitoring & Alerts

**Set up Cloudflare alerts for:**

- Email bounce rate > 2%
- Email complaint rate > 0.1%
- Delivery failures > 5%

**Resend Dashboard:**

- Monitor open rates (should be > 20% for transactional emails)
- Check bounce types (hard vs. soft)
- Watch for spam complaints

### 8. CAN-SPAM Compliance

Add this footer to all emails:

```html
<tr>
  <td style="padding: 20px 40px; border-top: 1px solid #eee; text-align: center;">
    <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">
      4Tparts B.V.<br />
      Your Company Address<br />
      City, Postal Code, Netherlands
    </p>
    <p style="margin: 0; font-size: 12px; color: #666;">
      This email was sent to ${to} for your 4Tparts B2B account.<br />
      You're receiving this because your account was recently approved.
    </p>
  </td>
</tr>
```

## 📊 Current Status

| Item                      | Status           | Priority     |
| ------------------------- | ---------------- | ------------ |
| Subject-content match     | ✅ Fixed         | High         |
| Exclamation marks reduced | ✅ Fixed         | Medium       |
| Reply-To header           | ✅ Added         | Medium       |
| SPF record                | ⚠️ Action needed | **Critical** |
| DKIM records              | ⚠️ Action needed | **Critical** |
| DMARC policy              | ⚠️ Action needed | **Critical** |
| Domain verification       | ⚠️ Action needed | **Critical** |
| Email warm-up             | ⏳ Pending       | High         |
| Physical address          | ❌ Missing       | Medium       |
| Unsubscribe link          | ❌ Missing       | Low          |

## 🚀 Next Steps (DO THIS NOW)

1. **Add DNS records** (SPF, DKIM, DMARC) - **Critical**
2. **Verify domain** in Resend dashboard - **Critical**
3. **Add physical address** to email footer
4. **Test with mail-tester.com** (target score: 9/10+)
5. **Start warm-up** with 50 emails/day
6. **Monitor** Resend dashboard for 48 hours

## 📞 Support

- Resend Support: https://resend.com/support
- DNS Issues: Contact your domain registrar (Cloudflare, GoDaddy, etc.)
- Email Deliverability: https://resend.com/docs/dashboard/domains/deliverability
