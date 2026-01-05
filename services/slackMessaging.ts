/**
 * Slack Messaging Integration
 */

const SLACK_WEBHOOK_URL = process.env.EXPO_PUBLIC_SLACK_WEBHOOK_URL || '';
const SLACK_BOT_TOKEN = process.env.EXPO_PUBLIC_SLACK_BOT_TOKEN || '';

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

export const slackMessaging = {
  sendNotification: async (message: SlackMessage): Promise<boolean> => {
    if (!SLACK_WEBHOOK_URL) {
      console.warn('Slack webhook URL not configured');
      return false;
    }

    try {
      const response = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
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
            {
              title: 'Customer',
              value: customerName,
              short: true,
            },
            {
              title: 'Service Type',
              value: serviceType,
              short: true,
            },
            {
              title: 'Job Date',
              value: jobDate,
              short: false,
            },
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
            {
              title: 'Customer',
              value: customerName,
              short: true,
            },
            {
              title: 'Status Change',
              value: `${oldStatus} → ${newStatus}`,
              short: true,
            },
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
            {
              title: 'Job Number',
              value: jobNumber,
              short: true,
            },
          ],
          footer: 'IN&OUT Moving',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });
  },

  sendUrgentAlert: async (title: string, message: string, details?: Record<string, string>): Promise<boolean> => {
    const fields = details
      ? Object.entries(details).map(([key, value]) => ({
          title: key,
          value,
          short: true,
        }))
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
    if (!SLACK_BOT_TOKEN) {
      console.warn('Slack bot token not configured');
      return false;
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel,
          text,
          blocks,
        }),
      });

      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Failed to post to Slack channel:', error);
      return false;
    }
  },
};

export function formatJobForSlack(job: any): SlackAttachment {
  return {
    fallback: `Job ${job.job_number}`,
    color: '#2563eb',
    title: `Job ${job.job_number}`,
    fields: [
      {
        title: 'Customer',
        value: job.customer_name || 'N/A',
        short: true,
      },
      {
        title: 'Status',
        value: job.status || 'N/A',
        short: true,
      },
      {
        title: 'Service Type',
        value: job.service_type || 'N/A',
        short: true,
      },
      {
        title: 'Date',
        value: job.job_date || 'N/A',
        short: true,
      },
    ],
    footer: 'IN&OUT Moving',
    ts: Math.floor(Date.now() / 1000),
  };
}
