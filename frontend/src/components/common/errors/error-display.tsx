/**
 * ErrorDisplay Component
 * Reusable error display for consistent error messaging across the application
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorDisplayProps {
  /**
   * Error object or error message string
   */
  error: Error | string;

  /**
   * Display variant
   * @default 'alert'
   */
  variant?: 'inline' | 'toast' | 'alert';

  /**
   * Optional retry callback
   */
  onRetry?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const ErrorDisplay = React.memo<ErrorDisplayProps>(
  ({ error, variant = 'alert', onRetry, className }) => {
    const errorMessage = typeof error === 'string' ? error : error.message;

    // Alert variant (default)
    if (variant === 'alert') {
      return (
        <Alert
          variant="destructive"
          className={className}
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{errorMessage}</span>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="shrink-0"
              >
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    // Inline variant
    if (variant === 'inline') {
      return (
        <div
          className={cn(
            'flex items-center gap-2 text-sm text-destructive',
            className,
          )}
        >
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
          {onRetry && (
            <Button
              variant="link"
              size="sm"
              onClick={onRetry}
              className="h-auto p-0"
            >
              Retry
            </Button>
          )}
        </div>
      );
    }

    // Toast variant
    if (variant === 'toast') {
      return (
        <div
          className={cn(
            'flex items-center gap-3 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg',
            className,
          )}
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="text-sm opacity-90">{errorMessage}</p>
          </div>
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className="shrink-0"
            >
              Retry
            </Button>
          )}
        </div>
      );
    }

    return null;
  },
);

ErrorDisplay.displayName = 'ErrorDisplay';

export default ErrorDisplay;
