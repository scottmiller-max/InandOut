# External Services Configuration Guide

## IN&OUT Moving App - Service Integration Documentation

This document provides comprehensive configuration instructions for all external services integrated with the IN&OUT Moving application.

---

## Table of Contents

1. [Supabase Database](#supabase-database)
2. [Slack Integration](#slack-integration)
3. [Stripe Payment Processing](#stripe-payment-processing)
4. [Vapi AI Assistant (Riley)](#vapi-ai-assistant-riley)
5. [Sentry Error Tracking](#sentry-error-tracking)
6. [Security Best Practices](#security-best-practices)
7. [Service Health Checks](#service-health-checks)
8. [Troubleshooting](#troubleshooting)

---

## Supabase Database

### Overview

Supabase serves as the primary backend database, authentication provider, and real-time subscription service for the IN&OUT Moving application.

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Configuration Steps

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Navigate to Settings > API to retrieve your project URL and anon key
3. Add the credentials to your `.env` file
4. Ensure Row Level Security (RLS) is enabled on all tables

### Usage Example

```typescript
import { supabase } from './services/supabase';

const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('status', 'active');
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile information |
| `moves` | Job/move records |
| `consultations` | Consultation bookings |
| `admin_alerts` | Admin notification queue |
| `messages` | Customer-admin messaging |
| `payments` | Payment records |
| `invoices` | Invoice management |
| `documents` | Document storage references |

### Security Configuration

- All tables have RLS enabled
- Authenticated users can only access their own data
- Admin users have elevated permissions via role-based policies
- Service role key is never exposed to client-side code

---

## Slack Integration

### Overview

Slack integration provides real-time notifications for admin users regarding new bookings, job status changes, customer messages, and urgent alerts requiring attention.

### Environment Variables

```env
EXPO_PUBLIC_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
EXPO_PUBLIC_SLACK_BOT_TOKEN=xoxb-your-bot-token
```

### Configuration Steps

#### Webhook Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Navigate to "Incoming Webhooks" and enable them
4. Click "Add New Webhook to Workspace"
5. Select the channel for notifications (e.g., #moving-alerts)
6. Copy the webhook URL to your `.env` file

#### Bot Token Setup (Optional - for channel posting)

1. In your Slack app, go to "OAuth & Permissions"
2. Add the following Bot Token Scopes:
   - `chat:write`
   - `chat:write.public`
3. Install the app to your workspace
4. Copy the Bot User OAuth Token to your `.env` file

### Usage Examples

#### Basic Notification

```typescript
import { slackMessaging } from './services/slackMessaging';

await slackMessaging.sendNotification({
  text: 'New booking received!',
});
```

#### Job Notification

```typescript
await slackMessaging.notifyNewJob(
  'JOB-2024-001',
  'John Smith',
  'Local Move',
  '2024-01-15'
);
```

#### Status Change Notification

```typescript
await slackMessaging.notifyJobStatusChange(
  'JOB-2024-001',
  'scheduled',
  'in_progress',
  'John Smith'
);
```

#### Urgent Alert

```typescript
await slackMessaging.sendUrgentAlert(
  'AI Booking Requires Approval',
  'Customer completed AI analysis, estimated cost: $2,500',
  {
    Customer: 'Jane Doe',
    'Estimated Cost': '$2,500',
    Status: 'Pending Approval'
  }
);
```

### Notification Types

| Type | Color | Use Case |
|------|-------|----------|
| New Job | Blue (#2563eb) | Job creation notifications |
| Status Change | Varies by status | Job status updates |
| Customer Message | Purple (#8b5cf6) | Incoming customer messages |
| Urgent Alert | Red (#dc2626) | Requires immediate attention |
| Consultation | Blue (#3b82f6) | New consultation bookings |

### Testing Slack Integration

Use the test utility to verify your Slack configuration:

```typescript
import { runAllSlackTests, checkSlackConfiguration } from './utils/testSlackIntegration';

const config = checkSlackConfiguration();
console.log('Configuration status:', config.status);

const results = await runAllSlackTests();
console.log('Test results:', results.summary);
```

---

## Stripe Payment Processing

### Overview

Stripe handles all payment processing, including checkout sessions and webhook events for payment confirmations.

### Environment Variables

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

Note: The Stripe secret key should only be used server-side in Edge Functions, never in client code.

### Configuration Steps

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Navigate to Developers > API Keys
3. Copy the publishable key to your `.env` file
4. Set up the secret key in Supabase Edge Function environment variables

### Edge Functions

#### Checkout Session (stripe-checkout)

Creates a Stripe checkout session for payment processing.

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/stripe-checkout`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 25000,
      currency: 'usd',
      customerId: 'customer_123',
      jobId: 'job_456',
      description: 'Local Move Service',
    }),
  }
);
```

#### Webhook Handler (stripe-webhook)

Processes Stripe webhook events for payment confirmations.

Supported events:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Security Considerations

- Never log or expose Stripe secret keys
- Validate webhook signatures in production
- Use test keys during development
- Implement idempotency for webhook processing

---

## Vapi AI Assistant (Riley)

### Overview

Riley is the AI-powered virtual assistant that helps customers with move estimates, scheduling consultations, and answering questions about services.

### Environment Variables

```env
EXPO_PUBLIC_VAPI_API_KEY=your_vapi_api_key
EXPO_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id
EXPO_PUBLIC_VAPI_PHONE_NUMBER=+18087552527
```

### Configuration Steps

1. Create an account at [vapi.ai](https://vapi.ai)
2. Create a new assistant with the Riley configuration
3. Configure the assistant's voice, personality, and capabilities
4. Retrieve the API key and Assistant ID from the dashboard
5. Set up a phone number for voice interactions (optional)

### Usage Example

```typescript
import { rileyAI } from './services/rileyAI';

const response = await rileyAI.startConversation({
  customerId: 'customer_123',
  context: 'moving_estimate',
});
```

### Features

- Real-time chat conversations
- Voice call support
- Move estimation assistance
- Consultation scheduling
- FAQ responses
- Handoff to human agents

---

## Sentry Error Tracking

### Overview

Sentry provides real-time error tracking, performance monitoring, and issue management for the application.

### Environment Variables

```env
EXPO_PUBLIC_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/1234567
```

### Configuration Steps

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project for React Native / Expo
3. Copy the DSN from Project Settings > Client Keys
4. Add the DSN to your `.env` file

### Usage Example

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.captureException(error);

Sentry.captureMessage('Important event occurred', {
  level: 'info',
  tags: { feature: 'booking' },
});
```

### Features

- Automatic error capture
- Performance monitoring
- Release tracking
- User feedback collection
- Issue assignment and tracking

---

## Security Best Practices

### Environment Variables

1. **Never commit `.env` files to version control**
   - Add `.env` to `.gitignore`
   - Use `.env.example` as a template

2. **Use appropriate key types**
   - Client-side: Only use publishable/public keys
   - Server-side: Secret keys in Edge Functions only

3. **Rotate keys regularly**
   - Schedule periodic key rotation
   - Update all environments when rotating

### API Security

1. **Validate all inputs**
   - Sanitize user inputs before API calls
   - Use TypeScript for type safety

2. **Implement rate limiting**
   - Use Supabase RLS for database access control
   - Implement client-side throttling for API calls

3. **Secure webhooks**
   - Validate webhook signatures
   - Use HTTPS only
   - Implement idempotency

### Data Protection

1. **Encrypt sensitive data**
   - Use Supabase encryption for sensitive columns
   - Never store plaintext credentials

2. **Audit logging**
   - Log all administrative actions
   - Monitor for suspicious activity

---

## Service Health Checks

### Supabase Health Check

```typescript
async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
```

### Slack Health Check

```typescript
import { checkSlackConfiguration } from './utils/testSlackIntegration';

const slackStatus = checkSlackConfiguration();
console.log('Slack configured:', slackStatus.webhookConfigured);
```

### Stripe Health Check

```typescript
async function checkStripeHealth(): Promise<boolean> {
  return !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}
```

### Comprehensive Health Check

```typescript
async function checkAllServices(): Promise<{
  supabase: boolean;
  slack: boolean;
  stripe: boolean;
  vapi: boolean;
  sentry: boolean;
}> {
  return {
    supabase: await checkSupabaseHealth(),
    slack: checkSlackConfiguration().webhookConfigured,
    stripe: !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    vapi: !!process.env.EXPO_PUBLIC_VAPI_API_KEY,
    sentry: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  };
}
```

---

## Troubleshooting

### Supabase Issues

**Problem:** Connection timeout
- Check your network connectivity
- Verify the Supabase URL is correct
- Ensure the project is not paused

**Problem:** RLS policy errors
- Check that RLS policies allow the operation
- Verify user authentication status
- Review policy conditions

### Slack Issues

**Problem:** Messages not sending
- Verify webhook URL is correct
- Check if the webhook is still active in Slack
- Ensure the channel exists and webhook has access

**Problem:** Bot token errors
- Verify bot token has required scopes
- Check if app is installed to workspace
- Ensure token hasn't been revoked

### Stripe Issues

**Problem:** Checkout session fails
- Verify publishable key is correct
- Check Stripe dashboard for error details
- Ensure webhook endpoint is accessible

**Problem:** Webhook events not processing
- Verify webhook secret is correct
- Check Edge Function logs for errors
- Ensure webhook endpoint URL is correct in Stripe

### Vapi Issues

**Problem:** Assistant not responding
- Verify API key and Assistant ID
- Check Vapi dashboard for usage limits
- Review assistant configuration

### Sentry Issues

**Problem:** Events not appearing
- Verify DSN is correct
- Check network connectivity
- Ensure Sentry SDK is properly initialized

---

## Quick Reference

### Required Environment Variables

```env
# Required
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Recommended
EXPO_PUBLIC_SLACK_WEBHOOK_URL=
EXPO_PUBLIC_SENTRY_DSN=

# Optional
EXPO_PUBLIC_SLACK_BOT_TOKEN=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_VAPI_API_KEY=
EXPO_PUBLIC_VAPI_ASSISTANT_ID=
EXPO_PUBLIC_VAPI_PHONE_NUMBER=
```

### Service URLs

| Service | Dashboard URL |
|---------|---------------|
| Supabase | https://supabase.com/dashboard |
| Slack | https://api.slack.com/apps |
| Stripe | https://dashboard.stripe.com |
| Vapi | https://dashboard.vapi.ai |
| Sentry | https://sentry.io |

---

*Last Updated: January 2026*
*Version: 1.0.0*
