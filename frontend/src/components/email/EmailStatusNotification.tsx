'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertCircle,
  Mail,
  Clock,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export interface EmailStatus {
  type:
    | 'success'
    | 'error'
    | 'sending'
    | 'timeout'
    | 'auth-error'
    | 'validation-error';
  message: string;
  details?: string;
  claimCount?: number;
  successCount?: number;
  messageId?: string;
}

interface EmailStatusNotificationProps {
  status: EmailStatus;
  className?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Gets the appropriate icon for email status
 */
const getStatusIcon = (type: EmailStatus['type']) => {
  const iconProps = { className: 'h-5 w-5', 'aria-hidden': true };

  switch (type) {
    case 'success':
      return (
        <CheckCircle2
          {...iconProps}
          className="h-5 w-5 text-green-500"
        />
      );
    case 'sending':
      return (
        <RefreshCw
          {...iconProps}
          className="h-5 w-5 text-blue-500 animate-spin"
        />
      );
    case 'timeout':
      return (
        <Clock
          {...iconProps}
          className="h-5 w-5 text-orange-500"
        />
      );
    case 'auth-error':
      return (
        <AlertTriangle
          {...iconProps}
          className="h-5 w-5 text-yellow-500"
        />
      );
    case 'validation-error':
      return (
        <AlertCircle
          {...iconProps}
          className="h-5 w-5 text-orange-500"
        />
      );
    case 'error':
    default:
      return (
        <XCircle
          {...iconProps}
          className="h-5 w-5 text-red-500"
        />
      );
  }
};

/**
 * Gets the appropriate Alert variant for email status
 */
const getAlertVariant = (
  type: EmailStatus['type'],
): 'default' | 'destructive' | 'warning' | 'info' => {
  switch (type) {
    case 'success':
      return 'info'; // Using info for success as it has good green-ish colors
    case 'sending':
      return 'info';
    case 'timeout':
    case 'validation-error':
    case 'auth-error':
      return 'warning';
    case 'error':
    default:
      return 'destructive';
  }
};

/**
 * Gets the appropriate title for email status
 */
const getStatusTitle = (status: EmailStatus): string => {
  switch (status.type) {
    case 'success':
      return status.claimCount && status.claimCount > 1
        ? `${status.successCount || status.claimCount} Email${(status.successCount || status.claimCount) !== 1 ? 's' : ''} Sent Successfully`
        : 'Email Sent Successfully';
    case 'sending':
      return status.claimCount && status.claimCount > 1
        ? `Sending ${status.claimCount} Emails...`
        : 'Sending Email...';
    case 'timeout':
      return 'Email Sending Timeout';
    case 'auth-error':
      return 'Email Permission Required';
    case 'validation-error':
      return 'Email Validation Error';
    case 'error':
    default:
      return 'Email Sending Failed';
  }
};

/**
 * EmailStatusNotification component provides comprehensive status feedback for email operations
 *
 * Features:
 * - Accessible ARIA labels and roles
 * - Responsive design following existing patterns
 * - Clear visual feedback with appropriate colors and icons
 * - Support for all error scenarios (requirements 4.1-4.3)
 * - Consistent with existing design system
 *
 * Requirements: 4.1-4.3 - error handling and user feedback
 */
export const EmailStatusNotification: React.FC<
  EmailStatusNotificationProps
> = ({ status, className, onRetry, onDismiss }) => {
  const variant = getAlertVariant(status.type);
  const title = getStatusTitle(status);
  const icon = getStatusIcon(status.type);

  return (
    <Alert
      variant={variant}
      className={cn(
        'transition-all duration-200 ease-in-out',
        status.type === 'success' &&
          'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200',
        className,
      )}
      role={
        status.type === 'error' || status.type === 'timeout'
          ? 'alert'
          : 'status'
      }
      aria-live={status.type === 'sending' ? 'polite' : 'assertive'}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <AlertTitle className="flex items-center justify-between">
            <span>{title}</span>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-2 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 focus:ring-2 focus:ring-current focus:outline-none"
                aria-label="Dismiss notification"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </AlertTitle>

          <AlertDescription className="space-y-2">
            <p>{status.message}</p>

            {status.details && (
              <p className="text-xs opacity-90">{status.details}</p>
            )}

            {status.messageId && (
              <p className="text-xs opacity-75">
                <Mail className="inline h-3 w-3 mr-1" />
                Message ID: {status.messageId}
              </p>
            )}

            {status.type === 'auth-error' && (
              <p className="text-xs">
                Please ensure you have granted Gmail sending permissions in your
                Google account settings.
              </p>
            )}

            {onRetry &&
              (status.type === 'error' ||
                status.type === 'timeout' ||
                status.type === 'auth-error') && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md border border-current/20 hover:bg-current/10 focus:ring-2 focus:ring-current focus:outline-none transition-colors"
                    aria-label="Retry email sending"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </button>
                </div>
              )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

/**
 * EmailStatusNotificationList component for displaying multiple email notifications
 */
interface EmailStatusNotificationListProps {
  notifications: (EmailStatus & { id: string })[];
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

export const EmailStatusNotificationList: React.FC<
  EmailStatusNotificationListProps
> = ({ notifications, onRetry, onDismiss, className }) => {
  if (notifications.length === 0) return null;

  return (
    <div
      className={cn('space-y-3', className)}
      role="region"
      aria-label="Email status notifications"
    >
      {notifications.map((notification) => (
        <EmailStatusNotification
          key={notification.id}
          status={notification}
          onRetry={onRetry ? () => onRetry(notification.id) : undefined}
          onDismiss={onDismiss ? () => onDismiss(notification.id) : undefined}
        />
      ))}
    </div>
  );
};

/**
 * Helper functions for creating email status objects
 */
export const createEmailStatus = {
  success: (message: string, options?: Partial<EmailStatus>): EmailStatus => ({
    type: 'success',
    message,
    ...options,
  }),

  error: (message: string, details?: string): EmailStatus => ({
    type: 'error',
    message,
    details,
  }),

  sending: (claimCount?: number): EmailStatus => ({
    type: 'sending',
    message:
      claimCount && claimCount > 1
        ? `Preparing to send ${claimCount} email notifications...`
        : 'Preparing to send email notification...',
    claimCount,
  }),

  timeout: (
    message: string = 'Email sending took too long and timed out',
  ): EmailStatus => ({
    type: 'timeout',
    message,
    details:
      'This may be due to network issues or server load. Please try again.',
  }),

  authError: (
    message: string = 'Gmail sending permission required',
  ): EmailStatus => ({
    type: 'auth-error',
    message,
    details:
      'You need to grant Gmail sending permissions to send claim emails.',
  }),

  validationError: (message: string, details?: string): EmailStatus => ({
    type: 'validation-error',
    message,
    details,
  }),
};
