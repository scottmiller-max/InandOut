import { supabase } from './supabase';

export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

export const emailService = {
  sendEmail: async (params: SendEmailParams): Promise<SendEmailResult> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No active session for email sending');
        return { success: false, error: 'Authentication required' };
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/send-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Email sending failed:', errorData);
        return {
          success: false,
          error: errorData.error || 'Failed to send email'
        };
      }

      const result = await response.json();
      return { success: true };
    } catch (error) {
      console.error('Email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  sendBookingConfirmation: async (params: {
    customerEmail: string;
    customerName: string;
    jobNumber: string;
    moveDate: string;
    fromAddress: string;
    toAddress: string;
    estimatedCost: string;
  }): Promise<SendEmailResult> => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
            .info-row { margin: 10px 0; }
            .label { font-weight: bold; color: #374151; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${params.customerName},</p>
              <p>Thank you for choosing IN&OUT Moving! Your move has been successfully scheduled.</p>

              <div class="info-box">
                <div class="info-row">
                  <span class="label">Job Number:</span> ${params.jobNumber}
                </div>
                <div class="info-row">
                  <span class="label">Move Date:</span> ${params.moveDate}
                </div>
                <div class="info-row">
                  <span class="label">From:</span> ${params.fromAddress}
                </div>
                <div class="info-row">
                  <span class="label">To:</span> ${params.toAddress}
                </div>
                <div class="info-row">
                  <span class="label">Estimated Cost:</span> ${params.estimatedCost}
                </div>
              </div>

              <p>Our team will contact you 24 hours before your move to confirm the details and arrival time.</p>

              <p>If you have any questions or need to make changes, please don't hesitate to reach out.</p>

              <div class="footer">
                <p><strong>IN&OUT Moving</strong></p>
                <p>Phone: +1 (808) 755-2527</p>
                <p>Email: support@inandoutmovin.com</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Booking Confirmed!

Hi ${params.customerName},

Thank you for choosing IN&OUT Moving! Your move has been successfully scheduled.

Job Number: ${params.jobNumber}
Move Date: ${params.moveDate}
From: ${params.fromAddress}
To: ${params.toAddress}
Estimated Cost: ${params.estimatedCost}

Our team will contact you 24 hours before your move to confirm the details and arrival time.

If you have any questions or need to make changes, please don't hesitate to reach out.

IN&OUT Moving
Phone: +1 (808) 755-2527
Email: support@inandoutmovin.com
    `;

    return emailService.sendEmail({
      to: params.customerEmail,
      subject: `Booking Confirmed - Job #${params.jobNumber}`,
      html,
      text,
      replyTo: 'support@inandoutmovin.com',
    });
  },

  sendJobStatusUpdate: async (params: {
    customerEmail: string;
    customerName: string;
    jobNumber: string;
    status: string;
    message: string;
  }): Promise<SendEmailResult> => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .status-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Job Status Update</h1>
            </div>
            <div class="content">
              <p>Hi ${params.customerName},</p>
              <p>We have an update regarding your move (Job #${params.jobNumber}).</p>

              <div class="status-box">
                <h3>Status: ${params.status}</h3>
                <p>${params.message}</p>
              </div>

              <p>You can track your move in real-time through our mobile app.</p>

              <div class="footer">
                <p><strong>IN&OUT Moving</strong></p>
                <p>Phone: +1 (808) 755-2527</p>
                <p>Email: support@inandoutmovin.com</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Job Status Update

Hi ${params.customerName},

We have an update regarding your move (Job #${params.jobNumber}).

Status: ${params.status}
${params.message}

You can track your move in real-time through our mobile app.

IN&OUT Moving
Phone: +1 (808) 755-2527
Email: support@inandoutmovin.com
    `;

    return emailService.sendEmail({
      to: params.customerEmail,
      subject: `Job Update - #${params.jobNumber}`,
      html,
      text,
      replyTo: 'support@inandoutmovin.com',
    });
  },

  sendTeamAssignment: async (params: {
    teamEmail: string;
    teamMemberName: string;
    jobNumber: string;
    moveDate: string;
    fromAddress: string;
    toAddress: string;
  }): Promise<SendEmailResult> => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
            .info-row { margin: 10px 0; }
            .label { font-weight: bold; color: #374151; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Job Assignment</h1>
            </div>
            <div class="content">
              <p>Hi ${params.teamMemberName},</p>
              <p>You have been assigned to a new moving job.</p>

              <div class="info-box">
                <div class="info-row">
                  <span class="label">Job Number:</span> ${params.jobNumber}
                </div>
                <div class="info-row">
                  <span class="label">Date:</span> ${params.moveDate}
                </div>
                <div class="info-row">
                  <span class="label">From:</span> ${params.fromAddress}
                </div>
                <div class="info-row">
                  <span class="label">To:</span> ${params.toAddress}
                </div>
              </div>

              <p>Please review the job details in the admin dashboard and contact dispatch if you have any questions.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
New Job Assignment

Hi ${params.teamMemberName},

You have been assigned to a new moving job.

Job Number: ${params.jobNumber}
Date: ${params.moveDate}
From: ${params.fromAddress}
To: ${params.toAddress}

Please review the job details in the admin dashboard and contact dispatch if you have any questions.
    `;

    return emailService.sendEmail({
      to: params.teamEmail,
      subject: `New Job Assignment - #${params.jobNumber}`,
      html,
      text,
      replyTo: 'dispatch@inandoutmovin.com',
    });
  },

  sendPaymentReceipt: async (params: {
    customerEmail: string;
    customerName: string;
    jobNumber: string;
    amount: string;
    paymentMethod: string;
    transactionId: string;
  }): Promise<SendEmailResult> => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-box { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .total-row { font-weight: bold; font-size: 18px; color: #10b981; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
            </div>
            <div class="content">
              <p>Hi ${params.customerName},</p>
              <p>Thank you for your payment. Here's your receipt:</p>

              <div class="receipt-box">
                <div class="info-row">
                  <span>Job Number:</span>
                  <span>${params.jobNumber}</span>
                </div>
                <div class="info-row">
                  <span>Payment Method:</span>
                  <span>${params.paymentMethod}</span>
                </div>
                <div class="info-row">
                  <span>Transaction ID:</span>
                  <span>${params.transactionId}</span>
                </div>
                <div class="info-row total-row">
                  <span>Total Paid:</span>
                  <span>${params.amount}</span>
                </div>
              </div>

              <p>This receipt serves as confirmation of your payment. Please keep it for your records.</p>

              <div class="footer">
                <p><strong>IN&OUT Moving</strong></p>
                <p>Phone: +1 (808) 755-2527</p>
                <p>Email: support@inandoutmovin.com</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Payment Receipt

Hi ${params.customerName},

Thank you for your payment. Here's your receipt:

Job Number: ${params.jobNumber}
Payment Method: ${params.paymentMethod}
Transaction ID: ${params.transactionId}
Total Paid: ${params.amount}

This receipt serves as confirmation of your payment. Please keep it for your records.

IN&OUT Moving
Phone: +1 (808) 755-2527
Email: support@inandoutmovin.com
    `;

    return emailService.sendEmail({
      to: params.customerEmail,
      subject: `Payment Receipt - Job #${params.jobNumber}`,
      html,
      text,
      replyTo: 'billing@inandoutmovin.com',
    });
  },
};
