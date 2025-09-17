import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import MultiClaimErrorHandler, {
  ErrorAlert,
  useMultiClaimErrorHandler,
  MultiClaimErrorFactory,
  MultiClaimError,
} from '../MultiClaimErrorHandler';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="AlertTriangle" />,
  Wifi: () => <span data-testid="Wifi" />,
  HardDrive: () => <span data-testid="HardDrive" />,
  Clock: () => <span data-testid="Clock" />,
  DollarSign: () => <span data-testid="DollarSign" />,
}));

// Mock Alert components
vi.mock('@/components/ui/alert', () => ({
  Alert: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={className}
      data-testid="alert"
    >
      {children}
    </div>
  ),
  AlertTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={className}
      data-testid="alert-title"
    >
      {children}
    </div>
  ),
  AlertDescription: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={className}
      data-testid="alert-description"
    >
      {children}
    </div>
  ),
}));

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

const mockToast = {
  error: toast.error as ReturnType<typeof vi.fn>,
  warning: toast.warning as ReturnType<typeof vi.fn>,
  info: toast.info as ReturnType<typeof vi.fn>,
  success: toast.success as ReturnType<typeof vi.fn>,
};

describe('MultiClaimErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(<MultiClaimErrorHandler />);
      // Component doesn't render anything by default, so we just check it doesn't throw
    });

    it('should apply custom className', () => {
      const { container } = render(
        <MultiClaimErrorHandler className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('ErrorAlert', () => {
  describe('Basic Rendering', () => {
    it('should render error alert with title and message', () => {
      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Test Error',
        message: 'This is a test error message',
      };

      render(<ErrorAlert error={mockError} />);

      expect(screen.getByTestId('alert-title')).toHaveTextContent('Test Error');
      expect(screen.getByTestId('alert-description')).toHaveTextContent(
        'This is a test error message',
      );
    });

    it('should display correct icon based on error type', () => {
      const testCases = [
        { type: 'network' as const, icon: 'Wifi' },
        { type: 'quota' as const, icon: 'HardDrive' },
        { type: 'session' as const, icon: 'Clock' },
        { type: 'business' as const, icon: 'DollarSign' },
        { type: 'validation' as const, icon: 'DollarSign' },
        { type: 'system' as const, icon: 'AlertTriangle' },
      ];

      testCases.forEach(({ type, icon }) => {
        const mockError: MultiClaimError = {
          type,
          title: `${type} Error`,
          message: `${type} error message`,
        };

        const { unmount } = render(<ErrorAlert error={mockError} />);
        expect(screen.getByTestId(icon)).toBeInTheDocument();
        unmount();
      });
    });

    it('should render recovery actions when provided', () => {
      const mockAction = vi.fn();
      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Test Error',
        message: 'Test message',
        recoveryActions: [
          {
            label: 'Retry',
            action: mockAction,
            isPrimary: true,
          },
          {
            label: 'Cancel',
            action: vi.fn(),
            isPrimary: false,
          },
        ],
      };

      render(<ErrorAlert error={mockError} />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call recovery action when clicked', async () => {
      const mockAction = vi.fn();
      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Test Error',
        message: 'Test message',
        recoveryActions: [
          {
            label: 'Retry',
            action: mockAction,
            isPrimary: true,
          },
        ],
      };

      const user = userEvent.setup();
      render(<ErrorAlert error={mockError} />);

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should render dismiss button when onDismiss is provided', async () => {
      const mockDismiss = vi.fn();
      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Test Error',
        message: 'Test message',
        recoveryActions: [
          {
            label: 'Retry',
            action: vi.fn(),
            isPrimary: true,
          },
        ],
      };

      const user = userEvent.setup();
      render(
        <ErrorAlert
          error={mockError}
          onDismiss={mockDismiss}
        />,
      );

      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not render dismiss button when onDismiss is not provided', () => {
      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Test Error',
        message: 'Test message',
        recoveryActions: [
          {
            label: 'Retry',
            action: vi.fn(),
            isPrimary: true,
          },
        ],
      };

      render(<ErrorAlert error={mockError} />);

      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    });

    it('should apply correct button variants based on isPrimary', () => {
      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Test Error',
        message: 'Test message',
        recoveryActions: [
          {
            label: 'Primary Action',
            action: vi.fn(),
            isPrimary: true,
          },
          {
            label: 'Secondary Action',
            action: vi.fn(),
            isPrimary: false,
          },
        ],
      };

      render(<ErrorAlert error={mockError} />);

      const buttons = screen.getAllByTestId('button');
      const primaryButton = buttons.find(
        (btn) => btn.textContent === 'Primary Action',
      );
      const secondaryButton = buttons.find(
        (btn) => btn.textContent === 'Secondary Action',
      );

      expect(primaryButton).toHaveAttribute('data-variant', 'default');
      expect(secondaryButton).toHaveAttribute('data-variant', 'outline');
    });
  });
});

describe('MultiClaimErrorFactory', () => {
  describe('Draft Creation Error', () => {
    it('should create draft creation error correctly', () => {
      const mockRetry = vi.fn();
      const validationErrors = ['Amount is required', 'Category is invalid'];

      const error = MultiClaimErrorFactory.createDraftCreationError(
        0,
        validationErrors,
        mockRetry,
      );

      expect(error.type).toBe('validation');
      expect(error.title).toBe('Claim 1 Creation Failed');
      expect(error.message).toBe('Amount is required. Category is invalid');
      expect(error.context?.operation).toBe('create_draft');
      expect(error.context?.claimIndex).toBe(0);
      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0].label).toBe('Fix and Retry');
      expect(error.showAlert).toBe(true);
      expect(error.toastType).toBe('error');
    });
  });

  describe('File Upload Error', () => {
    it('should create file upload error correctly', () => {
      const mockRetry = vi.fn();

      const error = MultiClaimErrorFactory.createFileUploadError(
        1,
        'receipt.pdf',
        'Network timeout',
        mockRetry,
      );

      expect(error.type).toBe('upload');
      expect(error.title).toBe('File Upload Failed');
      expect(error.message).toBe(
        'Failed to upload "receipt.pdf" for Claim 2: Network timeout',
      );
      expect(error.context?.operation).toBe('file_upload');
      expect(error.context?.claimIndex).toBe(1);
      expect(error.context?.fileName).toBe('receipt.pdf');
      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0].label).toBe('Retry Upload');
    });
  });

  describe('Quota Exceeded Error', () => {
    it('should create quota exceeded error correctly', () => {
      const mockManageStorage = vi.fn();

      const error =
        MultiClaimErrorFactory.createQuotaExceededError(mockManageStorage);

      expect(error.type).toBe('quota');
      expect(error.title).toBe('Google Drive Storage Full');
      expect(error.message).toContain('Your Google Drive storage is full');
      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0].label).toBe('Manage Storage');
      expect(error.toastType).toBe('warning');
    });
  });

  describe('Network Error', () => {
    it('should create network error correctly', () => {
      const mockRetry = vi.fn();

      const error = MultiClaimErrorFactory.createNetworkError(
        'claim creation',
        mockRetry,
      );

      expect(error.type).toBe('network');
      expect(error.title).toBe('Connection Lost');
      expect(error.message).toContain('Network error during claim creation');
      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0].label).toBe('Retry');
      expect(error.toastType).toBe('error');
    });
  });

  describe('Session Conflict Error', () => {
    it('should create session conflict error correctly', () => {
      const mockRefresh = vi.fn();

      const error =
        MultiClaimErrorFactory.createSessionConflictError(mockRefresh);

      expect(error.type).toBe('session');
      expect(error.title).toBe('Data Updated in Another Session');
      expect(error.message).toContain(
        'Claims were updated in another browser tab',
      );
      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0].label).toBe('Refresh Data');
      expect(error.toastType).toBe('info');
    });
  });

  describe('Monthly Limit Error', () => {
    it('should create monthly limit error correctly', () => {
      const error = MultiClaimErrorFactory.createMonthlyLimitError(
        'telco',
        175.5,
        150,
        3,
        2024,
      );

      expect(error.type).toBe('business');
      expect(error.title).toBe('Monthly Limit Exceeded');
      expect(error.message).toContain(
        'Total TELCO claims (SGD 175.50) exceed monthly limit (SGD 150) for 03/2024',
      );
      expect(error.context?.errorCode).toBe('monthly_limit');
      expect(error.toastType).toBe('warning');
    });
  });

  describe('Auth Expired Error', () => {
    it('should create auth expired error correctly', () => {
      const mockReauth = vi.fn();

      const error = MultiClaimErrorFactory.createAuthExpiredError(mockReauth);

      expect(error.type).toBe('session');
      expect(error.title).toBe('Session Expired');
      expect(error.message).toContain('Your session has expired');
      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0].label).toBe('Sign In Again');
      expect(error.toastType).toBe('warning');
    });
  });

  describe('Server Error', () => {
    it('should create server error with retry action', () => {
      const mockRetry = vi.fn();

      const error = MultiClaimErrorFactory.createServerError(
        'data processing',
        mockRetry,
      );

      expect(error.type).toBe('system');
      expect(error.title).toBe('Server Error');
      expect(error.message).toContain(
        'A server error occurred during data processing',
      );
      expect(error.recoveryActions).toHaveLength(1);
      expect(error.recoveryActions?.[0].label).toBe('Try Again');
      expect(error.toastType).toBe('error');
    });

    it('should create server error without retry action', () => {
      const error = MultiClaimErrorFactory.createServerError('data processing');

      expect(error.type).toBe('system');
      expect(error.title).toBe('Server Error');
      expect(error.recoveryActions).toHaveLength(0);
    });
  });
});

describe('useMultiClaimErrorHandler', () => {
  describe('showError function', () => {
    it('should show error toast for error type', () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Validation Error',
        message: 'Invalid data provided',
        toastType: 'error',
      };

      act(() => {
        result.current.showError(mockError);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Validation Error', {
        description: 'Invalid data provided',
        duration: 8000,
      });
    });

    it('should show warning toast for warning type', () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      const mockError: MultiClaimError = {
        type: 'business',
        title: 'Business Rule Violation',
        message: 'Monthly limit exceeded',
        toastType: 'warning',
      };

      act(() => {
        result.current.showError(mockError);
      });

      expect(mockToast.warning).toHaveBeenCalledWith(
        'Business Rule Violation',
        {
          description: 'Monthly limit exceeded',
          duration: 6000,
        },
      );
    });

    it('should show info toast for info type', () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      const mockError: MultiClaimError = {
        type: 'session',
        title: 'Session Updated',
        message: 'Data refreshed from another session',
        toastType: 'info',
      };

      act(() => {
        result.current.showError(mockError);
      });

      expect(mockToast.info).toHaveBeenCalledWith('Session Updated', {
        description: 'Data refreshed from another session',
        duration: 5000,
      });
    });

    it('should not show toast when toastType is not specified', () => {
      // Clear any previous mock calls
      vi.clearAllMocks();

      const { result } = renderHook(() => useMultiClaimErrorHandler());

      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Validation Error',
        message: 'Invalid data provided',
        // Explicitly set toastType to undefined
        toastType: undefined,
      };

      act(() => {
        result.current.showError(mockError);
      });

      expect(mockToast.error).not.toHaveBeenCalled();
      expect(mockToast.warning).not.toHaveBeenCalled();
      expect(mockToast.info).not.toHaveBeenCalled();
    });
  });

  describe('showSuccess function', () => {
    it('should show success toast with message and description', () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      act(() => {
        result.current.showSuccess(
          'Operation Successful',
          'All claims have been processed',
        );
      });

      expect(mockToast.success).toHaveBeenCalledWith('Operation Successful', {
        description: 'All claims have been processed',
        duration: 4000,
      });
    });

    it('should show success toast with message only', () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      act(() => {
        result.current.showSuccess('Operation Successful');
      });

      expect(mockToast.success).toHaveBeenCalledWith('Operation Successful', {
        description: undefined,
        duration: 4000,
      });
    });
  });

  describe('handleAsyncError function', () => {
    it('should execute operation successfully without error handling', async () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const mockErrorFactory = vi.fn();

      await act(async () => {
        await result.current.handleAsyncError(mockOperation, mockErrorFactory);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockErrorFactory).not.toHaveBeenCalled();
    });

    it('should handle async operation error and show toast', async () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      const mockError = new Error('Async operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      const multiClaimError: MultiClaimError = {
        type: 'system',
        title: 'Operation Failed',
        message: 'Async operation encountered an error',
        toastType: 'error',
      };

      const mockErrorFactory = vi.fn().mockReturnValue(multiClaimError);

      await expect(
        act(async () => {
          await result.current.handleAsyncError(
            mockOperation,
            mockErrorFactory,
          );
        }),
      ).rejects.toThrow('Async operation failed');

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockErrorFactory).toHaveBeenCalledWith(mockError);
      expect(mockToast.error).toHaveBeenCalledWith('Operation Failed', {
        description: 'Async operation encountered an error',
        duration: 8000,
      });
    });

    it('should re-throw the original error after handling', async () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      const mockError = new Error('Original error');
      const mockOperation = vi.fn().mockRejectedValue(mockError);
      const mockErrorFactory = vi.fn().mockReturnValue({
        type: 'system' as const,
        title: 'Error',
        message: 'Error message',
        toastType: 'error' as const,
      });

      let caughtError: unknown;
      try {
        await act(async () => {
          await result.current.handleAsyncError(
            mockOperation,
            mockErrorFactory,
          );
        });
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBe(mockError);
    });
  });

  describe('return values', () => {
    it('should return all required functions and components', () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      expect(typeof result.current.showError).toBe('function');
      expect(typeof result.current.showSuccess).toBe('function');
      expect(typeof result.current.handleAsyncError).toBe('function');
      expect(result.current.ErrorAlert).toBeDefined();
      expect(result.current.MultiClaimErrorFactory).toBeDefined();
    });
  });

  describe('integration with ErrorAlert', () => {
    it('should provide ErrorAlert component that can render errors', () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      const mockError: MultiClaimError = {
        type: 'validation',
        title: 'Test Error',
        message: 'Test message',
      };

      render(<result.current.ErrorAlert error={mockError} />);

      expect(screen.getByTestId('alert-title')).toHaveTextContent('Test Error');
      expect(screen.getByTestId('alert-description')).toHaveTextContent(
        'Test message',
      );
    });
  });

  describe('integration with MultiClaimErrorFactory', () => {
    it('should provide access to error factory methods', () => {
      const { result } = renderHook(() => useMultiClaimErrorHandler());

      expect(
        typeof result.current.MultiClaimErrorFactory.createDraftCreationError,
      ).toBe('function');
      expect(
        typeof result.current.MultiClaimErrorFactory.createFileUploadError,
      ).toBe('function');
      expect(
        typeof result.current.MultiClaimErrorFactory.createNetworkError,
      ).toBe('function');
    });
  });
});

describe('Error Type Constants', () => {
  it('should have all required error type constants', () => {
    expect(MultiClaimErrorFactory).toBeDefined();

    // Test that factory methods exist (we don't need to import the constants separately)
    expect(typeof MultiClaimErrorFactory.createDraftCreationError).toBe(
      'function',
    );
    expect(typeof MultiClaimErrorFactory.createFileUploadError).toBe(
      'function',
    );
    expect(typeof MultiClaimErrorFactory.createQuotaExceededError).toBe(
      'function',
    );
    expect(typeof MultiClaimErrorFactory.createNetworkError).toBe('function');
    expect(typeof MultiClaimErrorFactory.createSessionConflictError).toBe(
      'function',
    );
    expect(typeof MultiClaimErrorFactory.createMonthlyLimitError).toBe(
      'function',
    );
    expect(typeof MultiClaimErrorFactory.createAuthExpiredError).toBe(
      'function',
    );
    expect(typeof MultiClaimErrorFactory.createServerError).toBe('function');
  });
});
