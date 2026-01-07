import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';

export interface BugReport {
  id?: string;
  userId?: string;
  errorMessage: string;
  stackTrace?: string;
  userAgent: string;
  platform: string;
  appVersion: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export const bugReportingService = {
  // Report error to backend
  reportError: async (error: Error, context?: Record<string, any>, severity: BugReport['severity'] = 'medium') => {
    try {
      const bugReport: Omit<BugReport, 'id'> = {
        errorMessage: error.message,
        stackTrace: error.stack,
        userAgent: Platform.OS === 'web' ? navigator.userAgent : `${Platform.OS} ${Platform.Version}`,
        platform: Platform.OS,
        appVersion: '1.0.0', // Get from app.json in production
        timestamp: new Date().toISOString(),
        severity,
        context,
      };

      // In production, send to error tracking service (Sentry, Bugsnag, etc.)
      console.error('Bug Report:', bugReport);

      // Store in database for admin review
      // await supabase.from('bug_reports').insert(bugReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  },

  // Global error handler setup
  setupGlobalErrorHandler: () => {
    if (Platform.OS === 'web') {
      window.addEventListener('error', (event) => {
        bugReportingService.reportError(
          new Error(event.message),
          { filename: event.filename, lineno: event.lineno },
          'high'
        );
      });

      window.addEventListener('unhandledrejection', (event) => {
        bugReportingService.reportError(
          new Error(`Unhandled Promise Rejection: ${event.reason}`),
          { type: 'unhandled_promise' },
          'high'
        );
      });
    }
  },

  // Performance monitoring
  measurePerformance: (operationName: string, operation: (...args: any[]) => Promise<any>) => {
    return async (...args: any[]) => {
      const startTime = Date.now();

      try {
        const result = await operation(...args);
        const duration = Date.now() - startTime;
        
        // Log slow operations
        if (duration > 1000) {
          console.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        await bugReportingService.reportError(
          error as Error,
          { operation: operationName, duration },
          'medium'
        );
        throw error;
      }
    };
  },
};