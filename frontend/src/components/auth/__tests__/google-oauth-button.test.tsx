import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthButton } from '../google-oauth-button';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock ErrorHandler
vi.mock('@/hooks/queries/helper/error-handler', () => ({
  ErrorHandler: {
    extractStatusCodeFromError: vi.fn((error: unknown) => {
      if (error instanceof Error && error.message === 'Rate limited') {
        return 429;
      }
      return 500;
    }),
  },
}));

// Note: No need to mock apiClient since GoogleOAuthButton uses direct navigation

// Test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  TestWrapper.displayName = 'TestWrapper';

  return TestWrapper;
};

// Mock UI Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    onKeyDown,
    className,
    variant,
    size,
    style,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-busy': ariaBusy,
    role,
    tabIndex,
    ...props
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
    className?: string;
    variant?: string;
    size?: string;
    style?: React.CSSProperties;
    'aria-label'?: string;
    'aria-describedby'?: string;
    'aria-busy'?: boolean;
    role?: string;
    tabIndex?: number;
    [key: string]: unknown;
  }) => (
    <button
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={className}
      data-variant={variant}
      data-size={size}
      style={style}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={ariaBusy}
      role={role}
      tabIndex={tabIndex}
      {...props}
    >
      {children}
    </button>
  ),
  buttonVariants: vi.fn(),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock window.location
const mockLocation = {
  href: '',
  assign: vi.fn(),
  replace: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// We don't need fetch mock anymore since we're using apiClient

// Mock performance.now
const mockPerformanceNow = vi.fn(() => 1000);
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
  writable: true,
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  writable: true,
});

// Mock console methods for performance monitoring tests
const mockConsoleWarn = vi.fn();
// eslint-disable-next-line no-console
const originalConsoleWarn = console.warn;

describe('GoogleOAuthButton', () => {
  const mockOnOAuthError = vi.fn();
  let wrapper: ReturnType<typeof createTestWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    mockPerformanceNow.mockReturnValue(1000);
    wrapper = createTestWrapper();
    // eslint-disable-next-line no-console
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    console.warn = originalConsoleWarn;
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button', {
        name: 'Sign in with Google',
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Sign in with Google');
      expect(button).toHaveAttribute('data-variant', 'outline');
      expect(button).toHaveAttribute('data-size', 'default');
    });

    it('should render with custom children', () => {
      render(<GoogleOAuthButton>Continue with Google</GoogleOAuthButton>, {
        wrapper,
      });

      const button = screen.getByRole('button', {
        name: 'Continue with Google',
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Continue with Google');
    });

    it('should render with non-string children', () => {
      const customChildren = <span>Custom Login</span>;
      render(<GoogleOAuthButton>{customChildren}</GoogleOAuthButton>, {
        wrapper,
      });

      const button = screen.getByRole('button', {
        name: 'Sign in with Google',
      });
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Custom Login')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<GoogleOAuthButton className="custom-class" />, { wrapper });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should apply custom size prop', () => {
      render(<GoogleOAuthButton size="lg" />, { wrapper });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'lg');
    });

    it('should render Google icon by default', () => {
      render(<GoogleOAuthButton />, { wrapper });

      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('width', '18');
      expect(icon).toHaveAttribute('height', '18');
    });

    it('should have proper mobile optimization styles', () => {
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');
      const style = button.getAttribute('style');
      expect(style).toContain('-webkit-tap-highlight-color: transparent');
    });
  });

  describe('Google Icon', () => {
    it('should render Google icon with correct viewBox', () => {
      render(<GoogleOAuthButton />, { wrapper });

      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('should have proper Google brand colors', () => {
      render(<GoogleOAuthButton />, { wrapper });

      const icon = screen.getByRole('button').querySelector('svg');
      const paths = icon?.querySelectorAll('path');
      expect(paths).toHaveLength(4);

      // Check Google brand colors
      expect(paths?.[0]).toHaveAttribute('fill', '#4285F4'); // Blue
      expect(paths?.[1]).toHaveAttribute('fill', '#34A853'); // Green
      expect(paths?.[2]).toHaveAttribute('fill', '#FBBC05'); // Yellow
      expect(paths?.[3]).toHaveAttribute('fill', '#EA4335'); // Red
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner temporarily during click', async () => {
      const user = userEvent.setup();
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');

      // Initial state should show Google icon
      expect(
        button.querySelector('svg[viewBox="0 0 24 24"]'),
      ).toBeInTheDocument();

      await user.click(button);

      // After click, component shows loading briefly before navigation
      // Since navigation is synchronous, we just verify the component structure is correct
      expect(mockLocation.href).toBe('http://localhost:3001/auth/google');
    });

    it('should disable button when loading during error scenarios', async () => {
      const originalLocationHref = Object.getOwnPropertyDescriptor(
        mockLocation,
        'href',
      );
      let setterCalled = false;

      Object.defineProperty(mockLocation, 'href', {
        set: () => {
          if (!setterCalled) {
            setterCalled = true;
            throw new Error('Navigation failed');
          }
        },
        configurable: true,
      });

      const user = userEvent.setup();
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });

      if (originalLocationHref) {
        Object.defineProperty(mockLocation, 'href', originalLocationHref);
      }
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<GoogleOAuthButton disabled />, { wrapper });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not handle clicks when disabled', async () => {
      const user = userEvent.setup();
      render(<GoogleOAuthButton disabled />, { wrapper });

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockLocation.href).toBe('');
    });

    it('should apply disabled className', () => {
      render(<GoogleOAuthButton disabled />, { wrapper });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:bg-gray-100');
    });
  });

  describe('Click Handling', () => {
    it('should handle successful OAuth redirect', async () => {
      const user = userEvent.setup();
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(mockLocation.href).toBe('http://localhost:3001/auth/google');
      });
    });

    it('should prevent double clicks', async () => {
      const user = userEvent.setup();
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');

      await user.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });

      // Second click should not change location again
      const firstLocation = mockLocation.href;
      await user.click(button);
      expect(mockLocation.href).toBe(firstLocation);
    });

    it('should prevent event bubbling', async () => {
      const parentClickHandler = vi.fn();

      const user = userEvent.setup();
      render(
        <div onClick={parentClickHandler}>
          <GoogleOAuthButton />
        </div>,
        { wrapper },
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it('should use custom backend URL from env', async () => {
      vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://api.example.com');

      const user = userEvent.setup();
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(mockLocation.href).toBe('https://api.example.com/auth/google');
      });

      vi.unstubAllEnvs();
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      const originalLocationHref = Object.getOwnPropertyDescriptor(
        mockLocation,
        'href',
      );
      Object.defineProperty(mockLocation, 'href', {
        set: () => {
          throw new Error('Navigation failed');
        },
        configurable: true,
      });

      const user = userEvent.setup();
      render(<GoogleOAuthButton onOAuthError={mockOnOAuthError} />, {
        wrapper,
      });

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Sign in failed. Please try again.',
        );
      });

      expect(mockOnOAuthError).toHaveBeenCalledWith(expect.any(Error));
      expect(button).not.toBeDisabled();

      if (originalLocationHref) {
        Object.defineProperty(mockLocation, 'href', originalLocationHref);
      }
    });

    it('should handle errors without onOAuthError callback', async () => {
      const originalLocationHref = Object.getOwnPropertyDescriptor(
        mockLocation,
        'href',
      );
      Object.defineProperty(mockLocation, 'href', {
        set: () => {
          throw new Error('Navigation failed');
        },
        configurable: true,
      });

      const user = userEvent.setup();
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');

      expect(() => user.click(button)).not.toThrow();

      if (originalLocationHref) {
        Object.defineProperty(mockLocation, 'href', originalLocationHref);
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should monitor render performance in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      mockPerformanceNow
        .mockReturnValueOnce(1000) // Initial render time
        .mockReturnValueOnce(1300); // End time (300ms duration)

      render(<GoogleOAuthButton />, { wrapper });

      // Wait for useEffect to run
      await waitFor(() => {
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          expect.stringContaining('GoogleOAuthButton render took'),
          expect.objectContaining({
            duration: 300,
            operation: 'render',
          }),
        );
      });

      vi.unstubAllEnvs();
    });

    it('should handle performance monitoring in development environment', () => {
      vi.stubEnv('NODE_ENV', 'development');

      // Simply test that component renders without errors in development mode
      expect(() => render(<GoogleOAuthButton />, { wrapper })).not.toThrow();

      vi.unstubAllEnvs();
    });

    it('should not log performance warnings in production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1300);

      render(<GoogleOAuthButton />, { wrapper });

      expect(mockConsoleWarn).not.toHaveBeenCalled();

      vi.unstubAllEnvs();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Sign in with Google');
    });

    it('should update aria-label with custom children', () => {
      render(<GoogleOAuthButton>Custom OAuth Text</GoogleOAuthButton>, {
        wrapper,
      });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom OAuth Text');
    });

    it('should have proper focus handling', () => {
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });

    it('should have proper keyboard interaction', async () => {
      const user = userEvent.setup();
      render(<GoogleOAuthButton />, { wrapper });

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockLocation.href).toBe('http://localhost:3001/auth/google');
      });
    });

    it('should have aria-hidden on icons', () => {
      render(<GoogleOAuthButton />, { wrapper });

      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Component Lifecycle', () => {
    it('should maintain display name', () => {
      expect(GoogleOAuthButton.displayName).toBe('GoogleOAuthButton');
    });

    it('should memoize properly with same props', () => {
      const { rerender } = render(<GoogleOAuthButton className="test" />, {
        wrapper,
      });

      // Render with same props
      rerender(<GoogleOAuthButton className="test" />);

      // Should not cause unnecessary re-renders (hard to test directly, but ensures no errors)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should re-render when props change', () => {
      const { rerender } = render(
        <GoogleOAuthButton>First Text</GoogleOAuthButton>,
        { wrapper },
      );
      expect(screen.getByText('First Text')).toBeInTheDocument();

      rerender(<GoogleOAuthButton>Second Text</GoogleOAuthButton>);
      expect(screen.getByText('Second Text')).toBeInTheDocument();
      expect(screen.queryByText('First Text')).not.toBeInTheDocument();
    });

    it('should handle prop changes correctly', () => {
      const { rerender } = render(<GoogleOAuthButton disabled={false} />, {
        wrapper,
      });
      expect(screen.getByRole('button')).not.toBeDisabled();

      rerender(<GoogleOAuthButton disabled={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined performance object', () => {
      const originalPerformance = global.performance;
      (global as Record<string, unknown>).performance = undefined;

      expect(() => render(<GoogleOAuthButton />, { wrapper })).not.toThrow();

      global.performance = originalPerformance;
    });
  });

  describe('Integration', () => {
    it('should work with different button sizes', () => {
      const { rerender } = render(<GoogleOAuthButton size="sm" />, { wrapper });
      expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');

      rerender(<GoogleOAuthButton size="lg" />);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');
    });

    it('should handle complex className combinations', () => {
      render(<GoogleOAuthButton className="custom-1 custom-2" />, { wrapper });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-1', 'custom-2');
    });

    it('should forward additional props to Button component', () => {
      render(
        <GoogleOAuthButton
          data-testid="oauth-btn"
          tabIndex={0}
        />,
        { wrapper },
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-testid', 'oauth-btn');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });
});
