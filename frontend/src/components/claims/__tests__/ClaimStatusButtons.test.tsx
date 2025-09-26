import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimStatusButtons } from '../ClaimStatusButtons';
import { ClaimStatus } from '@project/types';
import { apiClient } from '@/lib/api-client';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  CheckCircle: (props: React.ComponentProps<'span'>) => (
    <span
      data-testid="CheckCircle"
      {...props}
    />
  ),
  Mail: (props: React.ComponentProps<'span'>) => (
    <span
      data-testid="Mail"
      {...props}
    />
  ),
  Send: (props: React.ComponentProps<'span'>) => (
    <span
      data-testid="Send"
      {...props}
    />
  ),
}));

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    updateClaimStatus: vi.fn().mockResolvedValue({}),
    resendClaimEmail: vi.fn().mockResolvedValue({}),
  },
}));

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    ...props
  }: React.ComponentProps<'button'> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      data-testid="status-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

describe('ClaimStatusButtons', () => {
  const mockOnStatusChange = vi.fn();
  const defaultProps = {
    claimId: 'test-claim-123',
    currentStatus: ClaimStatus.SENT as ClaimStatus,
    onStatusChange: mockOnStatusChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Button Visibility Logic', () => {
    it('renders no buttons for DRAFT status', () => {
      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.DRAFT}
        />,
      );

      expect(screen.queryByTestId('status-button')).not.toBeInTheDocument();
    });

    it('renders only Mark as Paid button for SENT status', () => {
      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.SENT}
        />,
      );

      const buttons = screen.getAllByTestId('status-button');
      expect(buttons).toHaveLength(1);

      expect(screen.getByText('Mark as Paid')).toBeInTheDocument();
      expect(screen.queryByText('Resend Email')).not.toBeInTheDocument();
      expect(screen.getByTestId('CheckCircle')).toBeInTheDocument();
      expect(screen.queryByTestId('Mail')).not.toBeInTheDocument();
    });

    it('renders Mark as Paid and Resend Email buttons for FAILED status', () => {
      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.FAILED}
        />,
      );

      const buttons = screen.getAllByTestId('status-button');
      expect(buttons).toHaveLength(2);

      expect(screen.getByText('Mark as Paid')).toBeInTheDocument();
      expect(screen.getByText('Resend Email')).toBeInTheDocument();
      expect(screen.getByTestId('CheckCircle')).toBeInTheDocument();
      expect(screen.getByTestId('Mail')).toBeInTheDocument();
    });

    it('renders only Mark as Sent button for PAID status', () => {
      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.PAID}
        />,
      );

      const buttons = screen.getAllByTestId('status-button');
      expect(buttons).toHaveLength(1);

      expect(screen.getByText('Mark as Sent')).toBeInTheDocument();
      expect(screen.getByTestId('Send')).toBeInTheDocument();
    });
  });

  describe('Button Variants and Styling', () => {
    it('applies correct variants for SENT status button', () => {
      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.SENT}
        />,
      );

      const markAsPaidButton = screen
        .getByText('Mark as Paid')
        .closest('button');

      expect(markAsPaidButton).toHaveAttribute('data-variant', 'default');
      expect(markAsPaidButton).toHaveAttribute('data-size', 'sm');

      // Verify Resend Email button is not present for SENT status
      expect(screen.queryByText('Resend Email')).not.toBeInTheDocument();
    });

    it('applies correct variant for PAID status button', () => {
      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.PAID}
        />,
      );

      const markAsSentButton = screen
        .getByText('Mark as Sent')
        .closest('button');
      expect(markAsSentButton).toHaveAttribute('data-variant', 'secondary');
      expect(markAsSentButton).toHaveAttribute('data-size', 'sm');
    });
  });

  describe('Button Interactions', () => {
    it('calls onStatusChange when Mark as Paid button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.SENT}
        />,
      );

      const markAsPaidButton = screen.getByText('Mark as Paid');

      await user.click(markAsPaidButton);

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
      });

      expect(apiClient.updateClaimStatus).toHaveBeenCalledWith(
        'test-claim-123',
        ClaimStatus.PAID,
      );
    });

    it('calls onStatusChange when Resend Email button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.FAILED}
        />,
      );

      const resendButton = screen.getByText('Resend Email');

      await user.click(resendButton);

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
      });

      expect(apiClient.resendClaimEmail).toHaveBeenCalledWith('test-claim-123');
    });

    it('calls onStatusChange when Mark as Sent button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.PAID}
        />,
      );

      const markAsSentButton = screen.getByText('Mark as Sent');

      await user.click(markAsSentButton);

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
      });

      expect(apiClient.updateClaimStatus).toHaveBeenCalledWith(
        'test-claim-123',
        ClaimStatus.SENT,
      );
    });
  });

  describe('Component Props Integration', () => {
    it('passes correct claimId to button handlers', async () => {
      const user = userEvent.setup();
      const testClaimId = 'unique-claim-456';

      render(
        <ClaimStatusButtons
          {...defaultProps}
          claimId={testClaimId}
          currentStatus={ClaimStatus.SENT}
        />,
      );

      const markAsPaidButton = screen.getByText('Mark as Paid');

      await user.click(markAsPaidButton);

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
      });

      expect(apiClient.updateClaimStatus).toHaveBeenCalledWith(
        testClaimId,
        ClaimStatus.PAID,
      );
    });

    it('responds to status changes correctly', () => {
      const { rerender } = render(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.SENT}
        />,
      );

      expect(screen.getByText('Mark as Paid')).toBeInTheDocument();
      expect(screen.queryByText('Resend Email')).not.toBeInTheDocument();

      rerender(
        <ClaimStatusButtons
          {...defaultProps}
          currentStatus={ClaimStatus.PAID}
        />,
      );

      expect(screen.queryByText('Mark as Paid')).not.toBeInTheDocument();
      expect(screen.queryByText('Resend Email')).not.toBeInTheDocument();
      expect(screen.getByText('Mark as Sent')).toBeInTheDocument();
    });
  });
});
