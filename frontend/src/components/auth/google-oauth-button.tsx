'use client';

import * as React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ErrorHandler } from '@/hooks/queries/helper/error-handler';
import type { VariantProps } from 'class-variance-authority';
import { getRuntimeConfig } from '@/types/runtime-config';

/**
 * Safe performance.now() wrapper
 */
const safePerformanceNow = (): number => {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
};

/**
 * Performance monitoring for mobile rendering optimization
 * Logs to console in development when rendering exceeds 200ms threshold
 */
const monitorRenderPerformance = (startTime: number, operation: string) => {
  if (process.env.NODE_ENV === 'development') {
    const duration = safePerformanceNow() - startTime;
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
  extends
    React.ComponentProps<'button'>,
    Pick<VariantProps<typeof buttonVariants>, 'size'> {
  className?: string;
  disabled?: boolean;
  /**
   * Additional accessible description for the button
   * Used with aria-describedby for extra context
   */
  accessibleDescription?: string;
  /**
   * ID for the live region that will announce status changes
   * If not provided, a unique ID will be generated
   */
  liveRegionId?: string;
  /**
   * Callback for OAuth errors
   */
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
    role="status"
    aria-label={A11Y_MESSAGES.LOADING_SPINNER_LABEL}
    aria-live="polite"
  />
));

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Accessibility constants for screen reader announcements
 */
const A11Y_MESSAGES = Object.freeze({
  BUTTON_DEFAULT_LABEL: 'Sign in with Google',
  BUTTON_LOADING_LABEL: 'Signing in with Google, please wait',
  BUTTON_DESCRIPTION:
    'Opens Google authentication in a new window or tab. Only @mavericks-consulting.com domain accounts are allowed.',
  STATUS_LOADING: 'Authenticating with Google...',
  STATUS_SUCCESS: 'Authentication successful. Redirecting to your account.',
  STATUS_ERROR: 'Authentication failed. Please try again.',
  STATUS_RATE_LIMITED: 'Too many login attempts. Please wait and try again.',
  LOADING_SPINNER_LABEL: 'Loading authentication',
} as const);

// Removed generateA11yId function - now using React.useId() for SSR-safe ID generation

const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = React.memo(
  ({
    className,
    size = 'default',
    disabled = false,
    children = 'Sign in with Google',
    accessibleDescription,
    liveRegionId,
    onOAuthError,
    ...props
  }) => {
    const renderStartTime = React.useRef(safePerformanceNow());
    const [statusMessage, setStatusMessage] = React.useState<string>('');

    // OAuth state management without React Query (OAuth requires redirect, not API call)
    const [isLoading, setIsLoading] = React.useState(false);

    // Generate stable IDs for accessibility elements using React.useId()
    const baseId = React.useId();
    const descriptionId = `oauth-description-${baseId}`;
    const statusId = liveRegionId || `oauth-status-${baseId}`;

    // Accessibility announcement function
    const announceStatus = React.useCallback((message: string) => {
      setStatusMessage(message);
      // Clear message after announcement to prevent repetition
      setTimeout(() => setStatusMessage(''), 1000);
    }, []);

    // OAuth click handler using API-based flow
    const handleClick = React.useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        const clickStartTime = safePerformanceNow();

        event.preventDefault();
        event.stopPropagation();

        if (disabled || isLoading) {
          return;
        }

        setIsLoading(true);
        announceStatus(A11Y_MESSAGES.STATUS_LOADING);

        try {
          const baseUrl = getRuntimeConfig().BACKEND_BASE_URL;
          // Direct navigation to backend OAuth endpoint - no CORS issues
          window.location.href = new URL('/auth/google', baseUrl).toString();
        } catch (error) {
          setIsLoading(false);

          const statusCode = ErrorHandler.extractStatusCodeFromError(error);
          let errorMessage = 'Sign in failed. Please try again.';

          if (statusCode === 429) {
            errorMessage =
              'Too many login attempts. Please wait 60 seconds and try again.';
          }

          toast.error(errorMessage);
          announceStatus(A11Y_MESSAGES.STATUS_ERROR);

          const errorObj =
            error instanceof Error ? error : new Error('OAuth failed');
          onOAuthError?.(errorObj);
        }

        monitorRenderPerformance(clickStartTime, 'click handler');
      },
      [disabled, isLoading, announceStatus, onOAuthError],
    );

    // Enhanced keyboard event handler for better accessibility
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        // Handle Enter and Space keys for activation
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!disabled && !isLoading) {
            const syntheticEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
            } as React.MouseEvent<HTMLButtonElement>;
            void handleClick(syntheticEvent);
          }
        }
        // Handle Escape key to cancel if loading
        else if (event.key === 'Escape' && isLoading) {
          event.preventDefault();
          announceStatus('Authentication cancelled');
        }
      },
      [disabled, isLoading, handleClick, announceStatus],
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

    // Memoized aria-label for performance with loading state
    const ariaLabel = React.useMemo(() => {
      if (isLoading) {
        return A11Y_MESSAGES.BUTTON_LOADING_LABEL;
      }
      return typeof children === 'string'
        ? children
        : A11Y_MESSAGES.BUTTON_DEFAULT_LABEL;
    }, [children, isLoading]);

    // Memoized aria-describedby for performance
    const ariaDescribedBy = React.useMemo(() => {
      const ids: string[] = [descriptionId];
      if (statusMessage) {
        ids.push(statusId);
      }
      return ids.join(' ');
    }, [descriptionId, statusId, statusMessage]);

    // Monitor render performance
    React.useEffect(() => {
      monitorRenderPerformance(renderStartTime.current, 'render');
    });

    return (
      <>
        {/* Hidden description for screen readers */}
        <div
          id={descriptionId}
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0',
          }}
        >
          {accessibleDescription || A11Y_MESSAGES.BUTTON_DESCRIPTION}
        </div>

        {/* Live region for status announcements */}
        <div
          id={statusId}
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0',
          }}
          aria-live="assertive"
          aria-atomic="true"
          role="status"
        >
          {statusMessage}
        </div>

        <Button
          variant="outline"
          size={size}
          className={buttonClassName}
          disabled={disabled || isLoading}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          // Enhanced accessibility attributes
          aria-busy={isLoading}
          role="button"
          tabIndex={disabled ? -1 : 0}
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
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for React.memo to optimize re-renders
    // Include new accessibility props
    return (
      prevProps.className === nextProps.className &&
      prevProps.size === nextProps.size &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.children === nextProps.children &&
      prevProps.accessibleDescription === nextProps.accessibleDescription &&
      prevProps.liveRegionId === nextProps.liveRegionId &&
      prevProps.onOAuthError === nextProps.onOAuthError
    );
  },
);

GoogleOAuthButton.displayName = 'GoogleOAuthButton';

export { GoogleOAuthButton };
export type { GoogleOAuthButtonProps };
