import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewEmailModal } from '../PreviewEmailModal';
import { IPreviewEmailResponse } from '@project/types';

// Mock the hook - this is our boundary
const mockRefetch = vi.fn();
const mockUseEmailPreview = vi.fn();
vi.mock('@/hooks/email/useEmailPreview', () => ({
  useEmailPreview: (claimId: string | null) => mockUseEmailPreview(claimId),
}));

// Minimal UI mocks - just enough to make components render
vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('lucide-react', () => ({
  ChevronDown: () => <span>▼</span>,
  ChevronRight: () => <span>▶</span>,
  RefreshCw: () => <span>↻</span>,
}));

const mockPreviewData: IPreviewEmailResponse = {
  subject: 'Claim Submission - Telco Expenses',
  htmlBody: '<p>Your claim has been processed.</p>',
  recipients: ['hr@mavericks-consulting.com'],
  cc: ['finance@mavericks-consulting.com'],
  bcc: ['accounting@mavericks-consulting.com'],
};

describe('PreviewEmailModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockClear();
  });

  describe('visibility', () => {
    it('should not render when claimId is null', () => {
      mockUseEmailPreview.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <PreviewEmailModal
          claimId={null}
          onClose={mockOnClose}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when claimId is provided', () => {
      mockUseEmailPreview.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Email Preview')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicators while fetching', () => {
      mockUseEmailPreview.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('should show error message on failure', () => {
      mockUseEmailPreview.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network timeout'),
        refetch: mockRefetch,
      });

      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    it('should retry when retry button is clicked', async () => {
      const user = userEvent.setup();
      mockUseEmailPreview.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed'),
        refetch: mockRefetch,
      });

      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      const retryButton = screen.getByLabelText('Retry loading email preview');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      mockUseEmailPreview.mockReturnValue({
        data: mockPreviewData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });
    });

    it('should display email subject', () => {
      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      expect(
        screen.getByText('Claim Submission - Telco Expenses'),
      ).toBeInTheDocument();
    });

    it('should display email body content', () => {
      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      expect(
        screen.getByText('Your claim has been processed.'),
      ).toBeInTheDocument();
    });

    it('should show recipient count in collapsed state', () => {
      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      // Recipients button shows count
      expect(
        screen.getByRole('button', { name: /Recipients/ }),
      ).toBeInTheDocument();

      // Email addresses not visible when collapsed
      expect(
        screen.queryByText('hr@mavericks-consulting.com'),
      ).not.toBeInTheDocument();
    });

    it('should expand recipients on click and show all addresses', async () => {
      const user = userEvent.setup();
      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      const recipientsButton = screen.getByRole('button', {
        name: /Recipients/,
      });
      await user.click(recipientsButton);

      expect(
        screen.getByText('hr@mavericks-consulting.com'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('finance@mavericks-consulting.com'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('accounting@mavericks-consulting.com'),
      ).toBeInTheDocument();
    });

    it('should collapse recipients on second click', async () => {
      const user = userEvent.setup();
      render(
        <PreviewEmailModal
          claimId="claim-123"
          onClose={mockOnClose}
        />,
      );

      const recipientsButton = screen.getByRole('button', {
        name: /Recipients/,
      });

      // Expand
      await user.click(recipientsButton);
      expect(
        screen.getByText('hr@mavericks-consulting.com'),
      ).toBeInTheDocument();

      // Collapse
      await user.click(recipientsButton);
      await waitFor(() => {
        expect(
          screen.queryByText('hr@mavericks-consulting.com'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('hook integration', () => {
    it('should pass claimId to hook', () => {
      mockUseEmailPreview.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <PreviewEmailModal
          claimId="claim-456"
          onClose={mockOnClose}
        />,
      );

      expect(mockUseEmailPreview).toHaveBeenCalledWith('claim-456');
    });
  });
});
