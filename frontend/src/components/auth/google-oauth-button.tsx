'use client';

import * as React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';
import { toast } from 'sonner';
import { ErrorHandler } from '@/hooks/queries/helper/error-handler';

/**
 * Performance monitoring for mobile rendering optimization
 * Logs to console in development when rendering exceeds 200ms threshold
 */
const monitorRenderPerformance = (startTime: number, operation: string) => {
  if (process.env.NODE_ENV === 'development') {
    const duration = performance.now() - startTime;
    if (duration > 200) {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ GoogleOAuthButton ${operation} took ${duration.toFixed(2)}ms (mobile target: <200ms)`,
        {
          duration,
          operation,
          timestamp: new Date().toISOString(),
          isMobile: /Mobi|Android/i.test(navigator.userAgent),
        },
      );
    }
  }
};

interface GoogleOAuthButtonProps
  extends React.ComponentProps<'button'>,
    Pick<VariantProps<typeof buttonVariants>, 'size'> {
  className?: string;
  disabled?: boolean;
  onOAuthError?: (error: Error) => void;
}

// Memoized GoogleIcon to prevent unnecessary re-renders
const GoogleIcon = React.memo(() => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="shrink-0"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
));

GoogleIcon.displayName = 'GoogleIcon';

// Memoized loading spinner to prevent unnecessary re-renders
const LoadingSpinner = React.memo(() => (
  <div
    className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
    style={{
      width: '18px',
      height: '18px',
    }}
    aria-hidden="true"
  />
));

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Error messages for OAuth rate limiting and other failures
 */
const OAUTH_ERROR_MESSAGES = Object.freeze({
  RATE_LIMITED:
    'Too many login attempts. Please wait 60 seconds and try again.',
  GENERIC_ERROR: 'Sign in failed. Please try again.',
} as const);

/**
 * Detects if an error is related to rate limiting based on status code
 */
const isRateLimitError = (error: unknown): boolean => {
  const statusCode = ErrorHandler.extractStatusCodeFromError(error);
  return statusCode === 429;
};

/**
 * Handles OAuth-related errors with appropriate user feedback
 */
const handleOAuthError = (
  error: unknown,
  onOAuthError?: (error: Error) => void,
) => {
  if (isRateLimitError(error)) {
    toast.error(OAUTH_ERROR_MESSAGES.RATE_LIMITED);
  } else {
    toast.error(OAUTH_ERROR_MESSAGES.GENERIC_ERROR);
  }

  // Call the optional error callback
  const errorObj = error instanceof Error ? error : new Error('OAuth failed');
  onOAuthError?.(errorObj);
};

const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = React.memo(
  ({
    className,
    size = 'default',
    disabled = false,
    onOAuthError,
    children = 'Sign in with Google',
    ...props
  }) => {
    const renderStartTime = React.useRef(performance.now());
    const [isLoading, setIsLoading] = React.useState(false);

    // Optimized click handler with mobile performance considerations
    const handleClick = React.useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        const clickStartTime = performance.now();

        // Prevent double-clicks and improve touch responsiveness
        event.preventDefault();
        event.stopPropagation();

        if (disabled || isLoading) {
          return;
        }

        try {
          setIsLoading(true);

          // Use AbortController for mobile network optimization
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

          // Check if the OAuth endpoint is available and not rate limited
          const response = await fetch('/api/auth/google', {
            method: 'GET',
            redirect: 'manual', // Don't follow redirects automatically
            credentials: 'include',
            signal: controller.signal,
            // Mobile optimization headers
            headers: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            },
          });

          clearTimeout(timeoutId);

          // If rate limited, handle the error
          if (response.status === 429) {
            throw new Error('Rate limited');
          }

          // If successful (302 redirect to Google), proceed with the redirect
          if (response.status === 302) {
            window.location.href = '/api/auth/google';
            return;
          }

          // Handle other error status codes
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          // Fallback: redirect anyway if we get here
          window.location.href = '/api/auth/google';
        } catch (error) {
          setIsLoading(false);
          handleOAuthError(error, onOAuthError);
        } finally {
          // Monitor click handler performance
          monitorRenderPerformance(clickStartTime, 'click handler');
        }
      },
      [disabled, isLoading, onOAuthError],
    );

    // Memoized class name computation for performance
    const buttonClassName = React.useMemo(
      () =>
        cn(
          'relative bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 dark:bg-white dark:text-gray-700 dark:border-gray-300 dark:hover:bg-gray-50',
          // Mobile-specific optimizations
          'touch-manipulation select-none tap-highlight-transparent',
          className,
        ),
      [className],
    );

    // Memoized aria-label for performance
    const ariaLabel = React.useMemo(
      () => (typeof children === 'string' ? children : 'Sign in with Google'),
      [children],
    );

    // Monitor render performance
    React.useEffect(() => {
      monitorRenderPerformance(renderStartTime.current, 'render');
    });

    return (
      <Button
        variant="outline"
        size={size}
        className={buttonClassName}
        disabled={disabled || isLoading}
        onClick={handleClick}
        aria-label={ariaLabel}
        // Mobile optimization props
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        {...props}
      >
        {isLoading ? <LoadingSpinner /> : <GoogleIcon />}
        <span className="font-medium">{children}</span>
      </Button>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for React.memo to optimize re-renders
    return (
      prevProps.className === nextProps.className &&
      prevProps.size === nextProps.size &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.children === nextProps.children &&
      prevProps.onOAuthError === nextProps.onOAuthError
    );
  },
);

GoogleOAuthButton.displayName = 'GoogleOAuthButton';

export { GoogleOAuthButton };
export type { GoogleOAuthButtonProps };
