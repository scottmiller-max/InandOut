# Email Notification System

## Overview

The InAndOut Moving app now has a complete email notification system integrated with Resend SMTP. Customers and team members will receive professional, branded emails for important events throughout the moving process.

## Components

### 1. Edge Function: `send-email`

**Location:** `supabase/functions/send-email/index.ts`

A Supabase Edge Function that handles all outbound emails via SMTP.

**Features:**
- Sends emails using Resend SMTP
- Requires authentication (JWT verification enabled)
- Supports both HTML and plain text emails
- Configurable reply-to addresses

### 2. Email Service

**Location:** `services/email.ts`

Provides pre-built email templates and sending functionality.

**Available Templates:**
- `sendBookingConfirmation()` - Sent when a customer books a move
- `sendJobStatusUpdate()` - Sent when job status changes
- `sendTeamAssignment()` - Sent when crew is assigned to a job
- `sendPaymentReceipt()` - Sent when payment is received

### 3. Notification Service Integration

**Location:** `services/notifications.ts`

Extended to send both push notifications AND emails for key events.

**Notification Functions:**
- `notifyJobBooked()` - Booking confirmation (email + push)
- `notifyJobStatusChange()` - Status updates (email + push)
- `notifyTeamAssigned()` - Team assignment (email only)
- `notifyPaymentReceived()` - Payment receipt (email + push)

## Configuration

All SMTP credentials are configured in `.env`:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_DTbc5pCh_JHzgAFMN5osH5Tt8paKAxfHf
SMTP_FROM_EMAIL=support@inandoutmovin.com
SMTP_FROM_NAME=IN&OUT Moving
```

## Usage Examples

### Sending a Booking Confirmation

```typescript
import { notificationService } from '@/services/notifications';

// When a job is created/confirmed
await notificationService.notifyJobBooked(jobId);
```

This will:
1. Send a professional booking confirmation email to the customer
2. Trigger a push notification
3. Include all job details (date, addresses, cost estimate)

### Sending a Status Update

```typescript
import { notificationService } from '@/services/notifications';

// When job status changes
await notificationService.notifyJobStatusChange(
  jobId,
  'in_progress',
  'Your moving team is on the way!'
);
```

### Sending a Custom Email

```typescript
import { emailService } from '@/services/email';

await emailService.sendEmail({
  to: 'customer@example.com',
  subject: 'Custom Subject',
  html: '<h1>Custom HTML Content</h1>',
  text: 'Plain text fallback',
  replyTo: 'support@inandoutmovin.com'
});
```

## Email Templates

All email templates use professional HTML styling with:
- Company branding
- Responsive design
- Clear call-to-action areas
- Plain text fallbacks
- Consistent color scheme (blue: #2563eb, green: #10b981)

### Template Sections

Each email includes:
1. **Header** - Blue branded header with title
2. **Content** - Main message with relevant details
3. **Info Box** - Highlighted job/booking information
4. **Footer** - Company contact information

## Integration Points

To trigger emails automatically, add notification calls in these locations:

### Quote Submission
```typescript
// In app/(tabs)/quote.tsx after successful booking
await notificationService.notifyJobBooked(newJob.id);
```

### Job Status Changes
```typescript
// In AdminDashboard when updating job status
await notificationService.notifyJobStatusChange(
  job.id,
  newStatus,
  'Status update message'
);
```

### Team Assignment
```typescript
// In AdminDashboard when assigning crew
await notificationService.notifyTeamAssigned(job.id, teamLeadId);
```

### Payment Processing
```typescript
// After successful payment in PaymentSection
await notificationService.notifyPaymentReceived(
  jobId,
  amount,
  'Credit Card',
  transactionId
);
```

## Testing

To test email functionality:

1. Ensure you're authenticated in the app
2. Trigger one of the notification functions
3. Check the recipient's inbox
4. Verify email formatting and content

## Security

- SMTP credentials are server-side only (not exposed to client)
- Edge Function requires authentication (JWT verification)
- All emails are sent through Supabase's secure infrastructure
- No email addresses are stored in client-side code

## Monitoring

Email sending results are logged to:
- Console (for debugging)
- Supabase Edge Function logs
- Can be extended to store in `email_logs` table for tracking

## Future Enhancements

Potential improvements:
- Email open tracking
- Click tracking for CTAs
- Email preferences management
- Additional templates (reminders, surveys, etc.)
- Email queuing for better reliability
- A/B testing for email content
