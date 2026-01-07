# Email Notification System

## Overview

The InAndOut Moving app features a comprehensive email notification system with user preferences, throttling, delivery tracking, and professional branded templates. The system integrates with SMTP providers (Resend, SendGrid, or any SMTP service) and includes admin monitoring tools.

## Components

### 1. Database Tables

#### `job_notifications`
Tracks all notification attempts across all channels (email, push, SMS).

**Fields:**
- `id` - Unique identifier
- `job_id` - Associated move job
- `user_id` - Recipient user
- `notification_type` - booking_confirmation, status_update, team_assignment, payment_receipt
- `channel` - email, push, or sms
- `status` - pending, sent, or failed
- `error_message` - Error details for failed attempts
- `sent_at` - Timestamp when sent
- `metadata` - Additional data (subject, template, etc.)

#### `user_notification_preferences`
Stores user opt-in/opt-out settings for different notification types.

**Fields:**
- `user_id` - User identifier (primary key)
- `email_enabled` - Master switch for email notifications (default: true)
- `push_enabled` - Push notifications toggle (default: true)
- `sms_enabled` - SMS notifications toggle (default: false)
- `booking_confirmations` - Receive booking confirmations (default: true)
- `status_updates` - Receive status updates (default: true)
- `team_assignments` - Receive team assignment notifications (default: true)
- `payment_receipts` - Receive payment receipts (default: true)

**Important:** Default preferences are automatically created for new users via database trigger.

#### `email_throttle_log`
Prevents spam by limiting email frequency (max 1 per type per 15 minutes).

**Fields:**
- `user_id` - User identifier
- `job_id` - Associated job
- `notification_type` - Type of notification
- `last_sent_at` - Last email send timestamp
- `send_count` - Number of emails sent in window
- `window_start` - When throttle window started

### 2. Edge Function: `send-email`

**Location:** `supabase/functions/send-email/index.ts`

A Supabase Edge Function that handles all outbound emails via SMTP.

**Features:**
- Sends emails using configurable SMTP provider
- Requires authentication (JWT verification enabled)
- Supports both HTML and plain text emails
- Configurable reply-to addresses
- CORS support for cross-origin requests

### 3. Email Service

**Location:** `services/email.ts`

Comprehensive email service with user preferences, throttling, and delivery tracking.

**Core Functions:**
- `checkUserPreferences()` - Verifies user has notifications enabled
- `checkThrottle()` - Ensures emails aren't sent too frequently (15-min window)
- `logNotification()` - Tracks all email attempts in database
- `updateThrottleLog()` - Updates throttle tracking after send
- `sendEmailWithContext()` - Main function that handles preferences, throttling, and logging

**Available Email Templates:**
- `sendBookingConfirmation()` - Booking confirmation with job details
- `sendJobStatusUpdate()` - Status change notifications
- `sendTeamAssignment()` - Team/crew assignment alerts
- `sendPaymentReceipt()` - Payment confirmation with receipt

**All templates now require:**
- `userId` - For preference checking
- `jobId` - For throttling and tracking
- Standard email fields (recipient, subject, content)

### 4. User Interface Components

#### NotificationPreferences Component
**Location:** `components/NotificationPreferences.tsx`

User-facing UI for managing notification settings.

**Features:**
- Toggle switches for each notification type
- Master switches for email, push, and SMS
- Real-time updates to database
- Summary display showing current settings
- Clear descriptions for each option

**Integrated in:** Profile screen (`app/(tabs)/profile.tsx`)

#### EmailDeliveryStatus Component
**Location:** `components/EmailDeliveryStatus.tsx`

Admin dashboard component for monitoring email delivery.

**Features:**
- Lists all email notification attempts
- Filter by status (sent, failed, pending)
- Filter by notification type
- Displays error messages for failures
- Refresh functionality
- Stats summary (sent/failed/pending counts)
- Resend button for failed emails (coming soon)

**Usage:**
```typescript
// For all customers
<EmailDeliveryStatus />

// For specific customer
<EmailDeliveryStatus customerId={userId} />
```

## Configuration

### Environment Variables

All SMTP credentials must be configured in the Supabase Edge Function environment (not in `.env`):

**Required Variables:**
```
SMTP_HOST=smtp.resend.com (or your SMTP provider)
SMTP_PORT=587
SMTP_USER=resend (or your username)
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_EMAIL=support@inandoutmovin.com
SMTP_FROM_NAME=IN&OUT Moving
```

**Setup Instructions:**
1. Navigate to Supabase Dashboard → Edge Functions
2. Select the `send-email` function
3. Add each environment variable in the function settings
4. Redeploy the function after adding variables

### Throttling Configuration

Email throttling is configured in `services/email.ts`:

```typescript
const THROTTLE_WINDOW_MINUTES = 15;
```

This prevents sending more than 1 email of the same type per job within 15 minutes.

**To modify:**
- Edit the constant in `services/email.ts`
- Rebuild the app
- No database changes needed

## Usage Examples

### Sending a Booking Confirmation (Recommended)

```typescript
import { emailService } from '@/services/email';

await emailService.sendBookingConfirmation({
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  jobNumber: 'JOB-2024-001',
  moveDate: 'January 15, 2024',
  fromAddress: '123 Main St, Honolulu, HI',
  toAddress: '456 Beach Rd, Kailua, HI',
  estimatedCost: '$850',
  userId: user.id,  // Required for preferences
  jobId: job.id,    // Required for throttling
});
```

**This automatically:**
1. Checks if user has email notifications enabled
2. Checks if user wants booking confirmations
3. Verifies throttle window (prevents duplicate sends)
4. Logs the attempt to `job_notifications` table
5. Updates throttle log after successful send
6. Sends professional branded email

### Sending a Status Update

```typescript
import { emailService } from '@/services/email';

await emailService.sendJobStatusUpdate({
  customerEmail: customer.email,
  customerName: customer.name,
  jobNumber: job.number,
  status: 'In Progress',
  message: 'Your moving team has arrived and is loading your items.',
  userId: customer.id,
  jobId: job.id,
});
```

### Sending a Team Assignment

```typescript
import { emailService } from '@/services/email';

await emailService.sendTeamAssignment({
  teamEmail: teamMember.email,
  teamMemberName: teamMember.name,
  jobNumber: job.number,
  moveDate: job.moveDate,
  fromAddress: job.fromAddress,
  toAddress: job.toAddress,
  userId: teamMember.id,
  jobId: job.id,
});
```

### Sending a Payment Receipt

```typescript
import { emailService } from '@/services/email';

await emailService.sendPaymentReceipt({
  customerEmail: customer.email,
  customerName: customer.name,
  jobNumber: job.number,
  amount: '$850.00',
  paymentMethod: 'Credit Card',
  transactionId: 'ch_1234567890',
  userId: customer.id,
  jobId: job.id,
});
```

### Bypassing Preferences/Throttling (Advanced)

For critical emails that must be sent regardless of preferences:

```typescript
import { emailService } from '@/services/email';

// Send directly without context checking
await emailService.sendEmail({
  to: 'customer@example.com',
  subject: 'Critical System Alert',
  html: '<h1>Your HTML content</h1>',
  text: 'Plain text fallback',
  replyTo: 'support@inandoutmovin.com'
});
```

**Warning:** This bypasses all user preferences and throttling. Use only for critical system notifications.

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

### Quote Submission
```typescript
// In app/(tabs)/quote.tsx after successful booking
import { emailService } from '@/services/email';

await emailService.sendBookingConfirmation({
  customerEmail: user.email,
  customerName: `${user.firstName} ${user.lastName}`,
  jobNumber: newJob.jobNumber,
  moveDate: newJob.moveDate,
  fromAddress: newJob.fromAddress,
  toAddress: newJob.toAddress,
  estimatedCost: `$${newJob.estimatedCost}`,
  userId: user.id,
  jobId: newJob.id,
});
```

### Job Status Changes
```typescript
// In AdminDashboard when updating job status
import { emailService } from '@/services/email';

await emailService.sendJobStatusUpdate({
  customerEmail: customer.email,
  customerName: customer.name,
  jobNumber: job.number,
  status: newStatus,
  message: getStatusMessage(newStatus),
  userId: customer.id,
  jobId: job.id,
});
```

### Team Assignment
```typescript
// In AdminDashboard when assigning crew
import { emailService } from '@/services/email';

await emailService.sendTeamAssignment({
  teamEmail: teamMember.email,
  teamMemberName: teamMember.name,
  jobNumber: job.number,
  moveDate: job.moveDate,
  fromAddress: job.fromAddress,
  toAddress: job.toAddress,
  userId: teamMember.id,
  jobId: job.id,
});
```

### Payment Processing
```typescript
// After successful payment in PaymentSection
import { emailService } from '@/services/email';

await emailService.sendPaymentReceipt({
  customerEmail: customer.email,
  customerName: customer.name,
  jobNumber: job.number,
  amount: `$${payment.amount}`,
  paymentMethod: payment.method,
  transactionId: payment.transactionId,
  userId: customer.id,
  jobId: job.id,
});
```

## User Preferences Management

Users can manage their notification preferences from the Profile screen.

**Location:** Profile → Notification Preferences section

**Available Options:**
- Email Notifications (master switch)
- Push Notifications (master switch)
- SMS Updates (master switch)
- Booking Confirmations
- Status Updates
- Team Assignments (for staff)
- Payment Receipts

**Default Settings:**
- All email notifications: ON
- All notification types: ON
- SMS: OFF (requires phone number)

Users can disable all email notifications or specific types. The email service automatically respects these preferences.

## Admin Monitoring

Admins can monitor email delivery status using the EmailDeliveryStatus component.

**Features:**
- View all email attempts (sent, failed, pending)
- Filter by status and notification type
- See error messages for failed emails
- Stats summary dashboard
- Refresh to get latest data
- Resend failed emails (coming soon)

**Integration Example:**
```typescript
import { EmailDeliveryStatus } from '@/components/EmailDeliveryStatus';

// In admin dashboard
<EmailDeliveryStatus />

// For specific customer's emails
<EmailDeliveryStatus customerId={customer.id} />
```

## Throttling Behavior

The system prevents email spam through automatic throttling:

**Rules:**
- Maximum 1 email per notification type per job within 15 minutes
- Applies to: booking_confirmation, status_update, team_assignment, payment_receipt
- Failed attempts are logged but don't count toward throttle
- Throttle resets after 15 minutes

**Example Scenario:**
1. Admin changes job status to "In Progress" → Email sent
2. Admin immediately changes to "Loading" → Email blocked (throttled)
3. 16 minutes later, admin changes to "En Route" → Email sent

**Throttled Attempts:**
- Logged to `job_notifications` with status "failed"
- Error message explains throttle reason
- Visible in admin EmailDeliveryStatus component

## Testing

### Local Development Testing

1. **Set up SMTP credentials** in Supabase Edge Function settings
2. **Test user preferences**:
   - Sign in as a test user
   - Go to Profile → Notification Preferences
   - Toggle settings and verify database updates
3. **Test email sending**:
   - Trigger a booking/status change
   - Check console for logs
   - Verify email received
4. **Test throttling**:
   - Send same notification type twice quickly
   - Second attempt should be throttled
   - Check `email_throttle_log` table
5. **Test admin monitoring**:
   - Access EmailDeliveryStatus component
   - Verify all attempts are logged
   - Check error messages display correctly

### Production Testing Checklist

- [ ] SMTP credentials configured in edge function
- [ ] Test email sends successfully
- [ ] User preferences are respected
- [ ] Throttling prevents duplicate emails
- [ ] Failed emails are logged with errors
- [ ] Admin can view delivery status
- [ ] Email templates render correctly in major email clients
- [ ] Plain text fallback works

## Security

### Server-Side Only
- SMTP credentials stored in Supabase Edge Function environment
- Never exposed to client-side code
- Not in `.env` or version control

### Authentication Required
- Edge Function requires valid JWT token
- Only authenticated users can send emails
- RLS policies protect all notification tables

### User Privacy
- Users control their notification preferences
- Email addresses never shared with third parties
- Throttling prevents unwanted email spam
- All data encrypted in transit and at rest

### Database Security
- Row Level Security (RLS) enabled on all tables
- Users can only view their own notifications
- Admins have elevated access for monitoring
- Service role can insert/update for system operations

## Monitoring & Logging

### Database Logging
All email attempts are logged to `job_notifications` table:
- Success/failure status
- Error messages for debugging
- Metadata (subject, recipient, etc.)
- Timestamps for audit trail

### Admin Dashboard
Real-time monitoring via EmailDeliveryStatus component:
- Delivery success rate
- Failed email investigation
- Throttled attempt tracking
- Historical email data

### Supabase Logs
Edge function logs available in Supabase Dashboard:
- SMTP connection issues
- Authentication errors
- Runtime exceptions
- Performance metrics

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials**
   - Verify environment variables in edge function
   - Test SMTP connection manually
   - Ensure password/API key is valid

2. **Check user preferences**
   - User may have disabled email notifications
   - Query `user_notification_preferences` table
   - Verify master email switch is enabled

3. **Check throttling**
   - Review `email_throttle_log` table
   - Look for recent sends within 15-minute window
   - Check notification type matches

4. **Check RLS policies**
   - Ensure user has permission to trigger emails
   - Verify service role can insert into tables
   - Check Supabase logs for permission errors

### Failed Email Deliveries

1. **Check `job_notifications` table**
   - Find entry with status "failed"
   - Read `error_message` field
   - Common errors:
     - Invalid recipient email
     - SMTP authentication failure
     - Rate limiting from email provider
     - Network timeout

2. **Check Supabase Edge Function logs**
   - Look for runtime errors
   - Check SMTP connection logs
   - Verify request/response data

3. **Resend manually** (when feature is available)
   - Use EmailDeliveryStatus component
   - Click "Resend" button
   - Monitor new attempt

## Future Enhancements

### Planned Features
- ✅ User notification preferences (COMPLETE)
- ✅ Email throttling (COMPLETE)
- ✅ Delivery tracking (COMPLETE)
- ✅ Admin monitoring dashboard (COMPLETE)
- ⏳ Manual resend for failed emails
- ⏳ Email template editor (admin UI)
- ⏳ Scheduled emails (reminders, follow-ups)
- ⏳ Email analytics (open rates, click rates)

### Potential Improvements
- A/B testing for email content
- Rich media attachments (PDFs, invoices)
- Internationalization (multiple languages)
- SMS fallback for failed emails
- Email queuing for better reliability
- Unsubscribe link management
- Email preference center (dedicated page)
