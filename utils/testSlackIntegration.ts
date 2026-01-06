import { slackMessaging } from '../services/slackMessaging';

export interface SlackTestResult {
  testName: string;
  success: boolean;
  message: string;
  timestamp: string;
}

export async function testWebhookConnection(): Promise<SlackTestResult> {
  const testName = 'Webhook Connection Test';
  try {
    const result = await slackMessaging.sendNotification({
      text: 'Test message from IN&OUT Moving App - Webhook connection successful!',
    });
    return {
      testName,
      success: result,
      message: result ? 'Webhook is properly configured and responding' : 'Webhook URL not configured or failed to send',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      testName,
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function testJobNotification(): Promise<SlackTestResult> {
  const testName = 'Job Notification Test';
  try {
    const result = await slackMessaging.notifyNewJob(
      'TEST-001',
      'Test Customer',
      'Local Move',
      new Date().toLocaleDateString()
    );
    return {
      testName,
      success: result,
      message: result ? 'Job notification sent successfully' : 'Failed to send job notification',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      testName,
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function testStatusChangeNotification(): Promise<SlackTestResult> {
  const testName = 'Status Change Notification Test';
  try {
    const result = await slackMessaging.notifyJobStatusChange(
      'TEST-001',
      'scheduled',
      'in_progress',
      'Test Customer'
    );
    return {
      testName,
      success: result,
      message: result ? 'Status change notification sent successfully' : 'Failed to send status notification',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      testName,
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function testUrgentAlert(): Promise<SlackTestResult> {
  const testName = 'Urgent Alert Test';
  try {
    const result = await slackMessaging.sendUrgentAlert(
      'Test Alert',
      'This is a test urgent alert from IN&OUT Moving App',
      { Source: 'Integration Test', Priority: 'High' }
    );
    return {
      testName,
      success: result,
      message: result ? 'Urgent alert sent successfully' : 'Failed to send urgent alert',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      testName,
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function testCustomerMessageNotification(): Promise<SlackTestResult> {
  const testName = 'Customer Message Notification Test';
  try {
    const result = await slackMessaging.notifyCustomerMessage(
      'TEST-001',
      'Test Customer',
      'This is a test customer message'
    );
    return {
      testName,
      success: result,
      message: result ? 'Customer message notification sent successfully' : 'Failed to send customer message notification',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      testName,
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export function checkSlackConfiguration(): {
  webhookConfigured: boolean;
  botTokenConfigured: boolean;
  status: string;
} {
  const webhookUrl = process.env.EXPO_PUBLIC_SLACK_WEBHOOK_URL || '';
  const botToken = process.env.EXPO_PUBLIC_SLACK_BOT_TOKEN || '';

  const webhookConfigured = webhookUrl.length > 0;
  const botTokenConfigured = botToken.length > 0;

  let status: string;
  if (webhookConfigured && botTokenConfigured) {
    status = 'Fully configured - both webhook and bot token available';
  } else if (webhookConfigured) {
    status = 'Partially configured - webhook only (bot features unavailable)';
  } else if (botTokenConfigured) {
    status = 'Partially configured - bot token only (webhook features unavailable)';
  } else {
    status = 'Not configured - no Slack credentials found';
  }

  return { webhookConfigured, botTokenConfigured, status };
}

export async function runAllSlackTests(): Promise<{
  configuration: ReturnType<typeof checkSlackConfiguration>;
  results: SlackTestResult[];
  summary: { total: number; passed: number; failed: number };
}> {
  const configuration = checkSlackConfiguration();

  if (!configuration.webhookConfigured) {
    return {
      configuration,
      results: [],
      summary: { total: 0, passed: 0, failed: 0 },
    };
  }

  const results: SlackTestResult[] = [];

  results.push(await testWebhookConnection());
  results.push(await testJobNotification());
  results.push(await testStatusChangeNotification());
  results.push(await testUrgentAlert());
  results.push(await testCustomerMessageNotification());

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    configuration,
    results,
    summary: { total: results.length, passed, failed },
  };
}
