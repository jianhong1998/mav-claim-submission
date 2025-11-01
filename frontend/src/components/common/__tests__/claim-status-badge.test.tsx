/**
 * ClaimStatusBadge Component Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClaimStatus } from '@project/types';
import ClaimStatusBadge from '../badges/claim-status-badge';
import * as claimUtils from '@/lib/claim-utils';

// Mock claim-utils to avoid real implementation
vi.mock('@/lib/claim-utils', () => ({
  getClaimStatusConfig: vi.fn((status: ClaimStatus) => {
    const configs = {
      [ClaimStatus.DRAFT]: {
        label: 'Draft',
        color: 'text-gray-500',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500',
        icon: () => <div data-testid="draft-icon" />,
      },
      [ClaimStatus.SENT]: {
        label: 'Submitted',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500',
        icon: () => <div data-testid="sent-icon" />,
      },
      [ClaimStatus.PAID]: {
        label: 'Paid',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500',
        icon: () => <div data-testid="paid-icon" />,
      },
      [ClaimStatus.FAILED]: {
        label: 'Failed',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500',
        icon: () => <div data-testid="failed-icon" />,
      },
    };
    return configs[status];
  }),
}));

describe('ClaimStatusBadge', () => {
  it('renders draft status correctly', () => {
    render(<ClaimStatusBadge status={ClaimStatus.DRAFT} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByLabelText('Status: Draft')).toBeInTheDocument();
  });

  it('renders sent status correctly', () => {
    render(<ClaimStatusBadge status={ClaimStatus.SENT} />);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByLabelText('Status: Submitted')).toBeInTheDocument();
  });

  it('renders paid status correctly', () => {
    render(<ClaimStatusBadge status={ClaimStatus.PAID} />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByLabelText('Status: Paid')).toBeInTheDocument();
  });

  it('renders failed status correctly', () => {
    render(<ClaimStatusBadge status={ClaimStatus.FAILED} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByLabelText('Status: Failed')).toBeInTheDocument();
  });

  it('shows icon by default', () => {
    render(<ClaimStatusBadge status={ClaimStatus.DRAFT} />);
    expect(screen.getByTestId('draft-icon')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(
      <ClaimStatusBadge
        status={ClaimStatus.DRAFT}
        showIcon={false}
      />,
    );
    expect(screen.queryByTestId('draft-icon')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ClaimStatusBadge
        status={ClaimStatus.DRAFT}
        className="custom-class"
      />,
    );
    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });

  it('calls getClaimStatusConfig with correct status', () => {
    const getClaimStatusConfigSpy = vi.spyOn(
      claimUtils,
      'getClaimStatusConfig',
    );
    render(<ClaimStatusBadge status={ClaimStatus.PAID} />);
    expect(getClaimStatusConfigSpy).toHaveBeenCalledWith(ClaimStatus.PAID);
  });
});
