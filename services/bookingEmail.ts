/**
 * Booking Email Service
 * Handles sending booking confirmation emails via the send-booking-confirmation-email Edge Function
 */

import { supabase } from './supabase';
import { emailService } from './email';

export interface BookingEmailPayload {
  to: string;
  customer_name: string;
  booking_id: string;
  move_date: string;
  arrival_window: string;
  from_address: string;
  to_address: string;
  crew_size: string;
  estimated_duration: string;
  deposit_amount: string;
  balance_due: string;
}

export interface SendBookingConfirmationResult {
  success: boolean;
  error?: string;
  notificationId?: string;
}

/**
 * Formats a time string into an arrival window (adds 2 hours)
 * Example: "09:00:00" becomes "9:00 AM - 11:00 AM"
 */
function formatArrivalWindow(moveTime: string | null | undefined): string {
  if (!moveTime) {
    return 'TBD';
  }

  try {
    const [hours, minutes] = moveTime.split(':').map(Number);

    // Format start time
    const startHour = hours % 12 || 12;
    const startPeriod = hours >= 12 ? 'PM' : 'AM';
    const startTime = `${startHour}:${minutes.toString().padStart(2, '0')} ${startPeriod}`;

    // Calculate end time (2 hours later)
    const endHours = hours + 2;
    const endHour = endHours % 12 || 12;
    const endPeriod = endHours >= 12 ? 'PM' : 'AM';
    const endTime = `${endHour}:${minutes.toString().padStart(2, '0')} ${endPeriod}`;

    return `${startTime} - ${endTime}`;
  } catch (error) {
    console.error('Error formatting arrival window:', error);
    return 'TBD';
  }
}

/**
 * Formats a date string to readable format
 * Example: "2026-02-14" becomes "Feb 14, 2026"
 */
function formatMoveDate(moveDate: string | null | undefined): string {
  if (!moveDate) {
    return 'TBD';
  }

  try {
    const date = new Date(moveDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting move date:', error);
    return 'TBD';
  }
}

/**
 * Formats address fields into a complete address string
 */
function formatAddress(
  address: string | null,
  city: string | null,
  state: string | null,
  zip: string | null
): string {
  const parts = [
    address || '',
    city || '',
    state || '',
    zip || '',
  ].filter(Boolean);

  if (parts.length === 0) {
    return 'TBD';
  }

  return parts.join(', ');
}

/**
 * Formats currency amount
 */
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return 'TBD';
  }
  return amount.toFixed(2);
}

/**
 * Formats estimated hours
 */
function formatEstimatedDuration(hours: number | null | undefined): string {
  if (!hours) {
    return 'TBD';
  }

  // If it's a whole number, return as-is, otherwise show as range
  if (Number.isInteger(hours)) {
    return `${hours} hours`;
  }

  const lower = Math.floor(hours);
  const upper = Math.ceil(hours);
  return `${lower}-${upper} hours`;
}

/**
 * Transforms job data into booking email payload
 */
export async function buildBookingEmailPayload(jobId: string): Promise<BookingEmailPayload | null> {
  try {
    // Fetch job with customer data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customers:customer_id (
          email,
          first_name,
          last_name,
          user_id
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Error fetching job:', jobError);
      return null;
    }

    const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;

    if (!customer) {
      console.error('No customer found for job:', jobId);
      return null;
    }

    // Calculate balance due
    const estimatedTotal = job.estimated_total || 0;
    const depositAmount = job.deposit_amount || 0;
    const balanceDue = estimatedTotal - depositAmount;

    // Build payload
    const payload: BookingEmailPayload = {
      to: customer.email || 'TBD',
      customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'TBD',
      booking_id: job.job_number || 'TBD',
      move_date: formatMoveDate(job.move_date),
      arrival_window: formatArrivalWindow(job.move_time),
      from_address: formatAddress(job.from_address, job.from_city, job.from_state, job.from_zip),
      to_address: formatAddress(job.to_address, job.to_city, job.to_state, job.to_zip),
      crew_size: job.num_movers ? job.num_movers.toString() : 'TBD',
      estimated_duration: formatEstimatedDuration(job.estimated_hours),
      deposit_amount: formatCurrency(depositAmount),
      balance_due: formatCurrency(balanceDue),
    };

    return payload;
  } catch (error) {
    console.error('Error building booking email payload:', error);
    return null;
  }
}

/**
 * Sends booking confirmation email via Edge Function
 * Includes preference checking, throttling, and logging
 */
export async function sendBookingConfirmationEmail(
  jobId: string,
  options: { skipThrottle?: boolean } = {}
): Promise<SendBookingConfirmationResult> {
  try {
    // Build email payload
    const payload = await buildBookingEmailPayload(jobId);

    if (!payload) {
      return {
        success: false,
        error: 'Failed to build email payload - job or customer data missing',
      };
    }

    // Get customer user_id for preference checking
    const { data: job } = await supabase
      .from('jobs')
      .select('customer_id, customers:customer_id(user_id)')
      .eq('id', jobId)
      .single();

    const customer = Array.isArray(job?.customers) ? job.customers[0] : job?.customers;
    const userId = customer?.user_id;

    if (!userId) {
      return {
        success: false,
        error: 'Customer user_id not found - cannot check preferences',
      };
    }

    // Check user preferences
    const preferencesEnabled = await emailService.checkUserPreferences(
      userId,
      'booking_confirmation'
    );

    if (!preferencesEnabled) {
      console.log('Booking confirmation emails disabled for user:', userId);

      // Log as skipped
      const notificationId = await emailService.logNotification(
        {
          userId,
          jobId,
          notificationType: 'booking_confirmation',
        },
        'failed',
        'User has disabled booking confirmation emails'
      );

      return {
        success: false,
        error: 'User has disabled booking confirmation emails',
        notificationId: notificationId || undefined,
      };
    }

    // Check throttle (unless skipThrottle is true)
    if (!options.skipThrottle) {
      const throttleCheck = await emailService.checkThrottle(
        userId,
        jobId,
        'booking_confirmation'
      );

      if (!throttleCheck.canSend) {
        console.log('Booking confirmation email throttled:', throttleCheck.reason);

        const notificationId = await emailService.logNotification(
          {
            userId,
            jobId,
            notificationType: 'booking_confirmation',
          },
          'failed',
          throttleCheck.reason
        );

        return {
          success: false,
          error: throttleCheck.reason,
          notificationId: notificationId || undefined,
        };
      }
    }

    // Log notification as pending
    const notificationId = await emailService.logNotification(
      {
        userId,
        jobId,
        notificationType: 'booking_confirmation',
      },
      'pending'
    );

    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('No active session for booking email');

      if (notificationId) {
        await emailService.updateNotificationStatus(
          notificationId,
          'failed',
          'Authentication required'
        );
      }

      return {
        success: false,
        error: 'Authentication required',
        notificationId: notificationId || undefined,
      };
    }

    // Call Edge Function
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const apiUrl = `${supabaseUrl}/functions/v1/send-booking-confirmation-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `HTTP ${response.status}: Failed to send booking confirmation`;

      console.error('Booking confirmation email failed:', errorMessage);

      if (notificationId) {
        await emailService.updateNotificationStatus(
          notificationId,
          'failed',
          errorMessage
        );
      }

      return {
        success: false,
        error: errorMessage,
        notificationId: notificationId || undefined,
      };
    }

    // Success!
    console.log('Booking confirmation email sent successfully for job:', jobId);

    if (notificationId) {
      await emailService.updateNotificationStatus(notificationId, 'sent');
    }

    // Update throttle log
    await emailService.updateThrottleLog(userId, jobId, 'booking_confirmation');

    return {
      success: true,
      notificationId: notificationId || undefined,
    };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sends booking confirmation email from server-side context (Edge Function to Edge Function)
 * Uses service role key for authentication
 */
export async function sendBookingConfirmationEmailServerSide(
  jobId: string,
  serviceRoleKey: string
): Promise<SendBookingConfirmationResult> {
  try {
    // Build email payload
    const payload = await buildBookingEmailPayload(jobId);

    if (!payload) {
      console.error('Failed to build booking email payload for job:', jobId);
      return {
        success: false,
        error: 'Failed to build email payload - job or customer data missing',
      };
    }

    // Call Edge Function with service role key
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const apiUrl = `${supabaseUrl}/functions/v1/send-booking-confirmation-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `HTTP ${response.status}: Failed to send booking confirmation`;

      console.error('Server-side booking confirmation email failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log('Server-side booking confirmation email sent successfully for job:', jobId);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error sending server-side booking confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
