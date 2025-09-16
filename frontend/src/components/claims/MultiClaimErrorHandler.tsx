'use client';

import React from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Wifi,
  HardDrive,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Multi-Claim Error Handler Component
 *
 * Provides centralized error handling for multi-claim operations with:
 * - User-friendly error messages
 * - Recovery action buttons
 * - Workflow continuity maintenance
 * - Toast notifications for immediate feedback
 */

export interface ErrorContext {
  operation: string;
  claimIndex?: number;
  claimId?: string;
  fileName?: string;
  errorCode?: string;
}

export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  isPrimary?: boolean;
}

export interface MultiClaimError {
  type:
    | 'validation'
    | 'network'
    | 'upload'
    | 'quota'
    | 'session'
    | 'business'
    | 'system';
  title: string;
  message: string;
  context?: ErrorContext;
  recoveryActions?: RecoveryAction[];
  showAlert?: boolean;
  toastType?: 'error' | 'warning' | 'info';
}

// Error type definitions based on design document scenarios
export const MultiClaimErrorTypes = {
  DRAFT_CREATION_FAILURE: 'draft_creation_failure',
  FILE_UPLOAD_FAILURE: 'file_upload_failure',
  DRIVE_QUOTA_EXCEEDED: 'drive_quota_exceeded',
  NETWORK_INTERRUPTION: 'network_interruption',
  SESSION_CONFLICT: 'session_conflict',
  MONTHLY_LIMIT_EXCEEDED: 'monthly_limit_exceeded',
  INVALID_FILE_TYPE: 'invalid_file_type',
  FILE_TOO_LARGE: 'file_too_large',
  CONCURRENT_MODIFICATION: 'concurrent_modification',
  AUTHENTICATION_EXPIRED: 'authentication_expired',
  SERVER_ERROR: 'server_error',
} as const;

interface MultiClaimErrorHandlerProps {
  className?: string;
}

/**
 * Creates standardized error objects for different scenarios
 */
export class MultiClaimErrorFactory {
  static createDraftCreationError(
    claimIndex: number,
    validationErrors: string[],
    onRetry: () => Promise<void>,
  ): MultiClaimError {
    return {
      type: 'validation',
      title: `Claim ${claimIndex + 1} Creation Failed`,
      message: validationErrors.join('. '),
      context: { operation: 'create_draft', claimIndex },
      recoveryActions: [
        {
          label: 'Fix and Retry',
          action: onRetry,
          isPrimary: true,
        },
      ],
      showAlert: true,
      toastType: 'error',
    };
  }

  static createFileUploadError(
    claimIndex: number,
    fileName: string,
    errorMessage: string,
    onRetry: () => Promise<void>,
  ): MultiClaimError {
    return {
      type: 'upload',
      title: 'File Upload Failed',
      message: `Failed to upload "${fileName}" for Claim ${claimIndex + 1}: ${errorMessage}`,
      context: { operation: 'file_upload', claimIndex, fileName },
      recoveryActions: [
        {
          label: 'Retry Upload',
          action: onRetry,
          isPrimary: true,
        },
      ],
      showAlert: true,
      toastType: 'error',
    };
  }

  static createQuotaExceededError(
    onManageStorage: () => void,
  ): MultiClaimError {
    return {
      type: 'quota',
      title: 'Google Drive Storage Full',
      message:
        'Your Google Drive storage is full. Free up space to continue uploading files.',
      context: { operation: 'file_upload' },
      recoveryActions: [
        {
          label: 'Manage Storage',
          action: onManageStorage,
          isPrimary: true,
        },
      ],
      showAlert: true,
      toastType: 'warning',
    };
  }

  static createNetworkError(
    operation: string,
    onRetry: () => Promise<void>,
  ): MultiClaimError {
    return {
      type: 'network',
      title: 'Connection Lost',
      message: `Network error during ${operation}. Please check your connection and try again.`,
      context: { operation },
      recoveryActions: [
        {
          label: 'Retry',
          action: onRetry,
          isPrimary: true,
        },
      ],
      showAlert: true,
      toastType: 'error',
    };
  }

  static createSessionConflictError(
    onRefresh: () => Promise<void>,
  ): MultiClaimError {
    return {
      type: 'session',
      title: 'Data Updated in Another Session',
      message:
        'Claims were updated in another browser tab or session. Your data will be refreshed to show the latest changes.',
      context: { operation: 'session_sync' },
      recoveryActions: [
        {
          label: 'Refresh Data',
          action: onRefresh,
          isPrimary: true,
        },
      ],
      showAlert: true,
      toastType: 'info',
    };
  }

  static createMonthlyLimitError(
    category: string,
    currentAmount: number,
    limit: number,
    month: number,
    year: number,
  ): MultiClaimError {
    return {
      type: 'business',
      title: 'Monthly Limit Exceeded',
      message: `Total ${category.toUpperCase()} claims (SGD ${currentAmount.toFixed(2)}) exceed monthly limit (SGD ${limit}) for ${String(month).padStart(2, '0')}/${year}. Please adjust amounts.`,
      context: { operation: 'validation', errorCode: 'monthly_limit' },
      showAlert: true,
      toastType: 'warning',
    };
  }

  static createAuthExpiredError(onReauth: () => void): MultiClaimError {
    return {
      type: 'session',
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again to continue.',
      context: { operation: 'authentication' },
      recoveryActions: [
        {
          label: 'Sign In Again',
          action: onReauth,
          isPrimary: true,
        },
      ],
      showAlert: true,
      toastType: 'warning',
    };
  }

  static createServerError(
    operation: string,
    onRetry?: () => Promise<void>,
  ): MultiClaimError {
    const recoveryActions: RecoveryAction[] = [];
    if (onRetry) {
      recoveryActions.push({
        label: 'Try Again',
        action: onRetry,
        isPrimary: true,
      });
    }

    return {
      type: 'system',
      title: 'Server Error',
      message: `A server error occurred during ${operation}. Please try again or contact support if the problem persists.`,
      context: { operation },
      recoveryActions,
      showAlert: true,
      toastType: 'error',
    };
  }
}

/**
 * Error icon selector based on error type
 */
const getErrorIcon = (errorType: MultiClaimError['type']) => {
  switch (errorType) {
    case 'network':
      return <Wifi className="h-5 w-5" />;
    case 'quota':
      return <HardDrive className="h-5 w-5" />;
    case 'session':
      return <Clock className="h-5 w-5" />;
    case 'business':
    case 'validation':
      return <DollarSign className="h-5 w-5" />;
    default:
      return <AlertTriangle className="h-5 w-5" />;
  }
};

/**
 * Individual error alert component
 */
interface ErrorAlertProps {
  error: MultiClaimError;
  onDismiss?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  return (
    <Alert className="mb-4 border-destructive/50 bg-destructive/10">
      <div className="flex items-start">
        <div className="mr-3 text-destructive">{getErrorIcon(error.type)}</div>
        <div className="flex-1">
          <AlertTitle className="text-destructive">{error.title}</AlertTitle>
          <AlertDescription className="mt-2 text-sm text-muted-foreground">
            {error.message}
          </AlertDescription>
          {error.recoveryActions && error.recoveryActions.length > 0 && (
            <div className="mt-3 flex gap-2">
              {error.recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.isPrimary ? 'default' : 'outline'}
                  onClick={action.action}
                >
                  {action.label}
                </Button>
              ))}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

/**
 * Main error handler component
 */
const MultiClaimErrorHandler: React.FC<MultiClaimErrorHandlerProps> = ({
  className,
}) => {
  return (
    <div className={className}>
      {/* This component serves as a utility provider and doesn't render anything by default */}
    </div>
  );
};

/**
 * Hook for handling multi-claim errors with toast notifications
 */
export const useMultiClaimErrorHandler = () => {
  const showError = React.useCallback((error: MultiClaimError) => {
    // Show toast notification for immediate feedback
    if (error.toastType) {
      switch (error.toastType) {
        case 'error':
          toast.error(error.title, {
            description: error.message,
            duration: 8000,
          });
          break;
        case 'warning':
          toast.warning(error.title, {
            description: error.message,
            duration: 6000,
          });
          break;
        case 'info':
          toast.info(error.title, {
            description: error.message,
            duration: 5000,
          });
          break;
      }
    }
  }, []);

  const showSuccess = React.useCallback(
    (message: string, description?: string) => {
      toast.success(message, {
        description,
        duration: 4000,
      });
    },
    [],
  );

  const handleAsyncError = React.useCallback(
    async (
      operation: () => Promise<void>,
      errorFactory: (error: unknown) => MultiClaimError,
    ) => {
      try {
        await operation();
      } catch (error) {
        const multiClaimError = errorFactory(error);
        showError(multiClaimError);
        throw error; // Re-throw to allow caller to handle if needed
      }
    },
    [showError],
  );

  return {
    showError,
    showSuccess,
    handleAsyncError,
    ErrorAlert,
    MultiClaimErrorFactory,
  };
};

export default MultiClaimErrorHandler;
export { ErrorAlert };
