/**
 * Slack Messaging Integration (client-side)
 *
 * SECURITY: this file no longer contains the Slack webhook URL or bot token.
 * Those secrets used to be EXPO_PUBLIC_* env vars, which ship inside the app
 * bundle and can be extracted by anyone. They now live only on the server in the
 * `slack-notify` edge function. This module just builds the message payload and
 * hands it to that function via an authenticated Supabase call.
 *
 * The public API (slackMessaging.*, formatJobForSlack) is unchanged, so existing
 * callers (services/adminNotifications.ts, utils/testSlackIntegration.ts) keep working.
 */

import { supabase } from './supabase';

export interface SlackMessage {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

export interface SlackAttachment {
  fallback: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: any[];
}

async function invokeSlack(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('slack-notify', {
      body: payload,
    });
    if (error) {
      console.error('slack-notify invocation failed:', error.message);
      return false;
    }
    return (data as { ok?: boolean })?.ok === true;
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return false;
  }
}

export const slackMessaging = {
  sendNotification: async (message: SlackMessage): Promise<boolean> => {
    return await invokeSlack({ mode: 'webhook', message });
  },

  notifyNewJob: async (jobNumber: string, customerName: string, serviceType: string, jobDate: string): Promise<boolean> => {
    return await slackMessaging.sendNotification({
      text: `New Job Created: ${jobNumber}`,
      attachments: [
        {
          fallback: `New job ${jobNumber} created for ${customerName}`,
          color: '#2563eb',
          title: `Job ${jobNumber}`,
          fields: [
            { title: 'Customer', value: customerName, short: true },
            { title: 'Service Type', value: serviceType, short: true },
            { title: 'Job Date', value: jobDate, short: false },
          ],
          footer: 'IN&OUT Moving',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  },

  notifyJobStatusChange: async (jobNumber: string, oldStatus: string, newStatus: string, customerName: string): Promise<boolean> => {
    const statusColors: Record<string, string> = {
      scheduled: '#3b82f6',
      in_progress: '#f59e0b',
      completed: '#10b981',
      cancelled: '#ef4444',
    };

    return await slackMessaging.sendNotification({
      text: `Job Status Updated: ${jobNumber}`,
      attachments: [
        {
          fallback: `Job ${jobNumber} status changed from ${oldStatus} to ${newStatus}`,
          color: statusColors[newStatus] || '#64748b',
          title: `Job ${jobNumber} - Status Update`,
          fields: [
            { title: 'Customer', value: customerName, short: true },
            { title: 'Status Change', value: `${oldStatus} → ${newStatus}`, short: true },
          ],
          footer: 'IN&OUT Moving',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  },

  notifyCustomerMessage: async (jobNumber: string, customerName: string, message: string): Promise<boolean> => {
    return await slackMessaging.sendNotification({
      text: `New Customer Message - Job ${jobNumber}`,
      attachments: [
        {
          fallback: `New message from ${customerName} on job ${jobNumber}`,
          color: '#8b5cf6',
          title: `Message from ${customerName}`,
          text: message,
          fields: [
            { title: 'Job Number', value: jobNumber, short: true },
          ],
          footer: 'IN&OUT Moving',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  },

  sendUrgentAlert: async (title: string, message: string, details?: Record<string, string>): Promise<boolean> => {
    const fields = details
      ? Object.entries(details).map(([key, value]) => ({ title: key, value, short: true }))
      : [];

    return await slackMessaging.sendNotification({
      text: `🚨 URGENT: ${title}`,
      attachments: [
        {
          fallback: `Urgent: ${title} - ${message}`,
          color: '#dc2626',
          title: `🚨 ${title}`,
          text: message,
          fields,
          footer: 'IN&OUT Moving - Urgent Alert',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  },

  postToChannel: async (channel: string, text: string, blocks?: SlackBlock[]): Promise<boolean> => {
    return await invokeSlack({ mode: 'channel', channel, text, blocks });
  },
};

export function formatJobForSlack(job: any): SlackAttachment {
  return {
    fallback: `Job ${job.job_number}`,
    color: '#2563eb',
    title: `Job ${job.job_number}`,
    fields: [
      { title: 'Customer', value: job.customer_name || 'N/A', short: true },
      { title: 'Status', value: job.status || 'N/A', short: true },
      { title: 'Service Type', value: job.service_type || 'N/A', short: true },
      { title: 'Date', value: job.job_date || 'N/A', short: true },
    ],
    footer: 'IN&OUT Moving',
    ts: Math.floor(Date.now() / 1000),
  };
}
