import { Platform, Alert } from 'react-native';
import { bugReportingService } from './bugReporting';

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const errorHandler = {
  // Handle network errors gracefully
  handleNetworkError: (error: any, options: ErrorHandlerOptions = {}) => {
    const {
      showAlert = true,
      logError = true,
      fallbackMessage = 'Network error occurred. Please check your connection and try again.',
      severity = 'medium'
    } = options;

    if (logError) {
      bugReportingService.reportError(
        error instanceof Error ? error : new Error(String(error)),
        { type: 'network_error' },
        severity
      );
    }

    if (showAlert) {
      Alert.alert('Connection Error', fallbackMessage);
    }

    return { success: false, error: fallbackMessage };
  },

  // Handle API errors with specific messaging
  handleAPIError: (error: any, operation: string, options: ErrorHandlerOptions = {}) => {
    const {
      showAlert = true,
      logError = true,
      severity = 'medium'
    } = options;

    let userMessage = 'An error occurred. Please try again.';

    // Parse common API errors
    if (error?.message) {
      if (error.message.includes('network')) {
        userMessage = 'Network connection error. Please check your internet and try again.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('unauthorized')) {
        userMessage = 'Authentication error. Please sign in again.';
      } else if (error.message.includes('not found')) {
        userMessage = 'Requested resource not found.';
      }
    }

    if (logError) {
      bugReportingService.reportError(
        error instanceof Error ? error : new Error(String(error)),
        { operation, type: 'api_error' },
        severity
      );
    }

    if (showAlert) {
      Alert.alert('Error', userMessage);
    }

    return { success: false, error: userMessage };
  },

  // Handle Calendly integration errors
  handleCalendlyError: (error: any, options: ErrorHandlerOptions = {}) => {
    const {
      showAlert = true,
      logError = true,
      fallbackMessage = 'Unable to load calendar. Please try again or contact support.',
      severity = 'high'
    } = options;

    if (logError) {
      bugReportingService.reportError(
        error instanceof Error ? error : new Error('Calendly integration error'),
        { 
          type: 'calendly_error',
          error_details: error,
          platform: Platform.OS 
        },
        severity
      );
    }

    if (showAlert) {
      Alert.alert(
        'Calendar Error', 
        fallbackMessage,
        [
          { text: 'Try Again', style: 'default' },
          { text: 'Contact Support', style: 'default' },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }

    return { success: false, error: fallbackMessage };
  },

  // Handle Google Services errors
  handleGoogleServicesError: (error: any, service: string, options: ErrorHandlerOptions = {}) => {
    const {
      showAlert = true,
      logError = true,
      severity = 'high'
    } = options;

    const serviceMessages: Record<string, string> = {
      calendar: 'Google Calendar integration is temporarily unavailable.',
      messaging: 'Google messaging services are temporarily unavailable.',
      notifications: 'Google notification services are temporarily unavailable.',
    };

    const fallbackMessage = serviceMessages[service] || 'Google services integration error.';

    if (logError) {
      bugReportingService.reportError(
        error instanceof Error ? error : new Error(`Google ${service} error`),
        { 
          type: 'google_services_error',
          service,
          error_details: error 
        },
        severity
      );
    }

    if (showAlert) {
      Alert.alert(
        'Service Unavailable',
        `${fallbackMessage} Please try again later or use alternative methods.`,
        [
          { text: 'Try Again', style: 'default' },
          { text: 'Use Alternative', style: 'default' },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }

    return { success: false, error: fallbackMessage };
  },

  // Handle authentication errors
  handleAuthError: (error: any, options: ErrorHandlerOptions = {}) => {
    const {
      showAlert = true,
      logError = true,
      severity = 'medium'
    } = options;

    let userMessage = 'Authentication error occurred.';

    if (error?.message) {
      if (error.message.includes('Invalid login credentials')) {
        userMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('User already registered')) {
        userMessage = 'An account with this email already exists.';
      } else if (error.message.includes('Password should be at least')) {
        userMessage = 'Password must be at least 6 characters.';
      } else if (error.message.includes('Email not confirmed')) {
        userMessage = 'Please check your email and click the verification link.';
      }
    }

    if (logError) {
      bugReportingService.reportError(
        error instanceof Error ? error : new Error('Authentication error'),
        { type: 'auth_error' },
        severity
      );
    }

    if (showAlert) {
      Alert.alert('Authentication Error', userMessage);
    }

    return { success: false, error: userMessage };
  },

  // Wrap async operations with error handling
  withErrorHandling: <T>(
    operation: () => Promise<T>,
    operationName: string,
    options: ErrorHandlerOptions = {}
  ) => {
    return async (): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        return errorHandler.handleAPIError(error, operationName, options);
      }
    };
  },
};