/**
 * Sentry Error Tracking & Monitoring
 *
 * IMPORTANT: Install @sentry/react-native via:
 * npm install @sentry/react-native
 */

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initializeSentry(): boolean {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return false;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1.0,
      environment: __DEV__ ? 'development' : 'production',
      enabled: !__DEV__,
      enableAutoSessionTracking: true,
      enableNative: true,
      attachStacktrace: true,
      normalizeDepth: 10,
      maxBreadcrumbs: 50,
      beforeSend(event, hint) {
        if (__DEV__) {
          console.log('Sentry Event:', event);
          console.log('Sentry Hint:', hint);
          return null;
        }
        return event;
      },
      integrations: [
        new Sentry.ReactNativeTracing({
          tracingOrigins: ['localhost', /^\//],
          routingInstrumentation: Sentry.reactNavigationIntegration(),
        }),
      ],
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    return false;
  }
}

export function captureException(error: Error, context?: Record<string, any>): void {
  if (__DEV__) {
    console.error('Error captured:', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): void {
  if (__DEV__) {
    console.log(`[${level}] ${message}`, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

export function clearUser(): void {
  Sentry.setUser(null);
}

export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}): void {
  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'app',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}

export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

export function setContext(name: string, context: Record<string, any>): void {
  Sentry.setContext(name, context);
}

export function startTransaction(name: string, operation: string): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op: operation,
  });
}

export function withSentryScope<T>(callback: (scope: Sentry.Scope) => T): T {
  return Sentry.withScope(callback);
}

export const SentryNative = Platform.select({
  web: null,
  default: Sentry,
});

export function logJobEvent(
  jobId: string,
  event: string,
  data?: Record<string, any>
): void {
  addBreadcrumb({
    message: `Job ${jobId}: ${event}`,
    category: 'job',
    level: 'info',
    data: {
      jobId,
      event,
      ...data,
    },
  });
}

export function logPaymentEvent(
  paymentId: string,
  event: string,
  amount?: number,
  status?: string
): void {
  addBreadcrumb({
    message: `Payment ${paymentId}: ${event}`,
    category: 'payment',
    level: status === 'failed' ? 'error' : 'info',
    data: {
      paymentId,
      event,
      amount,
      status,
    },
  });
}

export function logAuthEvent(
  event: string,
  userId?: string,
  success: boolean = true
): void {
  addBreadcrumb({
    message: `Auth: ${event}`,
    category: 'auth',
    level: success ? 'info' : 'warning',
    data: {
      event,
      userId,
      success,
    },
  });
}

export function logNavigationEvent(screenName: string, params?: Record<string, any>): void {
  addBreadcrumb({
    message: `Navigation: ${screenName}`,
    category: 'navigation',
    level: 'info',
    data: {
      screenName,
      params,
    },
  });
}

export function reportErrorWithContext(
  error: Error,
  context: {
    userId?: string;
    jobId?: string;
    action?: string;
    additionalData?: Record<string, any>;
  }
): void {
  withSentryScope((scope) => {
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context.jobId) {
      scope.setTag('job_id', context.jobId);
    }

    if (context.action) {
      scope.setTag('action', context.action);
    }

    if (context.additionalData) {
      scope.setContext('additional_data', context.additionalData);
    }

    Sentry.captureException(error);
  });
}

export { Sentry };

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setTag,
  setContext,
  startTransaction,
  withSentryScope,
  logJobEvent,
  logPaymentEvent,
  logAuthEvent,
  logNavigationEvent,
  reportErrorWithContext,
};
